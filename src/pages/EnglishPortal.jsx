import React, { useEffect, useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import MovieCarousel from '../components/MovieCarousel';
import { getPopular, searchContent } from '../api/englishApi';
import { Search } from 'lucide-react';

const EnglishPortal = ({ type = 'movies' }) => {
    const [popular, setPopular] = useState([]);
    const [top, setTop] = useState([]); // In a full app, we'd fetch top rated too
    const [searchResults, setSearchResults] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    const titleType = type === 'movies' ? 'Movies' : 'Series';

    useEffect(() => {
        const fetchPortalData = async () => {
            setLoading(true);
            setSearchResults([]);
            setQuery('');
            try {
                // Fetch Popular
                const popData = await getPopular(type, 0);
                if (popData && popData.results) {
                    setPopular(popData.results);
                }
                
                // Fetch Top (Re-using popular endpoint for demo, ideally we'd have a getTop function)
                const topData = await getPopular(type, 20); // skipping 20 for variety
                if (topData && topData.results) {
                    setTop(topData.results);
                }
            } catch (err) {
                console.error("Failed to fetch english data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPortalData();
    }, [type]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const res = await searchContent(type, query);
            if (res && res.results) {
                setSearchResults(res.results);
            }
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setSearching(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-400">
                <div className="relative w-20 h-20 mb-4 animate-in zoom-in duration-500">
                    <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 m-auto w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-500/20">S</div>
                </div>
                <p className="text-sm font-bold tracking-widest text-slate-500 uppercase animate-pulse">Loading {titleType}...</p>
            </div>
        );
    }


    return (
        <div className="pb-20">
            {/* Conditional Hero: Hide when searching */}
            {searchResults.length === 0 && <HeroBanner movie={popular[0]} type={type} />}
            
            <div className={`${searchResults.length === 0 ? '-mt-16' : 'pt-24'} relative z-20 space-y-12`}>
                
                {/* Search Bar */}
                <div className="px-[10%] md:px-[120px]">
                    <form onSubmit={handleSearch} className="relative max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder={`Search English ${titleType}...`}
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                if(e.target.value === '') setSearchResults([]);
                            }}
                            className="w-full bg-slate-800/80 backdrop-blur border border-slate-700 text-white rounded-full py-3 pl-12 pr-4 focus:outline-none focus:border-slate-500 transition-colors"
                        />
                    </form>
                </div>

                {/* Content Rows */}
                {searching ? (
                    <div className="pl-[10%] md:pl-[120px] text-slate-400">Searching...</div>
                ) : searchResults.length > 0 ? (
                    <MovieCarousel title={`Search Results for "${query}"`} movies={searchResults} type={type} />
                ) : (
                    <>
                        <MovieCarousel title={`Popular ${titleType}`} movies={popular.slice(1)} type={type} />
                        <MovieCarousel title={`Top Rated ${titleType}`} movies={top} type={type} />
                    </>
                )}
            </div>
        </div>
    );
};

export default EnglishPortal;
