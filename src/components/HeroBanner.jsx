import React from 'react';
import { Play, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroBanner = ({ movie, type = "movies" }) => {
    if (!movie) {
        return (
            <div className="relative h-[80vh] w-full bg-slate-900 animate-pulse flex items-center justify-center">
                <span className="text-slate-500">Loading Banner...</span>
            </div>
        );
    }

    const backdrop = movie.backdrop || movie.poster || 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2670&auto=format&fit=crop';
    
    // Fallback for link structure. English api returns 'id', Tamil API returns 'link'.
    const watchLink = movie.link 
        ? `/watch/tamil/${encodeURIComponent(movie.link)}?title=${encodeURIComponent(movie.title)}`
        : `/watch/english/${type}/${movie.id}`;

    return (
        <div className="relative h-[85vh] w-full overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 bg-black">
                <img 
                    src={backdrop} 
                    alt={movie.title} 
                    className="w-full h-full object-cover opacity-60 mix-blend-screen scale-105 animate-in fade-in zoom-in duration-1000"
                />
            </div>

            {/* Gradient Masks (JioHotstar style) */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent w-[80%]"></div>

            {/* Content Container */}
            <div className="absolute bottom-[20%] left-4 md:left-8 max-w-2xl space-y-6 z-10">
                <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-2xl tracking-tight line-clamp-2">
                    {movie.title?.replace(/\(\d{4}\)/, '')}
                </h1>
                
                {/* Meta details */}
                <div className="flex items-center gap-4 text-sm md:text-base text-gray-300 font-medium">
                    {movie.year && <span>{movie.year}</span>}
                    {movie.rating && <span>⭐ {movie.rating}</span>}
                    {movie.runtime && <span>{movie.runtime}</span>}
                    {movie.genres && movie.genres.length > 0 && (
                        <span>• {movie.genres.slice(0, 3).join(', ')}</span>
                    )}
                </div>

                <p className="text-lg text-gray-300 drop-shadow-md max-w-xl line-clamp-3 leading-relaxed">
                    {movie.description || "Experience the latest blockbuster in high quality."}
                </p>

                <div className="flex items-center gap-4 pt-4">
                    <Link
                        to={watchLink}
                        className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-3.5 rounded-lg hover:bg-white hover:text-black transition-all duration-300 font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105"
                    >
                        <Play size={24} className="fill-current" /> Watch Now
                    </Link>
                    <button className="flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all duration-300 hover:scale-105">
                        <Plus size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HeroBanner;
