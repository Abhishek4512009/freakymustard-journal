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
  Loader2,
  Download,
} from 'lucide-react';
import { formatTime, clamp } from '../lib/format';
import { triggerDownload } from '../lib/download';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const CONTROLS_HIDE_MS = 2800;

/**
 * Journal screening-room player.
 * Same HTML5 + hls.js mechanics as before; the chrome is now a flat
 * black projection booth — squared buttons, one accent, no gradients.
 */
export default function VideoPlayer({
  src,
  poster,
  title = 'video',
  initialTime = 0,
  onProgress,
  hls = false,
  downloadUrl,
  onDownload,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hideTimer = useRef(null);
  const progressThrottle = useRef(0);
  const resumed = useRef(false);

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
  const [playbackError, setPlaybackError] = useState(false);

  // Live mirrors for event listeners (no stale closures).
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = { isPlaying, duration, isMuted, volume };
  }, [isPlaying, duration, isMuted, volume]);

  /* ---------------- HLS attach/detach ---------------- */
  // When `hls` is true we drive the <video> through hls.js (our proxy URLs
  // don't end in .m3u8, so native detection can't be relied on). hls.js is
  // imported dynamically so plain MP4 playback never pays for it.
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
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          enableWorker: true,
        });
        instance.loadSource(src);
        instance.attachMedia(video);
        instance.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            instance.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            instance.recoverMediaError();
          } else if (!destroyed) {
            setPlaybackError(true);
          }
        });
        return;
      }

      // Safari / native HLS.
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        usedNative = true;
        video.src = src;
        return;
      }

      setPlaybackError(true);
    };

    import('hls.js')
      .then((mod) => attach(mod.default || mod))
      .catch(() => {
        if (!destroyed) setPlaybackError(true);
      });

    return () => {
      destroyed = true;
      if (instance) {
        instance.destroy();
      } else if (usedNative && video) {
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

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    showControls();
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [showControls]);

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

  /* ---------------- fullscreen ---------------- */

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

  /* ---------------- download ---------------- */

  const handleDownloadClick = useCallback(() => {
    if (!downloadUrl) return;
    showControls();
    triggerDownload(downloadUrl, { onStarted: onDownload });
  }, [downloadUrl, onDownload, showControls]);

  /* ---------------- video element events ---------------- */

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
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
    if (!resumed.current && initialTime > 5 && initialTime < (v.duration || Infinity) - 10) {
      resumed.current = true;
      v.currentTime = initialTime;
    }
  };

  const onProgressEvent = () => {
    const v = videoRef.current;
    if (v && v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
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
          break;
        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          skip(10);
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
  }, [togglePlay, toggleMute, toggleFullscreen, skip, applyVolume]);

  /* ---------------- seek bar ---------------- */

  const seekPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={showControls}
      onTouchStart={showControls}
      className={`fm-player${controlsVisible ? '' : ' fm-player--hide'}`}
    >
      <video
        ref={videoRef}
        src={hls ? undefined : src}
        poster={poster}
        aria-label={title}
        playsInline
        onClick={togglePlay}
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

      {isBuffering && !playbackError && (
        <div
          className="fm-center-note"
          style={{ background: 'transparent', pointerEvents: 'none' }}
        >
          <Loader2 size={34} className="animate-spin" aria-label="Buffering" />
        </div>
      )}

      {playbackError && (
        <div className="fm-center-note">
          <p>
            <strong>This reel failed to load.</strong>
          </p>
          <p>The source file may have moved. Go back and try another print.</p>
        </div>
      )}

      <div className="fm-player-top">{title}</div>

      <div className="fm-player-controls">
        <div className="fm-seek">
          <div className="fm-seek-track" aria-hidden="true">
            <div className="fm-seek-buffered" style={{ width: `${bufferPct}%` }} />
            <div className="fm-seek-played" style={{ width: `${seekPct}%` }} />
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
          />
        </div>

        <div className="fm-controls-row">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="fm-cbtn"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            type="button"
            onClick={() => skip(-10)}
            aria-label="Back 10 seconds"
            className="fm-cbtn"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={() => skip(10)}
            aria-label="Forward 10 seconds"
            className="fm-cbtn"
          >
            <RotateCw size={16} />
          </button>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="fm-cbtn"
          >
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <span className="fm-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <span className="fm-spacer" />
          <span style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setSpeedMenuOpen((o) => !o)}
              aria-label="Playback speed"
              aria-expanded={speedMenuOpen}
              className="fm-cbtn"
            >
              {speed}x
            </button>
            {speedMenuOpen && (
              <span className="fm-speeds">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSpeed(s);
                      if (videoRef.current) videoRef.current.playbackRate = s;
                      setSpeedMenuOpen(false);
                    }}
                    aria-pressed={s === speed}
                  >
                    {s}x
                  </button>
                ))}
              </span>
            )}
          </span>
          {downloadUrl && (
            <button
              type="button"
              onClick={handleDownloadClick}
              aria-label="Download video"
              title="Download"
              className="fm-cbtn"
            >
              <Download size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="fm-cbtn"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
