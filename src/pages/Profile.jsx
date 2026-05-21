import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { User, Settings, Play, Plus, Trash2, ShieldCheck, Heart, Award } from 'lucide-react';

const Profile = () => {
    const { watchlist, continueWatching, removeFromWatchlist, removeProgress } = useApp();

    // Simulated household profiles
    const profiles = [
        { id: 1, name: 'Primary Space', color: 'from-blue-600 to-indigo-600', avatar: '😎' },
        { id: 2, name: 'Tamil Cinema Fan', color: 'from-red-600 to-orange-600', avatar: '🎬' },
        { id: 3, name: 'Kids Zone', color: 'from-green-600 to-emerald-600', avatar: '🦄' },
        { id: 4, name: 'English Series Binger', color: 'from-purple-600 to-pink-600', avatar: '🍿' },
    ];

    const [activeProfile, setActiveProfile] = useState(profiles[0]);

    return (
        <div className="min-h-screen bg-slate-950 pb-20 pt-24 px-4 md:px-[120px] space-y-12 animate-in fade-in duration-500">
            {/* Header / Profile Switcher banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent p-8 rounded-2xl border border-slate-800/80 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="flex items-center gap-6 z-10">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${activeProfile.color} flex items-center justify-center text-4xl shadow-xl shadow-blue-950/40 border border-white/10 transform hover:scale-105 transition-all duration-300`}>
                        {activeProfile.avatar}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black tracking-tight text-white">{activeProfile.name}</h1>
                            <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-500/30">PRO</span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">Manage watchlist, viewing preferences, and active channels.</p>
                    </div>
                </div>

                {/* Profile selector picker */}
                <div className="flex items-center gap-3 z-10 bg-slate-950/60 backdrop-blur-md p-2 rounded-xl border border-slate-800/50">
                    {profiles.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setActiveProfile(p)}
                            title={p.name}
                            className={`w-12 h-12 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center text-2xl border transition-all duration-300 ${activeProfile.id === p.id ? 'border-white scale-110 shadow-lg shadow-white/10' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                        >
                            {p.avatar}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick stats / Features badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-xl flex items-center gap-4 hover:border-slate-700/80 transition-all duration-300">
                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400"><ShieldCheck size={24} /></div>
                    <div>
                        <h3 className="text-white font-bold">Premium Active</h3>
                        <p className="text-xs text-slate-400 mt-0.5">High-Fidelity audio & 4K UHD enabled</p>
                    </div>
                </div>
                <div className="p-6 bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-xl flex items-center gap-4 hover:border-slate-700/80 transition-all duration-300">
                    <div className="p-3 bg-red-500/10 rounded-lg text-red-400"><Heart size={24} /></div>
                    <div>
                        <h3 className="text-white font-bold">Favorites Portal</h3>
                        <p className="text-xs text-slate-400 mt-0.5">English & Tamil catalogs preferred</p>
                    </div>
                </div>
                <div className="p-6 bg-slate-900/40 backdrop-blur border border-slate-800/80 rounded-xl flex items-center gap-4 hover:border-slate-700/80 transition-all duration-300">
                    <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400"><Award size={24} /></div>
                    <div>
                        <h3 className="text-white font-bold">Safe Streaming</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Ad-free proxy servers integrated</p>
                    </div>
                </div>
            </div>

            {/* Continue Watching Section */}
            {continueWatching.length > 0 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                        <span className="w-2.5 h-6 bg-blue-500 rounded-full"></span>
                        Continue Watching
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {continueWatching.map((item, index) => (
                            <div 
                                key={item.id || index}
                                className="bg-slate-900/50 rounded-xl overflow-hidden border border-slate-800/80 group/continue hover:border-slate-700 transition-all duration-300 hover:scale-[1.02] shadow-lg flex flex-col justify-between"
                            >
                                <div className="relative aspect-video bg-slate-800 overflow-hidden">
                                    {item.poster ? (
                                        <img 
                                            src={item.poster} 
                                            alt={item.title} 
                                            className="w-full h-full object-cover group-hover/continue:scale-105 transition-transform duration-500 opacity-80" 
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center p-4">
                                            <span className="text-center font-bold text-sm text-slate-500 line-clamp-3">{item.title}</span>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/continue:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                        <Link 
                                            to={item.watchLink}
                                            className="bg-white text-black p-3.5 rounded-full hover:scale-110 transition-transform shadow-lg"
                                        >
                                            <Play size={20} className="fill-current ml-0.5" />
                                        </Link>
                                        <button 
                                            onClick={() => removeProgress(item.id)}
                                            className="bg-red-600 text-white p-3.5 rounded-full hover:scale-110 transition-transform shadow-lg"
                                            title="Remove progress"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    {/* Season / Episode overlay */}
                                    {item.season && (
                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-xs font-bold text-white px-2 py-0.5 rounded">
                                            S{item.season} E{item.episode}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Card Meta & Progress Bar */}
                                <div className="p-4 space-y-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className="font-bold text-white group-hover/continue:text-blue-400 transition-colors truncate">{item.title?.replace(/\(\d{4}\)/, '')}</h3>
                                        <span className="text-xs text-slate-500 font-semibold uppercase">{item.type}</span>
                                    </div>
                                    
                                    {/* Custom Progress Bar */}
                                    <div className="space-y-1">
                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${item.progress}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                                            <span>{item.progress}% watched</span>
                                            <span>Resume</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* My Watchlist Dashboard */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                    <span className="w-2.5 h-6 bg-purple-500 rounded-full"></span>
                    My Watchlist
                </h2>
                
                {watchlist.length === 0 ? (
                    <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl p-12 text-center text-slate-500">
                        <Plus size={48} className="mx-auto mb-3 opacity-30 animate-pulse" />
                        <p className="font-medium text-lg">Your Watchlist is empty</p>
                        <p className="text-sm text-slate-600 mt-1">Add shows and movies while exploring to watch them later.</p>
                        <Link to="/" className="inline-block mt-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg border border-slate-700/50 transition-colors">
                            Explore Catalog
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                        {watchlist.map((item) => {
                            const watchLink = item.link 
                                ? `/watch/tamil/${encodeURIComponent(item.link)}?title=${encodeURIComponent(item.title)}`
                                : `/watch/english/${item.type || 'movies'}/${item.id}`;

                            return (
                                <div 
                                    key={item.id}
                                    className="group/card relative aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 shadow-lg hover:border-slate-700 hover:scale-105 transition-all duration-300"
                                >
                                    {item.poster ? (
                                        <img 
                                            src={item.poster} 
                                            alt={item.title} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105" 
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-950 flex flex-col justify-between p-4 border border-slate-900/50 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase">Tamil</span>
                                                <span className="text-xs text-slate-500 font-extrabold">{item.year || 'HD'}</span>
                                            </div>
                                            <h3 className="text-sm font-extrabold text-slate-100 text-center leading-snug drop-shadow-lg line-clamp-4">
                                                {item.title?.replace(/\(\d{4}\)/, '')}
                                            </h3>
                                            <div className="h-6"></div>
                                        </div>
                                    )}
                                    
                                    {/* Glassmorphic Actions on Hover */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                                        {/* Remove button */}
                                        <div className="flex justify-end">
                                            <button 
                                                onClick={() => removeFromWatchlist(item.id)}
                                                className="p-1.5 bg-black/60 hover:bg-red-650 rounded-lg text-white hover:text-white transition-colors backdrop-blur-md"
                                                title="Remove from Watchlist"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {/* Details & Play Link */}
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-white text-sm truncate">{item.title?.replace(/\(\d{4}\)/, '')}</h4>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400 font-semibold uppercase">{item.year || 'HD'}</span>
                                                <Link 
                                                    to={watchLink}
                                                    className="bg-white/20 hover:bg-white text-white hover:text-black p-1.5 rounded-full backdrop-blur-sm transition-all"
                                                >
                                                    <Play size={14} className="fill-current ml-0.5" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
