import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  PictureInPicture2,
  Loader2,
  SkipForward,
} from 'lucide-react';
import { formatTime, clamp } from '../lib/format';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const CONTROLS_HIDE_MS = 2800;

/**
 * Custom HTML5 video player.
 *
 * Props:
 *  - src: video URL
 *  - poster: poster image URL
 *  - title: used for aria labels
 *  - initialTime: seconds to resume from
 *  - onProgress(seconds, duration): throttled progress reporting
 *
 * All handler state flows through refs so keyboard/gesture listeners never
 * suffer stale closures (a bug class in the v1 player).
 */
export default function VideoPlayer({
  src,
  poster,
  title = 'video',
  initialTime = 0,
  onProgress,
  hls = false,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hideTimer = useRef(null);
  const clickTimer = useRef(null);
  const progressThrottle = useRef(0);
  const resumed = useRef(false);
  const hlsRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [ripple, setRipple] = useState(null); // 'left' | 'right' | 'play' | 'pause'
  const [playbackError, setPlaybackError] = useState(false);

  // Live mirrors for event listeners (no stale closures).
  // Written in an effect so render never reads/writes the ref.
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = { isPlaying, duration, isMuted, volume };
  }, [isPlaying, duration, isMuted, volume]);

  /* ---------------- HLS attach/detach ---------------- */
  // When `hls` is true we drive the <video> through hls.js instead of a raw
  // `src` attribute (our proxy URLs don't end in .m3u8, so native detection
  // can't be relied on). hls.js is imported dynamically so it's split into
  // its own chunk and only downloaded when HLS playback is actually used —
  // plain MP4 playback (e.g. Tamil movies) never pays for it.
  useEffect(() => {
    const video = videoRef.current;
    if (!hls || !video || !src) return undefined;

    let destroyed = false;
    let instance = null;
    let usedNative = false;

    const attach = (Hls) => {
      if (destroyed) return;

      if (Hls.isSupported()) {
        instance = new Hls({
          // The proxy relays every byte; keep buffering conservative for the
          // free-tier CPU it runs on.
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          enableWorker: true,
        });
        hlsRef.current = instance;
        instance.loadSource(src);
        instance.attachMedia(video);
        instance.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // Transient CDN hiccup — hls.js can recover in place.
            instance.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            instance.recoverMediaError();
          } else if (!destroyed) {
            setPlaybackError(true);
          }
        });
        return;
      }

      // Safari / native HLS: point the element at the playlist directly.
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        usedNative = true;
        video.src = src;
        return;
      }

      setPlaybackError(true);
    };

    import('hls.js').then((mod) => attach(mod.default || mod)).catch(() => {
      if (!destroyed) setPlaybackError(true);
    });

    return () => {
      destroyed = true;
      if (instance) {
        instance.destroy();
        hlsRef.current = null;
      } else if (usedNative && video) {
        // Native-HLS path cleanup (only if we actually set a src).
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [hls, src]);

  /* ---------------- controls visibility ---------------- */

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    if (stateRef.current.isPlaying) {
      hideTimer.current = setTimeout(() => {
        setControlsVisible(false);
        setSpeedMenuOpen(false);
      }, CONTROLS_HIDE_MS);
    }
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  /* ---------------- playback ---------------- */

  const flashRipple = useCallback((kind) => {
    setRipple(kind);
    setTimeout(() => setRipple(null), 650);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    showControls();
    if (v.paused) {
      v.play()
        .then(() => flashRipple('play'))
        .catch(() => {});
    } else {
      v.pause();
      flashRipple('pause');
    }
  }, [showControls, flashRipple]);

  const skip = useCallback(
    (delta) => {
      const v = videoRef.current;
      if (!v || !Number.isFinite(v.duration)) return;
      v.currentTime = clamp(v.currentTime + delta, 0, v.duration);
      showControls();
    },
    [showControls]
  );

  /* ---------------- volume ---------------- */

  const applyVolume = useCallback((val) => {
    const v = videoRef.current;
    const next = clamp(val, 0, 1);
    setVolume(next);
    setIsMuted(next === 0);
    if (v) {
      v.volume = next;
      v.muted = next === 0;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const next = !stateRef.current.isMuted;
    setIsMuted(next);
    v.muted = next;
    if (!next && stateRef.current.volume === 0) applyVolume(0.5);
  }, [applyVolume]);

  /* ---------------- fullscreen / PiP ---------------- */

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      /* unsupported */
    }
  }, []);

  /* ---------------- speed ---------------- */

  const changeSpeed = (s) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
    setSpeedMenuOpen(false);
  };

  /* ---------------- video element events ---------------- */

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    // Throttled progress reporting (~every 5s)
    const now = Date.now();
    if (onProgress && now - progressThrottle.current > 5000) {
      progressThrottle.current = now;
      onProgress(v.currentTime, v.duration || 0);
    }
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    // Resume once, after duration is known.
    if (!resumed.current && initialTime > 5 && initialTime < (v.duration || Infinity) - 10) {
      resumed.current = true;
      v.currentTime = initialTime;
    }
  };

  const onProgressEvent = () => {
    const v = videoRef.current;
    if (v && v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
  };

  /* ---------------- gestures ---------------- */

  // Single click = play/pause, double click left/right = seek ±10s.
  const onSurfaceClick = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const zone = rect ? (e.clientX - rect.left < rect.width / 2 ? 'left' : 'right') : null;

    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      if (zone === 'left') {
        skip(-10);
        flashRipple('left');
      } else if (zone === 'right') {
        skip(10);
        flashRipple('right');
      }
    } else {
      clickTimer.current = setTimeout(() => {
        togglePlay();
        clickTimer.current = null;
      }, 240);
    }
  };

  /* ---------------- keyboard ---------------- */

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          skip(-10);
          flashRipple('left');
          break;
        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          skip(10);
          flashRipple('right');
          break;
        case 'ArrowUp':
          e.preventDefault();
          applyVolume(stateRef.current.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          applyVolume(stateRef.current.volume - 0.1);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, toggleMute, toggleFullscreen, skip, applyVolume, flashRipple]);

  /* ---------------- seek bar ---------------- */

  const seekPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferPct = duration ? (buffered / duration) * 100 : 0;

  const chrome = controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none';

  return (
    <div
      ref={containerRef}
      onMouseMove={showControls}
      onTouchStart={showControls}
      className="relative w-full h-full bg-black group/player select-none overflow-hidden"
    >
      <video
        ref={videoRef}
        src={hls ? undefined : src}
        poster={poster}
        aria-label={title}
        className="w-full h-full object-contain"
        playsInline
        onClick={onSurfaceClick}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onDurationChange={onLoadedMetadata}
        onProgress={onProgressEvent}
        onPlay={() => {
          setIsPlaying(true);
          showControls();
        }}
        onPause={() => {
          setIsPlaying(false);
          setControlsVisible(true);
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => {
          setIsPlaying(false);
          setControlsVisible(true);
          onProgress?.(duration, duration);
        }}
        onError={() => setPlaybackError(true)}
      />

      {/* Buffering spinner */}
      {isBuffering && !playbackError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 size={44} className="text-white/80 animate-spin" />
        </div>
      )}

      {/* Playback error */}
      {playbackError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-center px-6">
          <p className="text-white font-bold">This stream failed to load.</p>
          <p className="text-xs text-slate-400 max-w-sm">
            The source file may have moved. Go back and try another title or check your connection.
          </p>
        </div>
      )}

      {/* Gesture ripples */}
      {ripple === 'left' && <Ripple side="left" label="-10s" icon={<RotateCcw size={26} />} />}
      {ripple === 'right' && <Ripple side="right" label="+10s" icon={<RotateCw size={26} />} />}
      {(ripple === 'play' || ripple === 'pause') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center animate-scale-in">
            {ripple === 'play' ? (
              <Play size={34} className="text-white fill-current ml-1" />
            ) : (
              <Pause size={34} className="text-white fill-current" />
            )}
          </div>
        </div>
      )}

      {/* Top gradient + title */}
      <div
        className={`absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${chrome}`}
      />

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300 ${chrome}`}
      >
        {/* Seek bar */}
        <div className="relative h-4 flex items-center group/seek cursor-pointer mb-2">
          <div className="relative w-full h-1 group-hover/seek:h-1.5 bg-white/20 rounded-full transition-all overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-white/25 rounded-full"
              style={{ width: `${bufferPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-400 to-accent-500 rounded-full"
              style={{ width: `${seekPct}%` }}
            />
          </div>
          <input
            type="range"
            aria-label="Seek"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const v = videoRef.current;
              if (!v) return;
              v.currentTime = parseFloat(e.target.value);
              setCurrentTime(v.currentTime);
            }}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="p-2 text-white hover:text-brand-300 transition-colors cursor-pointer"
          >
            {isPlaying ? (
              <Pause size={22} className="fill-current" />
            ) : (
              <Play size={22} className="fill-current" />
            )}
          </button>
          <button
            onClick={() => {
              skip(-10);
            }}
            aria-label="Back 10 seconds"
            className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => {
              skip(10);
            }}
            aria-label="Forward 10 seconds"
            className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCw size={18} />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1.5 group/vol">
            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              aria-label="Volume"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => applyVolume(parseFloat(e.target.value))}
              className="w-0 group-hover/vol:w-20 focus:w-20 opacity-0 group-hover/vol:opacity-100 focus:opacity-100 transition-all accent-brand-400 cursor-pointer"
            />
          </div>

          <span className="text-[11px] md:text-xs font-mono text-white/80 ml-1 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Speed menu */}
          <div className="relative">
            <button
              onClick={() => setSpeedMenuOpen((o) => !o)}
              aria-label="Playback speed"
              aria-expanded={speedMenuOpen}
              className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <Settings size={17} />
              <span className="text-[10px] font-bold">{speed}x</span>
            </button>
            {speedMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden animate-scale-in z-10">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={`block w-full px-5 py-2 text-xs font-bold text-left transition-colors cursor-pointer ${s === speed ? 'text-brand-300 bg-brand-500/15' : 'text-white hover:bg-white/10'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {document.pictureInPictureEnabled && (
            <button
              onClick={togglePiP}
              aria-label="Picture in picture"
              className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer hidden sm:block"
            >
              <PictureInPicture2 size={18} />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>

      {/* Skip intro (10s–90s window) */}
      {isPlaying && currentTime > 10 && currentTime < 90 && (
        <button
          onClick={() => {
            skip(90 - currentTime + 10);
          }}
          className="absolute bottom-20 right-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-xs font-black hover:bg-slate-200 transition-all shadow-card animate-fade-in-up cursor-pointer"
        >
          <SkipForward size={14} /> Skip Intro
        </button>
      )}
    </div>
  );
}

function Ripple({ side, label, icon }) {
  return (
    <div
      className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} w-1/3 flex items-center justify-center pointer-events-none`}
    >
      <div className="flex flex-col items-center gap-1 text-white bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-4 animate-scale-in">
        {icon}
        <span className="text-xs font-bold">{label}</span>
      </div>
    </div>
  );
}
