import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getAutoStream } from '../api/tamilApi';
import { ArrowLeft, AlertCircle, Loader, Film } from 'lucide-react';

const WatchTamil = () => {
    const { encodedUrl } = useParams();
    const [searchParams] = useSearchParams();
    const title = searchParams.get('title') || 'Tamil Movie';
    const navigate = useNavigate();

    const [streamUrl, setStreamUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('Initializing...');
    const [quality, setQuality] = useState('');
    const [metadata, setMetadata] = useState({});

    const hasFetched = useRef(false);

    useEffect(() => {
        const link = decodeURIComponent(encodedUrl);
        if (!link || hasFetched.current) return;
        hasFetched.current = true;

        const resolveStream = async () => {
            setLoading(true);
            setError(null);
            setStatus('Searching for best quality (1080p)...');

            try {
                const result = await getAutoStream(link);
                if (result && result.stream_url) {
                    setStreamUrl(result.stream_url);
                    setQuality(result.quality);
                    setMetadata({
                        poster: result.poster,
                        desc: result.desc
                    });
                    setStatus('Ready to play');
                } else {
                    throw new Error("Could not resolve a valid stream link.");
                }
            } catch (err) {
                console.error(err);
                setError(err.message || 'Failed to load video');
            } finally {
                setLoading(false);
            }
        };

        resolveStream();
    }, [encodedUrl]);

    return (
        <div className="bg-black min-h-screen text-white flex flex-col relative overflow-hidden">
            {/* Player Header */}
            <div className="absolute top-0 inset-x-0 p-6 pt-10 flex items-center gap-4 z-50 bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={() => navigate(-1)} className="p-2 bg-black/50 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md">
                    <ArrowLeft size={24} />
                </button>
                <div className="drop-shadow-md">
                    <h1 className="text-2xl font-bold">{title.replace(/\(\d{4}\)/, '')}</h1>
                    {quality && <span className="text-xs font-mono text-green-400">Quality: {quality}</span>}
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-6 max-w-md w-full px-4 animate-in fade-in zoom-in duration-500">
                        <div className="relative w-20 h-20 mx-auto">
                            <div className="absolute inset-0 border-4 border-red-900/30 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin"></div>
                            <Film className="absolute inset-0 m-auto text-red-600 animate-pulse" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Loading Movie</h2>
                            <p className="text-red-500 font-medium animate-pulse">{status}</p>
                            <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
                                Resolving download servers and fetching highest quality link from MoviesDA...
                            </p>
                        </div>
                    </div>
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md p-8 bg-[#1a1a1a] rounded-xl border border-red-900/30 shadow-2xl">
                        <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="text-red-500" size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-red-500 mb-2">Playback Error</h2>
                        <p className="text-gray-400 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-medium transition"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-black relative flex items-center justify-center pt-24 pb-32">
                    <video
                        controls
                        autoPlay
                        className="w-full max-w-6xl aspect-video object-contain bg-black shadow-2xl rounded-xl border border-slate-800"
                        controlsList="nodownload"
                    >
                        <source src={streamUrl} type="video/mp4" />
                        <source src={streamUrl} type="video/x-matroska" />
                        Your browser does not support the video tag.
                    </video>

                    {/* Metadata Overlay Bottom */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-8 pointer-events-none">
                        <div className="max-w-4xl mx-auto md:ml-[120px]">
                            {metadata.desc && (
                                <p className="text-gray-200 text-sm md:text-base max-w-2xl leading-relaxed whitespace-pre-wrap drop-shadow">
                                    {metadata.desc}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WatchTamil;
