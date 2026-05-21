import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Play, TrendingUp, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { searchContent } from '../api/englishApi';
import { searchMovies } from '../api/tamilApi';

const Search = () => {
    const [query, setQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All'); // 'All' | 'movies' | 'series' | 'tamil'
    
    // Search Results State
    const [engMovies, setEngMovies] = useState([]);
    const [engSeries, setEngSeries] = useState([]);
    const [tamilMovies, setTamilMovies] = useState([]);
    
    // Status State
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Simulated Popular Searches for better initial UX
    const popularSearches = [
        { title: 'Avengers: Endgame', type: 'movies', id: 'popular-avengers', poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=300&auto=format&fit=crop', watchLink: '/watch/english/movies/avengers' },
        { title: 'The Last of Us', type: 'series', id: 'popular-lastofus', poster: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=300&auto=format&fit=crop', watchLink: '/watch/english/series/lastofus' },
        { title: 'Kanguva', type: 'tamil', id: 'popular-kanguva', poster: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?q=80&w=300&auto=format&fit=crop', watchLink: `/watch/tamil/${encodeURIComponent('https://moviesda.url/kanguva')}?title=Kanguva` },
        { title: 'Interstellar', type: 'movies', id: 'popular-interstellar', poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format&fit=crop', watchLink: '/watch/english/movies/interstellar' }
    ];

    const filters = [
        { label: 'All Results', value: 'All' },
        { label: 'English Movies', value: 'movies' },
        { label: 'English TV Series', value: 'series' },
        { label: 'Tamil Movies', value: 'tamil' }
    ];

    const handleSearch = async (e, forcedQuery) => {
        if (e) e.preventDefault();
        
        const cleanQuery = (forcedQuery || query).trim();
        if (!cleanQuery) {
            clearSearch();
            return;
        }

        setLoading(true);
        setSearched(true);

        try {
            // Run all searches in parallel for extreme speed!
            const [moviesRes, seriesRes, tamilRes] = await Promise.allSettled([
                searchContent('movies', cleanQuery),
                searchContent('series', cleanQuery),
                searchMovies(cleanQuery)
            ]);

            // Parse English Movies
            if (moviesRes.status === 'fulfilled' && moviesRes.value?.results) {
                setEngMovies(moviesRes.value.results);
            } else {
                setEngMovies([]);
            }

            // Parse English Series
            if (seriesRes.status === 'fulfilled' && seriesRes.value?.results) {
                setEngSeries(seriesRes.value.results);
            } else {
                setEngSeries([]);
            }

            // Parse Tamil Movies (filter out navigation directories)
            if (tamilRes.status === 'fulfilled' && tamilRes.value) {
                const filtered = tamilRes.value.filter(
                    m => !m.title.startsWith('Tamil') && !m.title.includes('Movies')
                );
                setTamilMovies(filtered);
            } else {
                setTamilMovies([]);
            }
        } catch (err) {
            console.error("Unified search failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenreClick = (genre) => {
        setQuery(genre);
        handleSearch(null, genre);
    };

    // Auto-search on clear
    const clearSearch = () => {
        setQuery('');
        setEngMovies([]);
        setEngSeries([]);
        setTamilMovies([]);
        setSearched(false);
        setLoading(false);
    };

    // Helper to filter results dynamically
    const hasResults = engMovies.length > 0 || engSeries.length > 0 || tamilMovies.length > 0;

    const renderResultSection = (title, items, typeKey) => {
        if (items.length === 0) return null;

        return (
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-white tracking-wide border-l-4 border-blue-500 pl-3">
                    {title} <span className="text-xs text-slate-500 font-semibold ml-2">({items.length})</span>
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                    {items.map((movie, idx) => {
                        const imgUrl = movie.poster || 'https://via.placeholder.com/300x450?text=No+Poster';
                        
                        // Link format resolver
                        const watchLink = movie.link 
                            ? `/watch/tamil/${encodeURIComponent(movie.link)}?title=${encodeURIComponent(movie.title)}`
                            : `/watch/english/${typeKey}/${movie.id}`;
                        
                        const cleanTitle = movie.title?.replace(/\(\d{4}\)/, '') || 'Unknown';
                        const yearBadge = (movie.title?.match(/\((\d{4})\)/) || [])[1] || movie.year || '';

                        return (
                            <Link
                                key={movie.id || idx}
                                to={watchLink}
                                className="relative aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 group/card shadow-lg hover:border-slate-700 hover:scale-105 transition-all duration-300"
                            >
                                <img 
                                    src={imgUrl} 
                                    alt={cleanTitle} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                                    loading="lazy"
                                />
                                
                                {/* Hover Info overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 rounded-xl">
                                    <h4 className="font-bold text-white text-sm truncate">{cleanTitle}</h4>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-xs text-slate-400">{yearBadge || 'HD'}</span>
                                        <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                                            <Play size={12} className="text-white fill-current" />
                                        </div>
                                    </div>
                                </div>

                                {/* Fallback label when no poster exists */}
                                {!movie.poster && (
                                    <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-br from-slate-800 to-slate-950">
                                        <span className="bg-blue-600/30 border border-blue-500/30 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit uppercase">{typeKey}</span>
                                        <span className="text-sm font-bold text-white leading-snug drop-shadow line-clamp-3 text-center">{cleanTitle}</span>
                                        <span className="text-xs text-slate-500 font-bold">{yearBadge || 'HD'}</span>
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-950 pb-20 pt-24 px-4 md:px-[120px] space-y-10 animate-in fade-in duration-500">
            {/* Search Input Box */}
            <div className="flex flex-col items-center text-center space-y-4">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Find Your Next Watch</h1>
                <p className="text-slate-400 text-sm md:text-base max-w-lg">Discover English blockbusters, web series, or search Tamil direct stream archives simultaneously.</p>
                
                <form onSubmit={(e) => handleSearch(e)} className="relative w-full max-w-2xl mt-4">
                    <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search movies, TV shows, and Tamil archives..."
                        className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-850 text-white rounded-full py-4.5 pl-14 pr-12 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 shadow-2xl transition-all duration-300 text-lg placeholder-slate-500"
                    />
                    {query && (
                        <button 
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </form>
            </div>

            {/* Filter Categories */}
            {searched && hasResults && (
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-900 pb-5">
                    {filters.map(filter => (
                        <button
                            key={filter.value}
                            onClick={() => setActiveFilter(filter.value)}
                            className={`px-5 py-2 rounded-full text-sm font-bold border transition-all duration-300 ${activeFilter === filter.value ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30' : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Results Output */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                    <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="font-semibold text-sm">Searching parallel catalogs...</p>
                </div>
            ) : searched ? (
                !hasResults ? (
                    <div className="bg-slate-900/10 border border-slate-900 rounded-2xl p-16 text-center text-slate-500 max-w-xl mx-auto space-y-4">
                        <div className="w-16 h-16 bg-slate-900/40 rounded-full flex items-center justify-center mx-auto text-slate-600">
                            <SearchIcon size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">No Results Found</h3>
                            <p className="text-sm text-slate-600 mt-1">We couldn't find matching titles for "{query}" in our English or Tamil portals.</p>
                        </div>
                        <button 
                            onClick={clearSearch}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-850 px-6 py-2 rounded-lg text-sm font-bold text-white transition-colors cursor-pointer"
                        >
                            Clear and Try Again
                        </button>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Render based on active filters */}
                        {(activeFilter === 'All' || activeFilter === 'movies') && renderResultSection('English Movies', engMovies, 'movies')}
                        {(activeFilter === 'All' || activeFilter === 'series') && renderResultSection('English TV Series', engSeries, 'series')}
                        {(activeFilter === 'All' || activeFilter === 'tamil') && renderResultSection('Tamil Movies', tamilMovies, 'movies')}
                    </div>
                )
            ) : (
                /* Initial Popular Searches & Genres Showcase */
                <div className="space-y-10 max-w-4xl mx-auto pt-6">
                    {/* Genre Quick Filters */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-extrabold text-white">Explore Genres</h2>
                        <div className="flex flex-wrap gap-2.5">
                            {['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller', 'Romance', 'Horror', 'Fantasy'].map(genre => (
                                <button
                                    key={genre}
                                    onClick={() => handleGenreClick(genre)}
                                    className="px-5 py-2.5 bg-slate-900/40 border border-slate-900 rounded-full text-slate-300 hover:text-white hover:border-blue-500/50 hover:bg-slate-900 transition-all duration-300 font-bold text-sm cursor-pointer shadow-sm active:scale-95"
                                >
                                    {genre}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-500" />
                            Popular Searches
                        </h2>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {popularSearches.map((item) => (
                                <Link 
                                    key={item.id} 
                                    to={item.watchLink}
                                    className="flex items-center gap-4 p-3 bg-slate-900/30 hover:bg-slate-900/80 rounded-xl border border-slate-900 hover:border-slate-800 transition-all duration-300 group"
                                >
                                    <div className="w-16 h-20 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                                        <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">{item.title}</h4>
                                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{item.type}</span>
                                    </div>
                                    <div className="bg-slate-800/80 p-2.5 rounded-full group-hover:bg-blue-600 transition-colors">
                                        <Play size={14} className="fill-current text-white group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Search;
