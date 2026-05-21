import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

const MovieCarousel = ({ title, movies = [], type = 'movies' }) => {
    const rowRef = useRef(null);
    const touchStartX = useRef(0);
    const touchStartScrollLeft = useRef(0);

    const handleScroll = (direction) => {
        if (rowRef.current) {
            const { scrollLeft, clientWidth } = rowRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth + 100 : scrollLeft + clientWidth - 100;
            rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        if (rowRef.current) {
            touchStartScrollLeft.current = rowRef.current.scrollLeft;
        }
    };

    const handleTouchMove = (e) => {
        if (!rowRef.current) return;
        const touchCurrentX = e.touches[0].clientX;
        const difference = touchStartX.current - touchCurrentX;
        // Natural 1:1 touch swipe scroll displacement
        rowRef.current.scrollLeft = touchStartScrollLeft.current + difference;
    };

    if (!movies || movies.length === 0) return null;

    return (
        <div className="relative px-4 md:px-8 py-4 group/carousel overflow-hidden">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 tracking-wide">
                {title}
            </h2>
            
            {/* Scroll Buttons */}
            <button 
                onClick={() => handleScroll('left')}
                className="absolute left-2 md:left-4 top-[50%] z-40 bg-black/60 p-2 rounded-full opacity-0 group-hover/carousel:opacity-100 hover:bg-white/20 transition-all backdrop-blur hover:scale-110 hidden md:block -translate-y-1/2 cursor-pointer"
            >
                <ChevronLeft size={28} className="text-white" />
            </button>
            <button 
                onClick={() => handleScroll('right')}
                className="absolute right-2 md:right-4 top-[50%] z-40 bg-black/60 p-2 rounded-full opacity-0 group-hover/carousel:opacity-100 hover:bg-white/20 transition-all backdrop-blur hover:scale-110 hidden md:block -translate-y-1/2 cursor-pointer"
            >
                <ChevronRight size={28} className="text-white" />
            </button>

            <div 
                ref={rowRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className="flex gap-4 overflow-x-auto hide-scrollbar pb-8 pt-4 -mt-4 scroll-smooth"
            >
                {movies.map((movie, idx) => {
                    const imgUrl = movie.poster || 'https://via.placeholder.com/300x450?text=No+Poster';
                    // Determine link format based on Tamil (has .link) vs English (has .id)
                    const watchLink = movie.link 
                        ? `/watch/tamil/${encodeURIComponent(movie.link)}?title=${encodeURIComponent(movie.title)}`
                        : `/watch/english/${type}/${movie.id}`;
                    
                    // Cleanup title
                    const cleanTitle = movie.title?.replace(/\(\d{4}\)/, '') || 'Unknown';
                    const yearBadge = (movie.title?.match(/\((\d{4})\)/) || [])[1] || movie.year || '';

                    return (
                        <Link
                            to={watchLink}
                            key={movie.id || idx}
                            className="relative min-w-[140px] md:min-w-[200px] w-[140px] md:w-[200px] aspect-[2/3] rounded-lg overflow-hidden group/card flex-shrink-0 transition-transform duration-300 hover:scale-110 hover:z-30 shadow-lg bg-slate-800 border border-slate-700/30 hover:border-blue-500/50 hover:shadow-blue-500/20"
                        >
                            {movie.poster ? (
                                <>
                                    <img 
                                        src={imgUrl} 
                                        alt={cleanTitle} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                                        loading="lazy"
                                    />
                                    
                                    {/* Gradient Overlay on Hover with Glowing Spotlight and Scale Effects */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 border border-transparent group-hover/card:border-blue-500/40 rounded-lg shadow-[inset_0_0_24px_rgba(59,130,246,0.25)]">
                                        <h3 className="text-white font-bold text-sm md:text-base truncate">{cleanTitle}</h3>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">{yearBadge || 'HD'}</span>
                                            <div className="bg-blue-600 p-1.5 rounded-full shadow-lg group-hover/card:scale-110 transition-transform duration-200">
                                                <Play size={16} className="text-white fill-current" />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-950 flex flex-col justify-between p-4 border border-slate-900/50 group-hover/card:border-blue-500/40 transition-all duration-300 rounded-lg shadow-[inset_0_0_24px_rgba(59,130,246,0.15)]">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase">Tamil</span>
                                        <span className="text-xs text-slate-500 font-extrabold">{yearBadge || 'HD'}</span>
                                    </div>
                                    <h3 className="text-sm md:text-base font-extrabold text-slate-100 text-center leading-snug drop-shadow-lg line-clamp-4 group-hover/card:text-blue-400 transition-colors">
                                        {cleanTitle}
                                    </h3>
                                    <div className="flex justify-center">
                                        <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm group-hover/card:bg-blue-600 transition-colors shadow-lg">
                                            <Play size={14} className="text-white fill-current" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default MovieCarousel;
