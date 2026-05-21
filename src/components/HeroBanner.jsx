import React, { useState } from 'react';
import { Play, Plus, Check, Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import TrailerModal from './TrailerModal';

const HeroBanner = ({ movie, type = "movies" }) => {
    const { addToWatchlist, removeFromWatchlist, isInWatchlist, saveProgress } = useApp();
    const [isTrailerOpen, setIsTrailerOpen] = useState(false);

    if (!movie) {
        return (
            <div className="relative h-[50vh] md:h-[80vh] w-full bg-slate-900 animate-pulse flex items-center justify-center">
                <span className="text-slate-500">Loading Banner...</span>
            </div>
        );
    }

    const movieId = movie.id || movie.link;
    const isAdded = isInWatchlist(movieId);

    const backdrop = movie.backdrop || movie.poster || 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2670&auto=format&fit=crop';
    
    // Fallback watch link resolver
    const watchLink = movie.link 
        ? `/watch/tamil/${encodeURIComponent(movie.link)}?title=${encodeURIComponent(movie.title)}`
        : `/watch/english/${type}/${movie.id}`;

    const handleWatchlistToggle = () => {
        if (isAdded) {
            removeFromWatchlist(movieId);
        } else {
            addToWatchlist({
                id: movieId,
                title: movie.title,
                type: movie.link ? 'movies' : type,
                poster: movie.poster || movie.backdrop,
                year: movie.year,
                rating: movie.rating,
                link: movie.link
            });
        }
    };

    const handlePlayClick = () => {
        // Save initial progress of 10% when starting from Hero to trigger Continue Watching shelf
        saveProgress({
            id: movieId,
            title: movie.title,
            type: movie.link ? 'movies' : type,
            poster: movie.poster || movie.backdrop,
            progress: 10,
            watchLink: watchLink
        });
    };

    return (
        <>
            <div className="relative h-[65vh] md:h-[85vh] w-full overflow-hidden">
                {/* Background Image */}
                <div className="absolute inset-0 bg-black">
                    <img 
                        src={backdrop} 
                        alt={movie.title} 
                        className="w-full h-full object-cover opacity-60 mix-blend-screen scale-105 animate-in fade-in zoom-in duration-1000"
                    />
                </div>

                {/* Gradient Masks (JioHotstar style) */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent w-full md:w-[80%]"></div>

                {/* Content Container */}
                <div className="absolute bottom-[12%] md:bottom-[20%] left-4 md:left-8 right-4 max-w-2xl space-y-4 md:space-y-6 z-10">
                    <h1 className="text-3xl md:text-6xl font-black text-white drop-shadow-2xl tracking-tight line-clamp-2 leading-tight">
                        {movie.title?.replace(/\(\d{4}\)/, '')}
                    </h1>
                    
                    {/* Meta details */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-base text-gray-300 font-medium">
                        {movie.year && <span>{movie.year}</span>}
                        {movie.rating && <span>⭐ {movie.rating}</span>}
                        {movie.runtime && <span>{movie.runtime}</span>}
                        {movie.genres && movie.genres.length > 0 && (
                            <span className="hidden sm:inline">• {movie.genres.slice(0, 3).join(', ')}</span>
                        )}
                    </div>

                    <p className="text-sm md:text-lg text-gray-350 drop-shadow-md max-w-xl line-clamp-2 md:line-clamp-3 leading-relaxed">
                        {movie.description || "Experience the latest blockbuster in high quality."}
                    </p>

                    {/* Action Triggers */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 md:pt-4">
                        <Link
                            to={watchLink}
                            onClick={handlePlayClick}
                            className="flex items-center gap-2 bg-white text-black px-5 py-2.5 md:px-7 md:py-3.5 rounded-xl hover:bg-slate-200 transition-all duration-300 font-bold text-sm md:text-base shadow-lg hover:scale-105"
                        >
                            <Play size={18} className="fill-current" /> Watch Now
                        </Link>
                        
                        <button
                            onClick={() => setIsTrailerOpen(true)}
                            className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md border border-slate-800 text-white px-5 py-2.5 md:px-7 md:py-3.5 rounded-xl hover:bg-slate-800 transition-all duration-300 font-bold text-sm md:text-base hover:scale-105"
                        >
                            <Film size={18} /> Trailer
                        </button>

                        <button 
                            onClick={handleWatchlistToggle}
                            className={`flex items-center justify-center w-10 h-10 md:w-13 md:h-13 bg-slate-900/60 backdrop-blur-md border rounded-xl hover:bg-slate-800 transition-all duration-300 hover:scale-105 ${isAdded ? 'border-blue-500/50 text-blue-400' : 'border-slate-800 text-white'}`}
                            title={isAdded ? 'Remove from Watchlist' : 'Add to Watchlist'}
                        >
                            {isAdded ? <Check size={20} /> : <Plus size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Trailer Modal */}
            <TrailerModal 
                isOpen={isTrailerOpen}
                onClose={() => setIsTrailerOpen(false)}
                movieTitle={movie.title}
            />
        </>
    );
};

export default HeroBanner;
