import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    // 1. Watchlist State (Local Storage persistent)
    const [watchlist, setWatchlist] = useState(() => {
        try {
            const saved = localStorage.getItem('streamda_watchlist');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // 2. Continue Watching State (Local Storage persistent)
    const [continueWatching, setContinueWatching] = useState(() => {
        try {
            const saved = localStorage.getItem('streamda_continue');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // 3. Global Toast Notifications State
    const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

    // Sync watchlist to localStorage
    useEffect(() => {
        localStorage.setItem('streamda_watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    // Sync continueWatching to localStorage
    useEffect(() => {
        localStorage.setItem('streamda_continue', JSON.stringify(continueWatching));
    }, [continueWatching]);

    // Watchlist actions
    const addToWatchlist = (item) => {
        if (!item || !item.id) return;
        setWatchlist((prev) => {
            if (prev.some(x => x.id === item.id)) return prev;
            showToast(`Added "${item.title?.replace(/\(\d{4}\)/, '')}" to Watchlist`, 'success');
            return [
                {
                    id: item.id,
                    title: item.title,
                    type: item.type || 'movies',
                    poster: item.poster || item.backdrop,
                    year: item.year,
                    rating: item.rating,
                    link: item.link
                },
                ...prev
            ];
        });
    };

    const removeFromWatchlist = (id) => {
        if (!id) return;
        setWatchlist((prev) => {
            const item = prev.find(x => x.id === id);
            if (item) {
                showToast(`Removed "${item.title?.replace(/\(\d{4}\)/, '')}" from Watchlist`, 'info');
            }
            return prev.filter(x => x.id !== id);
        });
    };

    const isInWatchlist = (id) => {
        return watchlist.some(x => x.id === id);
    };

    // Continue Watching actions
    const saveProgress = (item) => {
        if (!item || !item.id) return;
        setContinueWatching((prev) => {
            // Remove existing duplicate
            const filtered = prev.filter(x => x.id !== item.id);
            // Prepend new state (keeps it sorted by most recently watched)
            return [
                {
                    id: item.id,
                    title: item.title,
                    type: item.type || 'movies',
                    poster: item.poster || item.backdrop,
                    progress: item.progress || 0,
                    season: item.season,
                    episode: item.episode,
                    watchLink: item.watchLink,
                    timestamp: Date.now()
                },
                ...filtered
            ].slice(0, 12); // Limit to top 12 items to preserve storage space
        });
    };

    const removeProgress = (id) => {
        setContinueWatching(prev => prev.filter(x => x.id !== id));
    };

    // Toast alert triggers
    const showToast = (message, type = 'success') => {
        setToast({ message, type, visible: true });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    // Auto-hide toast after 3 seconds
    useEffect(() => {
        if (toast.visible) {
            const timer = setTimeout(() => {
                hideToast();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.visible]);

    return (
        <AppContext.Provider value={{
            watchlist,
            continueWatching,
            toast,
            addToWatchlist,
            removeFromWatchlist,
            isInWatchlist,
            saveProgress,
            removeProgress,
            showToast,
            hideToast
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used inside an AppProvider');
    return context;
};
