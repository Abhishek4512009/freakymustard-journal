import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

const MovieCarousel = ({ title, movies = [], type = 'movies' }) => {
    const rowRef = useRef(null);

    const handleScroll = (direction) => {
        if (rowRef.current) {
            const { scrollLeft, clientWidth } = rowRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth + 100 : scrollLeft + clientWidth - 100;
            rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
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
                className="absolute left-2 md:left-4 top-[50%] z-40 bg-black/60 p-2 rounded-full opacity-0 group-hover/carousel:opacity-100 hover:bg-white/20 transition-all backdrop-blur hover:scale-110 hidden md:block -translate-y-1/2"
            >
                <ChevronLeft size={28} className="text-white" />
            </button>
            <button 
                onClick={() => handleScroll('right')}
                className="absolute right-2 md:right-4 top-[50%] z-40 bg-black/60 p-2 rounded-full opacity-0 group-hover/carousel:opacity-100 hover:bg-white/20 transition-all backdrop-blur hover:scale-110 hidden md:block -translate-y-1/2"
            >
                <ChevronRight size={28} className="text-white" />
            </button>

            <div 
                ref={rowRef}
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
                            className="relative min-w-[140px] md:min-w-[200px] w-[140px] md:w-[200px] aspect-[2/3] rounded-lg overflow-hidden group/card flex-shrink-0 transition-transform duration-300 hover:scale-110 hover:z-30 shadow-lg bg-slate-800"
                        >
                            <img 
                                src={imgUrl} 
                                alt={cleanTitle} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                                loading="lazy"
                            />
                            
                            {/* Gradient Overlay on Hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 border border-transparent group-hover/card:border-white/20 rounded-lg">
                                <h3 className="text-white font-bold text-sm md:text-base truncate">{cleanTitle}</h3>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs font-medium text-gray-300">{yearBadge}</span>
                                    <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                                        <Play size={16} className="text-white fill-current" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Static Year Badge for Tamil movies without poster usually */}
                            {!movie.poster && (
                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-xs font-bold text-gray-200 px-2 py-1 rounded z-10">
                                    {yearBadge || 'HD'}
                                </div>
                            )}
                            {!movie.poster && (
                                <div className="absolute inset-0 flex items-center justify-center p-4">
                                    <span className="text-lg font-bold text-white text-center drop-shadow-md line-clamp-4">
                                        {cleanTitle}
                                    </span>
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
