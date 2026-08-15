import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Clock, Trash2, Film, Tv, Clapperboard } from 'lucide-react';
import PosterCard from '../components/PosterCard';
import SectionHeader from '../components/SectionHeader';
import { EmptyState } from '../components/ui/States';
import { Skeleton } from '../components/ui/Skeleton';
import { useDebouncedValue, usePageMeta } from '../hooks';
import { useApp } from '../context/AppContext';
import { searchContent } from '../api/englishApi';
import { searchMovies } from '../api/tamilApi';

const TRENDING_SUGGESTIONS = [
  'Spider-Man',
  'House of the Dragon',
  'Vikram',
  'Oppenheimer',
  'Leo',
  'Breaking Bad',
  'Jailer',
  'Dune',
];

/**
 * Unified search across English movies, English series and Tamil movies.
 * Debounced live search + URL sync (?q=) + recent searches.
 */
export default function SearchPage() {
  usePageMeta('Search — Streamda', 'Search English movies, series and Tamil movies.');

  const [searchParams, setSearchParams] = useSearchParams();
  const { recentSearches, addRecentSearch, clearRecentSearches } = useApp();

  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const debounced = useDebouncedValue(query, 450);

  const [engMovies, setEngMovies] = useState([]);
  const [engSeries, setEngSeries] = useState([]);
  const [tamilMovies, setTamilMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const runSearch = useCallback(
    async (q) => {
      const clean = q.trim();
      if (clean.length < 2) {
        setEngMovies([]);
        setEngSeries([]);
        setTamilMovies([]);
        setSearched(false);
        return;
      }

      // Cancel any previous in-flight search.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setSearched(true);
      addRecentSearch(clean);

      const [moviesRes, seriesRes, tamilRes] = await Promise.allSettled([
        searchContent('movies', clean, controller.signal),
        searchContent('series', clean, controller.signal),
        searchMovies(clean, controller.signal),
      ]);

      if (controller.signal.aborted) return;

      setEngMovies(moviesRes.status === 'fulfilled' ? moviesRes.value?.results || [] : []);
      setEngSeries(seriesRes.status === 'fulfilled' ? seriesRes.value?.results || [] : []);
      setTamilMovies(tamilRes.status === 'fulfilled' ? tamilRes.value || [] : []);
      setLoading(false);
    },
    [addRecentSearch]
  );

  // Live debounced search + URL sync
  useEffect(() => {
    setSearchParams(debounced.trim() ? { q: debounced.trim() } : {}, { replace: true });
    // Effect-driven search is intentional: debounce + abort orchestration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runSearch(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Focus search box on mount (desktop)
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) inputRef.current?.focus();
  }, []);

  const totalResults = engMovies.length + engSeries.length + tamilMovies.length;
  const showLanding = !searched && !loading;

  const renderGroup = (title, icon, items, type) => {
    if (items.length === 0) return null;
    return (
      <section aria-label={title} className="animate-fade-in">
        <SectionHeader
          title={title}
          subtitle={`${items.length} result${items.length === 1 ? '' : 's'}`}
          accent
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4 md:px-8">
          {items.map((m, i) => (
            <PosterCard key={m.id || m.link || i} item={m} type={type} fluid />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen pb-20 pt-8 md:pt-14 px-4 md:px-8">
      {/* Search input */}
      <div className="max-w-2xl mx-auto mb-10">
        <h1 className="text-2xl md:text-3xl font-black text-white font-display mb-5 text-center">
          What are you watching tonight?
        </h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            ref={inputRef}
            type="search"
            role="searchbox"
            aria-label="Search movies and series"
            placeholder="Search English movies, series, Tamil movies…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-ink-800/90 border border-ink-700 text-white rounded-2xl py-3.5 pl-12 pr-12 text-sm md:text-base placeholder:text-slate-500 focus:outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-8 max-w-6xl mx-auto">
          {[0, 1].map((row) => (
            <div key={row}>
              <Skeleton className="h-7 w-48 mb-4 ml-4 md:ml-8" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <div className="space-y-10 max-w-6xl mx-auto">
          {totalResults === 0 ? (
            <EmptyState
              title={`No results for "${debounced.trim()}"`}
              message="Check the spelling, or try a shorter keyword. Tamil search works best with movie names."
            />
          ) : (
            <>
              {renderGroup('English Movies', Film, engMovies, 'movies')}
              {renderGroup('English Series', Tv, engSeries, 'series')}
              {renderGroup('Tamil Movies', Clapperboard, tamilMovies, 'movies')}
            </>
          )}
        </div>
      )}

      {/* Landing: recent + trending */}
      {showLanding && (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Clock size={14} /> Recent searches
                </h2>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuery(q)}
                    className="px-3.5 py-2 rounded-full bg-ink-800 border border-ink-700 text-slate-300 text-xs font-semibold hover:border-brand-500/40 hover:text-white transition-all cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-bold text-slate-300 mb-3">Trending searches</h2>
            <div className="flex flex-wrap gap-2">
              {TRENDING_SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="px-3.5 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold hover:bg-brand-500/20 transition-all cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
