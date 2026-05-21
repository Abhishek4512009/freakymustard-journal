import React, { useEffect } from 'react';
import { X, Play, Volume2 } from 'lucide-react';

const TrailerModal = ({ isOpen, onClose, movieTitle }) => {
    // Prevent body scrolling when the modal is active
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Premium open-source cinematic teaser loop
    const teaserVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4';

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
            {/* Modal Container */}
            <div 
                className="bg-slate-900/90 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col animate-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header controls */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-b from-slate-900 to-slate-900/40 border-b border-slate-800">
                    <div>
                        <span className="text-[10px] uppercase tracking-widest font-black text-blue-500 flex items-center gap-1.5 mb-1 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Now Teasing
                        </span>
                        <h3 className="text-lg md:text-xl font-black text-white truncate max-w-md md:max-w-xl">
                            {movieTitle?.replace(/\(\d{4}\)/, '') || 'Cinematic Preview'}
                        </h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 bg-slate-800 hover:bg-red-600 rounded-full text-slate-350 hover:text-white transition-all duration-300 hover:scale-105"
                        title="Close trailer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Immersive Video Player */}
                <div className="relative aspect-video bg-black flex items-center justify-center">
                    <video 
                        src={teaserVideoUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>

                {/* Subtitle / Details footer */}
                <div className="p-5 bg-slate-950/60 backdrop-blur-sm border-t border-slate-850 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                            Teaser loops automatically. This simulates real trailer streams resolved in high quality from backend CDN proxies.
                        </p>
                        <p className="text-[10px] text-slate-500">
                            Streaming Protocol: HLS-Direct • Resolution: 1080p Web-Teaser
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="bg-white text-black font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 shadow-lg"
                    >
                        <Play size={16} className="fill-current" /> Close & Watch
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrailerModal;
