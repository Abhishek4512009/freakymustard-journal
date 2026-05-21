import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDetails } from '../api/englishApi';
import { ArrowLeft, Play, Info, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const WatchEnglish = () => {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const { saveProgress, showToast } = useApp();
    
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Player state
    const [currentStreamUrl, setCurrentStreamUrl] = useState('');
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [selectedEpisode, setSelectedEpisode] = useState(null); // Full episode object
    const [currentStreams, setCurrentStreams] = useState([]); // List of servers

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const data = await getDetails(type, id);
                setDetails(data);
                
                if (type === 'movies' && data.streams) {
                    setCurrentStreams(data.streams);
                    if (data.streams.length > 0) {
                        setCurrentStreamUrl(data.streams[0].url);
                        saveProgress({
                            id: data.id || id,
                            title: data.title,
                            type: 'movies',
                            poster: data.poster || data.backdrop,
                            progress: 45, // Simulating progress indicator
                            watchLink: `/watch/english/movies/${data.id || id}`
                        });
                    }
                } else if (type === 'series' && data.episodes) {
                    const firstEp = data.episodes[0];
                    if (firstEp) {
                        setSelectedSeason(firstEp.season);
                        setSelectedEpisode(firstEp);
                        setCurrentStreams(firstEp.streams);
                        if (firstEp.streams.length > 0) {
                            setCurrentStreamUrl(firstEp.streams[0].url);
                            saveProgress({
                                id: data.id || id,
                                title: data.title,
                                type: 'series',
                                poster: data.poster || data.backdrop,
                                progress: Math.min(Math.round((firstEp.episode / data.episodes.length) * 100), 100),
                                season: firstEp.season,
                                episode: firstEp.episode,
                                watchLink: `/watch/english/series/${data.id || id}`
                            });
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load details. Ensure backend is running.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [type, id]);

    // Handle Episode Change & Bookmark state
    const handleEpisodeSelect = (ep) => {
        setSelectedEpisode(ep);
        setCurrentStreams(ep.streams);
        if (ep.streams.length > 0) setCurrentStreamUrl(ep.streams[0].url);
        
        saveProgress({
            id: details.id || id,
            title: details.title,
            type: 'series',
            poster: details.poster || details.backdrop,
            progress: Math.min(Math.round((ep.episode / (details.episodes?.length || 1)) * 100), 100),
            season: ep.season,
            episode: ep.episode,
            watchLink: `/watch/english/series/${details.id || id}`
        });
        showToast(`Bookmarked Episode ${ep.episode}: "${ep.title}"`, 'success');
    };

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

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-slate-600 border-t-white rounded-full"></div></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
    if (!details) return <div className="min-h-screen flex items-center justify-center text-slate-500">Not found.</div>;

    const seasons = type === 'series' ? [...new Set(details.episodes.map(ep => ep.season))].sort((a,b)=>a-b) : [];
    const currentSeasonEpisodes = type === 'series' ? details.episodes.filter(ep => ep.season === selectedSeason).sort((a,b)=>a.episode-b.episode) : [];

    return (
        <div className="bg-[#0a0a0a] min-h-screen">
            {/* Player Header */}
            <div className="p-6 md:px-[120px] pt-10 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{details.title}</h1>
                        <p className="text-sm text-slate-400">
                            {details.year} • {details.runtime}
                            {type === 'series' && selectedEpisode && ` • S${selectedSeason} E${selectedEpisode.episode} - ${selectedEpisode.title}`}
                        </p>
                    </div>
                </div>
                
                <button 
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-white rounded-full transition-all duration-300 font-semibold text-sm cursor-pointer shadow-md hover:scale-105"
                >
                    <Share2 size={16} />
                    <span className="hidden sm:inline">Share Link</span>
                </button>
            </div>

            {/* Main Player Area */}
            <div className="max-w-7xl mx-auto md:px-[120px] py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Video Container (Spans 2 cols on lg) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 relative">
                        {currentStreamUrl ? (
                            <iframe 
                                src={currentStreamUrl} 
                                className="w-full h-full" 
                                allowFullScreen 
                                title="Video Player"
                            ></iframe>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                No streams available.
                            </div>
                        )}
                    </div>

                    {/* Server Selection */}
                    <div>
                        <h3 className="text-lg font-bold mb-3">Select Server</h3>
                        <div className="flex flex-wrap gap-2">
                            {currentStreams.map((s, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => setCurrentStreamUrl(s.url)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${currentStreamUrl === s.url ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Movie/Series Info */}
                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                        <p className="text-slate-300 leading-relaxed mb-4">{details.description}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-slate-500">Genres:</span> {details.genres?.join(', ')}</div>
                            <div><span className="text-slate-500">Rating:</span> ⭐ {details.rating}</div>
                            {details.director && <div><span className="text-slate-500">Director:</span> {details.director.join(', ')}</div>}
                            {details.cast && <div className="col-span-2"><span className="text-slate-500">Cast:</span> {details.cast.join(', ')}</div>}
                        </div>
                    </div>
                </div>

                {/* Sidebar (Episodes or Recommendations) */}
                <div className="lg:col-span-1">
                    {type === 'series' ? (
                        <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col h-[600px]">
                            {/* Season Selector */}
                            <div className="p-4 border-b border-slate-700/50 bg-slate-800/80">
                                <select 
                                    value={selectedSeason} 
                                    onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 focus:outline-none"
                                >
                                    {seasons.map(s => <option key={s} value={s}>Season {s}</option>)}
                                </select>
                            </div>
                            
                            {/* Episode List */}
                            <div className="flex-1 overflow-y-auto hide-scrollbar p-2 space-y-2">
                                {currentSeasonEpisodes.map(ep => (
                                    <button 
                                        key={ep.id}
                                        onClick={() => handleEpisodeSelect(ep)}
                                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${selectedEpisode?.id === ep.id ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-slate-800 border border-transparent'}`}
                                    >
                                        <div className="w-24 shrink-0 aspect-video bg-slate-900 rounded overflow-hidden relative">
                                            {ep.thumbnail ? <img src={ep.thumbnail} alt={ep.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">No Img</div>}
                                            {selectedEpisode?.id === ep.id && <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center"><Play size={16} className="text-white fill-current" /></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{ep.episode}. {ep.title}</div>
                                            <div className="text-xs text-slate-500 truncate">{ep.released?.split('T')[0] || 'Unknown Date'}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 text-center">
                            <Info size={32} className="mx-auto text-slate-500 mb-4" />
                            <h3 className="text-lg font-bold text-slate-300">Enjoy the Movie</h3>
                            <p className="text-sm text-slate-500 mt-2">Make sure to select the server that loads fastest for your region.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default WatchEnglish;
