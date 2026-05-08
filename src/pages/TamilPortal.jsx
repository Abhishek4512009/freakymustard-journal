import React, { useEffect, useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import MovieCarousel from '../components/MovieCarousel';
import { getYears, getMovies, searchMovies } from '../api/tamilApi';
import { Search } from 'lucide-react';

const TamilPortal = () => {
    const [years, setYears] = useState([]);
    const [yearCarousels, setYearCarousels] = useState({});
    const [searchResults, setSearchResults] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [heroMovie, setHeroMovie] = useState(null);

    useEffect(() => {
        const fetchPortalData = async () => {
            setLoading(true);
            try {
                const yearsData = await getYears();
                if (yearsData && yearsData.length > 0) {
                    setYears(yearsData);
                    
                    // Fetch first 3 years to populate some initial rows
                    const rowsToFetch = yearsData.slice(0, 3);
                    const carouselsData = {};
                    
                    for (const year of rowsToFetch) {
                        try {
                            const movies = await getMovies(year.link, 1);
                            carouselsData[year.name] = movies;
                            
                            // Set Hero to the first movie of the latest year
                            if (!heroMovie && movies && movies.length > 0) {
                                setHeroMovie(movies[0]);
                            }
                        } catch(e) {
                            console.error(`Failed to fetch movies for ${year.name}`);
                        }
                    }
                    setYearCarousels(carouselsData);
                }
            } catch (err) {
                console.error("Failed to fetch tamil data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPortalData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const res = await searchMovies(query);
            if (res) {
                // Filter out navigation/collection links based on title
                const filtered = res.filter(m => !m.title.startsWith('Tamil') && !m.title.includes('Movies'));
                setSearchResults(filtered);
            }
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setSearching(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen text-slate-400">
                <div className="animate-spin w-10 h-10 border-4 border-slate-600 border-t-white rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="pb-20">
            {/* Conditional Hero: Hide when searching */}
            {searchResults.length === 0 && <HeroBanner movie={heroMovie} type="movies" />}
            
            <div className={`${searchResults.length === 0 ? '-mt-16' : 'pt-24'} relative z-20 space-y-12`}>
                
                {/* Search Bar */}
                <div className="px-[10%] md:px-[120px]">
                    <form onSubmit={handleSearch} className="relative max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search Tamil Movies..."
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
                    <MovieCarousel title={`Search Results for "${query}"`} movies={searchResults} type="movies" />
                ) : (
                    <>
                        {Object.entries(yearCarousels).map(([yearName, movies]) => (
                            <MovieCarousel key={yearName} title={yearName.replace('Moviesda ', '')} movies={movies} type="movies" />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default TamilPortal;
