import React, { useEffect, useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import MovieCarousel from '../components/MovieCarousel';
import { getPopular } from '../api/englishApi';
import { getYears, getMovies } from '../api/tamilApi';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const Home = () => {
    const [englishTrending, setEnglishTrending] = useState([]);
    const [tamilTrending, setTamilTrending] = useState([]);
    const [heroContent, setHeroContent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                // Fetch English
                const engData = await getPopular('movies', 0);
                if (engData && engData.results) {
                    setEnglishTrending(engData.results.slice(0, 10));
                    if (engData.results.length > 0) {
                        setHeroContent(engData.results[0]); // Set hero to top english movie
                    }
                }

                // Fetch Tamil
                const yearsData = await getYears();
                if (yearsData && yearsData.length > 0) {
                    const latestYear = yearsData[0];
                    const tamData = await getMovies(latestYear.link, 1);
                    if (tamData) {
                        setTamilTrending(tamData.slice(0, 10));
                        // Optionally switch hero to Tamil if preferred
                        // if (!heroContent && tamData.length > 0) setHeroContent(tamData[0]);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch home data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHomeData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen text-slate-400">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-slate-600 border-t-white rounded-full animate-spin mb-4"></div>
                    <p className="text-xl">Loading Portals...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20">
            <HeroBanner movie={heroContent} type="movies" />
            
            <div className="-mt-16 relative z-20 space-y-12">
                {/* English Section */}
                <div className="relative">
                    <div className="flex items-center justify-between px-4 md:px-8 mb-2">
                        <h2 className="text-2xl font-bold text-white tracking-wide">Trending English</h2>
                        <Link to="/english" className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors font-medium">
                            Explore All <ChevronRight size={18} />
                        </Link>
                    </div>
                    <MovieCarousel title="" movies={englishTrending} type="movies" />
                </div>

                {/* Tamil Section */}
                <div className="relative">
                    <div className="flex items-center justify-between px-4 md:px-8 mb-2">
                        <h2 className="text-2xl font-bold text-white tracking-wide">Latest Tamil Releases</h2>
                        <Link to="/tamil" className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors font-medium">
                            Explore All <ChevronRight size={18} />
                        </Link>
                    </div>
                    <MovieCarousel title="" movies={tamilTrending} type="movies" />
                </div>
                
                {/* Unified CTA */}
                <div className="px-4 md:px-8 mt-16 pb-12">
                    <div className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center space-y-4 shadow-xl">
                        <h3 className="text-2xl md:text-3xl font-bold text-white">Choose Your Portal</h3>
                        <p className="text-slate-400 max-w-lg">Dive deeper into our extensive library. Select your preferred language portal to discover more movies and series.</p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link to="/english" className="bg-white text-black px-8 py-3 rounded-lg font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/10">
                                English Portal
                            </Link>
                            <Link to="/tamil" className="bg-white/10 text-white px-8 py-3 rounded-lg font-bold hover:bg-white/20 transition-colors border border-white/10">
                                Tamil Portal
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
