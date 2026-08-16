import { useEffect, useMemo, useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import MovieCarousel from '../components/MovieCarousel';
import SectionHeader from '../components/SectionHeader';
import PosterCard from '../components/PosterCard';
import Button from '../components/ui/Button';
import { ErrorState } from '../components/ui/States';
import { Skeleton } from '../components/ui/Skeleton';
import { usePageMeta } from '../hooks';
import { getPopular, getTop, getGenres, getByGenre } from '../api/englishApi';
import { Loader2, ChevronDown } from 'lucide-react';

/**
 * English portal (movies or series, driven by the `type` prop).
 * Hero + Popular + Top Rated + genre shelves with infinite "load more".
 */
export default function EnglishPortal({ type = 'movies' }) {
  const isSeries = type === 'series';
  usePageMeta(
    `English ${isSeries ? 'Series' : 'Movies'} — FreakyMustard`,
    `Browse popular and top-rated English ${isSeries ? 'series' : 'movies'} by genre.`
  );

  const [popular, setPopular] = useState([]);
  const [top, setTop] = useState([]);
  const [genres, setGenres] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const [genreResults, setGenreResults] = useState([]);
  const [genreSkip, setGenreSkip] = useState(0);
  const [genreHasMore, setGenreHasMore] = useState(false);
  const [loadingGenre, setLoadingGenre] = useState(false);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState(null);

  // Initial load
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      setPhase('loading');
      setError(null);
      try {
        const [popData, topData, genreData] = await Promise.all([
          getPopular(type, 0, signal),
          getTop(type, 0, signal).catch(() => null),
          getGenres(signal).catch(() => null),
        ]);
        setPopular(popData?.results || []);
        setTop(topData?.results || []);
        setGenres(genreData?.genres || []);
        setPhase('ready');
      } catch (err) {
        if (!signal.aborted) {
          setError(err.message);
          setPhase('error');
        }
      }
    };

    load();
    return () => controller.abort();
  }, [type]);

  // Reset genre selection when switching movies<->series
  useEffect(() => {
    // Intentional synchronous reset on route-type change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveGenre(null);

    setGenreResults([]);
  }, [type]);

  const selectGenre = async (genre, append = false) => {
    if (!genre) return;
    setLoadingGenre(true);
    try {
      const skip = append ? genreSkip : 0;
      const data = await getByGenre(type, genre, skip);
      const results = data?.results || [];
      setGenreResults((prev) => (append ? [...prev, ...results] : results));
      setGenreSkip(skip + results.length);
      setGenreHasMore(Boolean(data?.has_more) && results.length > 0);
      if (!append) setActiveGenre(genre);
    } catch {
      /* keep previous results */
    } finally {
      setLoadingGenre(false);
    }
  };

  const heroPool = useMemo(() => popular.filter((m) => m.backdrop).slice(0, 5), [popular]);

  if (phase === 'error') {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  const loading = phase === 'loading';

  return (
    <div className="pb-16">
      <HeroBanner movies={heroPool} type={type} />

      <div className="-mt-14 md:-mt-20 relative z-20 space-y-10 md:space-y-12">
        {/* Genre chips */}
        {!loading && genres.length > 0 && (
          <div className="px-4 md:px-8">
            <div
              className="flex gap-2 overflow-x-auto hide-scrollbar py-1"
              role="tablist"
              aria-label="Genres"
            >
              {genres.map((g) => (
                <button
                  key={g}
                  role="tab"
                  aria-selected={activeGenre === g}
                  onClick={() => (activeGenre === g ? setActiveGenre(null) : selectGenre(g))}
                  className={`px-4 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap border transition-all duration-200 cursor-pointer ${
                    activeGenre === g
                      ? 'bg-brand-500 border-brand-400 text-white shadow-glow'
                      : 'bg-ink-800/80 border-ink-700 text-slate-300 hover:border-brand-500/40 hover:text-white'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active genre results */}
        {activeGenre && (
          <section aria-label={`${activeGenre} ${type}`}>
            <SectionHeader
              title={`${activeGenre.charAt(0).toUpperCase() + activeGenre.slice(1)} ${isSeries ? 'Series' : 'Movies'}`}
              subtitle={loadingGenre && genreResults.length === 0 ? 'Fetching…' : undefined}
            />
            {genreResults.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4 md:px-8">
                  {genreResults.map((m, i) => (
                    <PosterCard key={m.id || i} item={m} type={type} fluid />
                  ))}
                </div>
                {genreHasMore && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="secondary"
                      onClick={() => selectGenre(activeGenre, true)}
                      disabled={loadingGenre}
                    >
                      {loadingGenre ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                      Load more
                    </Button>
                  </div>
                )}
              </>
            ) : loadingGenre ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4 md:px-8">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3]" />
                ))}
              </div>
            ) : null}
          </section>
        )}

        {/* Popular shelf */}
        <section aria-label={`Popular ${type}`}>
          <SectionHeader title={`Popular ${isSeries ? 'Series' : 'Movies'}`} />
          <MovieCarousel movies={popular.slice(0, 16)} type={type} loading={loading} size="lg" />
        </section>

        {/* Top rated shelf */}
        <section aria-label={`Top rated ${type}`}>
          <SectionHeader title={`Top Rated ${isSeries ? 'Series' : 'Movies'}`} />
          <MovieCarousel movies={top.slice(0, 16)} type={type} loading={loading} />
        </section>

        {/* Deep list: everything else from popular */}
        {popular.length > 16 && (
          <section aria-label={`All ${type}`}>
            <SectionHeader title={`More ${isSeries ? 'Series' : 'Movies'}`} />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 px-4 md:px-8">
              {popular.slice(16).map((m, i) => (
                <PosterCard key={m.id || i} item={m} type={type} fluid />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
