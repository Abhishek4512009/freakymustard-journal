import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { storage, migrateV1 } from '../lib/storage';

const AppContext = createContext(null);

const MAX_WATCHLIST = 200;
const MAX_CONTINUE = 12;
const MAX_RECENT_SEARCHES = 8;

let toastSeq = 0;

/**
 * Single-reader journal state: one watchlist, one reading history
 * (continue watching), recent searches, toasts. No profiles — this is
 * a printed page, not a household.
 */
export const AppProvider = ({ children }) => {
  // Run v1 -> v2 storage migration once, before first state read.
  useMemo(() => migrateV1(), []);

  /* ---------------- Watchlist ---------------- */
  const [watchlist, setWatchlist] = useState(() => storage.get('watchlist', []));
  useEffect(() => {
    storage.set('watchlist', watchlist);
  }, [watchlist]);

  /* ---------------- Continue watching ---------------- */
  const [continueWatching, setContinueWatching] = useState(() => storage.get('continue', []));
  useEffect(() => {
    storage.set('continue', continueWatching);
  }, [continueWatching]);

  /* ---------------- Recent searches ---------------- */
  const [recentSearches, setRecentSearches] = useState(() => storage.get('recentSearches', []));
  useEffect(() => {
    storage.set('recentSearches', recentSearches);
  }, [recentSearches]);

  /* ---------------- Toasts (stack) ---------------- */
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message, type = 'success', duration = 3200) => {
      const id = ++toastSeq;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      timersRef.current.set(
        id,
        setTimeout(() => dismissToast(id), duration)
      );
      return id;
    },
    [dismissToast]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  /* ---------------- Actions ---------------- */

  const addToWatchlist = useCallback((item) => {
    if (!item?.id) return false;
    let added = false;
    setWatchlist((prev) => {
      if (prev.some((x) => x.id === item.id)) return prev;
      added = true;
      return [
        {
          id: item.id,
          title: item.title,
          type: item.type || 'movies',
          poster: item.poster || item.backdrop,
          year: item.year,
          rating: item.rating,
          link: item.link,
          addedAt: Date.now(),
        },
        ...prev,
      ].slice(0, MAX_WATCHLIST);
    });
    return added;
  }, []);

  const removeFromWatchlist = useCallback((id) => {
    if (!id) return;
    setWatchlist((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const isInWatchlist = useCallback((id) => watchlist.some((x) => x.id === id), [watchlist]);

  /**
   * Save/merge continue-watching progress.
   * `progress` is 0-100 when known; pass `progress: null` to only bump
   * recency (e.g. iframe players where we can't measure real time).
   */
  const saveProgress = useCallback((item) => {
    if (!item?.id) return;
    setContinueWatching((prev) => {
      const existing = prev.find((x) => x.id === item.id);
      const merged = {
        id: item.id,
        title: item.title,
        type: item.type || 'movies',
        poster: item.poster || item.backdrop,
        // Keep the best-known progress; never regress a known value with null.
        progress: item.progress != null ? item.progress : (existing?.progress ?? null),
        season: item.season ?? existing?.season,
        episode: item.episode ?? existing?.episode,
        // Real resume position (seconds) for direct-stream players.
        positionSec: item.positionSec ?? existing?.positionSec,
        durationSec: item.durationSec ?? existing?.durationSec,
        watchLink: item.watchLink || existing?.watchLink,
        startedAt: existing?.startedAt || Date.now(),
        watchedAt: Date.now(),
      };
      return [merged, ...prev.filter((x) => x.id !== item.id)].slice(0, MAX_CONTINUE);
    });
  }, []);

  const removeProgress = useCallback((id) => {
    setContinueWatching((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addRecentSearch = useCallback((query) => {
    const q = query?.trim();
    if (!q) return;
    setRecentSearches((prev) =>
      [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT_SEARCHES)
    );
  }, []);

  const clearRecentSearches = useCallback(() => setRecentSearches([]), []);

  const value = useMemo(
    () => ({
      watchlist,
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist,
      continueWatching,
      saveProgress,
      removeProgress,
      recentSearches,
      addRecentSearch,
      clearRecentSearches,
      toasts,
      showToast,
      dismissToast,
    }),
    [
      watchlist,
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist,
      continueWatching,
      saveProgress,
      removeProgress,
      recentSearches,
      addRecentSearch,
      clearRecentSearches,
      toasts,
      showToast,
      dismissToast,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside an AppProvider');
  return context;
};
