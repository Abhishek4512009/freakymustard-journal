import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getAutoStream } from '../api/tamilApi';
import { 
    ArrowLeft, AlertCircle, Film, Share2, Play, Pause, 
    RotateCcw, RotateCw, Volume2, Volume1, VolumeX, 
    Maximize, Minimize, Settings, Tv, Loader2 
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const WatchTamil = () => {
    const { encodedUrl } = useParams();
    const [searchParams] = useSearchParams();
    const title = searchParams.get('title') || 'Tamil Movie';
    const navigate = useNavigate();
    const { saveProgress, showToast } = useApp();

    const [streamUrl, setStreamUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('Initializing...');
    const [quality, setQuality] = useState('');
    const [metadata, setMetadata] = useState({});

    // Advanced Custom Video Player States
    const videoRef = useRef(null);
    const playerContainerRef = useRef(null);
    const clickTimeout = useRef(null);
    const controlsTimeoutRef = useRef(null);
    const hasFetched = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPiP, setIsPiP] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showSkipIntro, setShowSkipIntro] = useState(false);

    // Flashing Gestures Ripples
    const [rippleLeft, setRippleLeft] = useState(false);
    const [rippleRight, setRippleRight] = useState(false);
    const [ripplePlayPause, setRipplePlayPause] = useState({ visible: false, type: 'play' });

    useEffect(() => {
        const link = decodeURIComponent(encodedUrl);
        if (!link || hasFetched.current) return;
        hasFetched.current = true;

        const resolveStream = async () => {
            setLoading(true);
            setError(null);
            setStatus('Searching for best quality (1080p)...');

            try {
                const result = await getAutoStream(link);
                if (result && result.stream_url) {
                    setStreamUrl(result.stream_url);
                    setQuality(result.quality);
                    setMetadata({
                        poster: result.poster,
                        desc: result.desc
                    });
                    setStatus('Ready to play');

                    // Save Tamil movie progress dynamically to global App Context
                    saveProgress({
                        id: encodeURIComponent(link),
                        title: title.replace(/\(\d{4}\)/, '').trim(),
                        type: 'tamil',
                        poster: result.poster || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300&auto=format&fit=crop',
                        progress: 15,
                        watchLink: `/watch/tamil/${encodeURIComponent(link)}?title=${encodeURIComponent(title)}`
                    });
                } else {
                    throw new Error("Could not resolve a valid stream link.");
                }
            } catch (err) {
                console.error(err);
                setError(err.message || 'Failed to load video');
            } finally {
                setLoading(false);
            }
        };

        resolveStream();
    }, [encodedUrl]);

    // Handle Share URL Copy
    const handleShare = () => {
        const shareUrl = window.location.href;
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                showToast("Copied watch link to clipboard!", "success");
            })
            .catch(() => {
                showToast("Failed to copy link.", "error");
            });
    };

    // Auto-Hide Controls logic
    const resetControlsTimer = () => {
        setControlsVisible(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setControlsVisible(false);
                setShowSpeedMenu(false);
            }, 2500);
        }
    };

    const handleMouseMove = () => {
        resetControlsTimer();
    };

    useEffect(() => {
        resetControlsTimer();
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [isPlaying]);

    // Video Node events
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleDurationChange = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleProgress = () => {
        if (videoRef.current && videoRef.current.buffered.length > 0) {
            const lastBufferedIndex = videoRef.current.buffered.length - 1;
            setBuffered(videoRef.current.buffered.end(lastBufferedIndex));
        }
    };

    const handleWaiting = () => {
        setIsBuffering(true);
    };

    const handlePlaying = () => {
        setIsBuffering(false);
    };

    // Volume controllers
    const handleVolumeChange = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        setIsMuted(val === 0);
        if (videoRef.current) {
            videoRef.current.volume = val;
            videoRef.current.muted = val === 0;
        }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        const newMute = !isMuted;
        setIsMuted(newMute);
        videoRef.current.muted = newMute;
        if (!newMute && volume === 0) {
            setVolume(0.5);
            videoRef.current.volume = 0.5;
        }
    };

    // Playback rates
    const handleSpeedChange = (spd) => {
        setPlaybackSpeed(spd);
        if (videoRef.current) {
            videoRef.current.playbackRate = spd;
        }
        setShowSpeedMenu(false);
        showToast(`Speed set to ${spd}x`, "info");
    };

    // Fullscreen Toggles
    const toggleFullscreen = () => {
        if (!playerContainerRef.current) return;
        if (!document.fullscreenElement) {
            playerContainerRef.current.requestFullscreen()
                .then(() => setIsFullscreen(true))
                .catch(err => console.error("Fullscreen failed:", err));
        } else {
            document.exitFullscreen()
                .then(() => setIsFullscreen(false));
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Float Picture in Picture
    const togglePiP = async () => {
        if (!videoRef.current) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                setIsPiP(false);
            } else {
                await videoRef.current.requestPictureInPicture();
                setIsPiP(true);
            }
        } catch (err) {
            console.error("PiP failed:", err);
            showToast("Picture-in-Picture not supported or blocked.", "error");
        }
    };

    // Playback logic
    const triggerPlayPauseRipple = (type) => {
        setRipplePlayPause({ visible: true, type });
        setTimeout(() => {
            setRipplePlayPause(prev => ({ ...prev, visible: false }));
        }, 600);
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        resetControlsTimer();
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
            triggerPlayPauseRipple('pause');
        } else {
            videoRef.current.play()
                .then(() => {
                    setIsPlaying(true);
                    triggerPlayPauseRipple('play');
                })
                .catch(err => console.error("Playback failed:", err));
        }
    };

    const skipTime = (secs) => {
        if (!videoRef.current) return;
        resetControlsTimer();
        videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + secs));
    };

    // Interactive gesture handler (conflict-resolved click/double click)
    const handleGestureClick = (zone) => {
        resetControlsTimer();
        if (clickTimeout.current) {
            clearTimeout(clickTimeout.current);
            clickTimeout.current = null;
            
            // Double Click Seek triggers
            if (zone === 'left') {
                skipTime(-10);
                setRippleLeft(true);
                setTimeout(() => setRippleLeft(false), 800);
            } else if (zone === 'right') {
                skipTime(10);
                setRippleRight(true);
                setTimeout(() => setRippleRight(false), 800);
            }
        } else {
            clickTimeout.current = setTimeout(() => {
                togglePlay();
                clickTimeout.current = null;
            }, 250);
        }
    };

    // Interactive timeline seeks
    const handleSeekChange = (e) => {
        if (!videoRef.current) return;
        const newTime = parseFloat(e.target.value);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    // Cinematic "Skip Intro" between 10s and 90s
    useEffect(() => {
        if (currentTime >= 10 && currentTime <= 90) {
            setShowSkipIntro(true);
        } else {
            setShowSkipIntro(false);
        }
    }, [currentTime]);

    const handleSkipIntro = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 90;
            setCurrentTime(90);
            setShowSkipIntro(false);
            showToast("Intro skipped", "success");
        }
    };

    // Keyboard Hotkey Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

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
                    skipTime(-10);
                    setRippleLeft(true);
                    setTimeout(() => setRippleLeft(false), 800);
                    break;
                case 'ArrowRight':
                case 'KeyL':
                    e.preventDefault();
                    skipTime(10);
                    setRippleRight(true);
                    setTimeout(() => setRippleRight(false), 800);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setVolume(prev => {
                        const next = Math.min(1, prev + 0.1);
                        if (videoRef.current) videoRef.current.volume = next;
                        return next;
                    });
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setVolume(prev => {
                        const next = Math.max(0, prev - 0.1);
                        if (videoRef.current) videoRef.current.volume = next;
                        return next;
                    });
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, duration, isMuted, volume]);

    // Timers formatting
    const formatTime = (timeInSeconds) => {
        if (isNaN(timeInSeconds)) return "00:00";
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = Math.floor(timeInSeconds % 60);

        const pad = (num) => String(num).padStart(2, '0');

        if (hours > 0) {
            return `${hours}:${pad(minutes)}:${pad(seconds)}`;
        }
        return `${pad(minutes)}:${pad(seconds)}`;
    };

    const seekPercentage = duration ? (currentTime / duration) * 100 : 0;
    const bufferPercentage = duration ? (buffered / duration) * 100 : 0;

    return (
        <div className="bg-black min-h-screen text-white flex flex-col relative overflow-hidden">
            {/* Player Header - Fades out dynamically when controls hide */}
            <div className={`absolute top-0 inset-x-0 p-6 pt-10 flex items-center justify-between z-50 bg-gradient-to-b from-black/90 to-transparent transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-black/50 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md cursor-pointer">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="drop-shadow-md">
                        <h1 className="text-2xl font-bold">{title.replace(/\(\d{4}\)/, '')}</h1>
                        {quality && <span className="text-xs font-mono text-green-400">Quality: {quality}</span>}
                    </div>
                </div>
                
                <button 
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-white rounded-full transition-all duration-300 font-semibold text-sm cursor-pointer shadow-md backdrop-blur-md hover:scale-105"
                >
                    <Share2 size={16} />
                    <span className="hidden sm:inline">Share Link</span>
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-6 max-w-md w-full px-4 animate-in fade-in zoom-in duration-500">
                        <div className="relative w-20 h-20 mx-auto">
                            <div className="absolute inset-0 border-4 border-red-900/30 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin"></div>
                            <Film className="absolute inset-0 m-auto text-red-600 animate-pulse" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Loading Movie</h2>
                            <p className="text-red-500 font-medium animate-pulse">{status}</p>
                            <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
                                Resolving download servers and fetching highest quality link from MoviesDA...
                            </p>
                        </div>
                    </div>
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md p-8 bg-[#1a1a1a] rounded-xl border border-red-900/30 shadow-2xl">
                        <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="text-red-500" size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-red-500 mb-2">Playback Error</h2>
                        <p className="text-gray-400 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-medium transition cursor-pointer"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-black relative flex items-center justify-center pt-20 pb-24 px-4 md:px-8">
                    {/* Glowing outer card wrapper with mouse tracking bindings */}
                    <div 
                        ref={playerContainerRef}
                        onMouseMove={handleMouseMove}
                        className="relative group w-full max-w-6xl aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-[0_0_60px_rgba(59,130,246,0.22)] select-none"
                    >
                        {/* Native HTML5 Video Element */}
                        <video
                            ref={videoRef}
                            autoPlay
                            className="w-full h-full object-contain bg-black"
                            onTimeUpdate={handleTimeUpdate}
                            onDurationChange={handleDurationChange}
                            onProgress={handleProgress}
                            onWaiting={handleWaiting}
                            onPlaying={handlePlaying}
                            controls={false} // Disable basic browser styling
                        >
                            <source src={streamUrl} type="video/mp4" />
                            <source src={streamUrl} type="video/x-matroska" />
                            Your browser does not support the video tag.
                        </video>

                        {/* ========================================================================= */}
                        {/* GESTURES & INTERACTIVE OVERLAYS */}
                        {/* ========================================================================= */}
                        
                        {/* Conflict-resolved tap overlays */}
                        <div className="absolute inset-0 flex z-10">
                            <div onClick={() => handleGestureClick('left')} className="w-1/3 h-full cursor-pointer"></div>
                            <div onClick={() => handleGestureClick('center')} className="w-1/3 h-full cursor-pointer"></div>
                            <div onClick={() => handleGestureClick('right')} className="w-1/3 h-full cursor-pointer"></div>
                        </div>

                        {/* Visual Skip overlays */}
                        {rippleLeft && (
                            <div className="absolute left-10 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-30 bg-black/60 p-5 rounded-full border border-white/10 animate-pulse scale-90 md:scale-100">
                                <RotateCcw size={28} className="animate-spin text-white mb-1" />
                                <span className="text-[10px] font-bold font-mono">-10s</span>
                            </div>
                        )}
                        {rippleRight && (
                            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-30 bg-black/60 p-5 rounded-full border border-white/10 animate-pulse scale-90 md:scale-100">
                                <RotateCw size={28} className="animate-spin text-white mb-1" />
                                <span className="text-[10px] font-bold font-mono">+10s</span>
                            </div>
                        )}

                        {/* Center play pause overlay */}
                        {ripplePlayPause.visible && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-35 animate-ping duration-300">
                                <div className="bg-black/60 p-4 rounded-full border border-white/20">
                                    {ripplePlayPause.type === 'play' ? <Play size={40} className="fill-current text-white" /> : <Pause size={40} className="fill-current text-white" />}
                                </div>
                            </div>
                        )}

                        {/* buffering spinner overlay */}
                        {isBuffering && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 pointer-events-none z-30">
                                <Loader2 size={48} className="animate-spin text-blue-500" />
                                <span className="text-xs text-blue-400 font-bold mt-2 tracking-widest uppercase">Buffering Stream...</span>
                            </div>
                        )}

                        {/* Skip Intro visual overlay */}
                        {showSkipIntro && (
                            <button
                                onClick={handleSkipIntro}
                                className="absolute bottom-24 right-8 bg-blue-600/90 hover:bg-blue-600 border border-blue-500/40 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow-lg backdrop-blur z-40 cursor-pointer transition-all duration-300 animate-in slide-in-from-right-10"
                            >
                                Skip Intro
                            </button>
                        )}

                        {/* ========================================================================= */}
                        {/* PREMIUM CONTROL BAR OVERLAYS */}
                        {/* ========================================================================= */}
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/30 flex flex-col justify-end p-4 md:p-6 transition-opacity duration-300 z-20 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            
                            {/* Seek Bar Area */}
                            <div className="relative group/timeline w-full h-2 hover:h-3 flex items-center cursor-pointer transition-all duration-200 select-none pb-4 pt-2">
                                <input 
                                    type="range"
                                    min={0}
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={handleSeekChange}
                                    className="absolute inset-x-0 bottom-2 w-full h-1 md:h-1.5 opacity-0 cursor-pointer z-30"
                                />
                                {/* Background track */}
                                <div className="absolute inset-x-0 bottom-2 w-full h-1 md:h-1.5 bg-slate-800 rounded-full"></div>
                                {/* Buffer Track */}
                                <div 
                                    style={{ width: `${bufferPercentage}%` }}
                                    className="absolute left-0 bottom-2 h-1 md:h-1.5 bg-slate-650/40 rounded-full transition-all duration-100"
                                ></div>
                                {/* Progress Track */}
                                <div 
                                    style={{ width: `${seekPercentage}%` }}
                                    className="absolute left-0 bottom-2 h-1 md:h-1.5 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                ></div>
                                {/* Handler pin */}
                                <div 
                                    style={{ left: `calc(${seekPercentage}% - 6px)` }}
                                    className="absolute bottom-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full scale-0 group-hover/timeline:scale-100 transition-transform duration-150 shadow shadow-blue-900 border border-white"
                                ></div>
                            </div>

                            {/* Control button row */}
                            <div className="flex items-center justify-between mt-2 select-none">
                                {/* Left Controls */}
                                <div className="flex items-center gap-2 md:gap-4 z-30">
                                    {/* PlayPause Toggle */}
                                    <button onClick={togglePlay} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                                        {isPlaying ? <Pause size={22} className="fill-current text-white" /> : <Play size={22} className="fill-current text-white" />}
                                    </button>

                                    {/* Skips */}
                                    <button onClick={() => skipTime(-10)} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer hidden sm:block">
                                        <RotateCcw size={20} />
                                    </button>
                                    <button onClick={() => skipTime(10)} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer hidden sm:block">
                                        <RotateCw size={20} />
                                    </button>

                                    {/* Mute and sliding volume */}
                                    <div className="flex items-center gap-2 group/volume">
                                        <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                                            {isMuted || volume === 0 ? (
                                                <VolumeX size={20} />
                                            ) : volume < 0.4 ? (
                                                <Volume1 size={20} />
                                            ) : (
                                                <Volume2 size={20} />
                                            )}
                                        </button>
                                        <input 
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            value={isMuted ? 0 : volume}
                                            onChange={handleVolumeChange}
                                            className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 accent-blue-500 rounded-full cursor-pointer bg-slate-700 opacity-0 group-hover/volume:opacity-100"
                                        />
                                    </div>

                                    {/* Telemetry duration */}
                                    <span className="text-xs md:text-sm text-slate-300 font-mono">
                                        {formatTime(currentTime)} <span className="text-slate-500">/</span> {formatTime(duration)}
                                    </span>
                                </div>

                                {/* Right Controls */}
                                <div className="flex items-center gap-2 md:gap-4 z-30">
                                    {/* Speed Menu */}
                                    <div className="relative">
                                        <button 
                                            onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
                                            className={`p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-xs md:text-sm font-bold flex items-center gap-1 ${playbackSpeed !== 1 ? 'text-blue-400' : 'text-white'}`}
                                        >
                                            <Settings size={20} className={`${showSpeedMenu ? 'rotate-45' : ''} transition-transform duration-300`} />
                                            <span className="hidden sm:inline">{playbackSpeed}x</span>
                                        </button>
                                        {showSpeedMenu && (
                                            <div className="absolute bottom-12 right-0 bg-slate-950/95 border border-slate-800 rounded-lg p-1.5 flex flex-col min-w-[120px] backdrop-blur-md shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase px-3 py-1 border-b border-slate-900 mb-1">Speed</span>
                                                {speeds.map(spd => (
                                                    <button
                                                        key={spd}
                                                        onClick={() => handleSpeedChange(spd)}
                                                        className={`w-full text-left px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer hover:bg-blue-600 hover:text-white ${playbackSpeed === spd ? 'text-blue-500 bg-blue-500/10' : 'text-slate-350'}`}
                                                    >
                                                        {spd === 1 ? 'Normal (1x)' : `${spd}x`}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Picture In Picture */}
                                    <button onClick={togglePiP} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                                        <Tv size={20} />
                                    </button>

                                    {/* Fullscreen */}
                                    <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Metadata Overlay Bottom */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-8 pointer-events-none">
                        <div className="max-w-4xl mx-auto md:ml-[120px]">
                            {metadata.desc && (
                                <p className="text-gray-200 text-sm md:text-base max-w-2xl leading-relaxed whitespace-pre-wrap drop-shadow">
                                    {metadata.desc}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WatchTamil;
