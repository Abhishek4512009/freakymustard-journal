import { useEffect, useMemo, useState } from 'react';
import HeroBanner from '../components/HeroBanner';
import MovieCarousel from '../components/MovieCarousel';
import SectionHeader from '../components/SectionHeader';
import PosterCard from '../components/PosterCard';
import Button from '../components/ui/Button';
import { ErrorState } from '../components/ui/States';
import { Skeleton } from '../components/ui/Skeleton';
import { usePageMeta } from '../hooks';
import { getYears, getMovies } from '../api/tamilApi';
import { Loader2, ChevronDown } from 'lucide-react';

/**
 * Tamil portal: hero + year shelves.
 * Selecting a year chip switches to a full grid for that year with
 * "load more" pagination (backend pages param).
 */
export default function TamilPortal() {
  usePageMeta(
    'Tamil Movies — FreakyMustard',
    'Watch the latest Tamil movies by year — 2026 back to classics.'
  );

  const [years, setYears] = useState([]);
  const [rows, setRows] = useState([]); // [{ name, movies }]
  const [activeYear, setActiveYear] = useState(null); // { name, link }
  const [yearMovies, setYearMovies] = useState([]);
  const [yearPages, setYearPages] = useState(1);
  const [loadingYear, setLoadingYear] = useState(false);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      setPhase('loading');
      setError(null);
      try {
        const yearsData = await getYears(signal);
        if (!yearsData?.length) throw new Error('No years available.');
        setYears(yearsData);

        // First 3 years as shelves — in parallel.
        const firstYears = yearsData.slice(0, 3);
        const settled = await Promise.allSettled(
          firstYears.map((y) => getMovies(y.link, 1, signal))
        );
        const built = settled
          .map((res, i) =>
            res.status === 'fulfilled' && res.value.length > 0
              ? { name: firstYears[i].name.replace('Moviesda ', ''), movies: res.value }
              : null
          )
          .filter(Boolean);
        setRows(built);
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
  }, []);

  const openYear = async (year, pages = 1, append = false) => {
    setLoadingYear(true);
    try {
      const movies = await getMovies(year.link, pages);
      setYearMovies((prev) => (append ? [...prev, ...movies] : movies));
      setYearPages(pages);
      setActiveYear(year);
    } catch {
      /* keep previous */
    } finally {
      setLoadingYear(false);
    }
  };

  const heroPool = useMemo(() => {
    const first = rows[0]?.movies || [];
    return first.filter((m) => m.poster).slice(0, 5);
  }, [rows]);

  if (phase === 'error') {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  const loading = phase === 'loading';

  return (
    <div className="pb-16">
      <HeroBanner movies={heroPool} type="movies" />

      <div className="-mt-14 md:-mt-20 relative z-20 space-y-10 md:space-y-12">
        {/* Year chips */}
        {!loading && years.length > 0 && (
          <div className="px-4 md:px-8">
            <div
              className="flex gap-2 overflow-x-auto hide-scrollbar py-1"
              role="tablist"
              aria-label="Years"
            >
              {years.map((y) => {
                const label = y.name.replace('Moviesda ', '').replace(' Movies', '');
                const isActive = activeYear?.name === y.name;
                return (
                  <button
                    key={y.name}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => (isActive ? setActiveYear(null) : openYear(y))}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-brand-500 border-brand-400 text-white shadow-glow'
                        : 'bg-ink-800/80 border-ink-700 text-slate-300 hover:border-brand-500/40 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active year grid */}
        {activeYear && (
          <section aria-label={`${activeYear.name} movies`}>
            <SectionHeader
              title={activeYear.name.replace('Moviesda ', '')}
              subtitle={
                loadingYear && yearMovies.length === 0 ? 'Fetching…' : `${yearMovies.length} movies`
              }
            />
            {yearMovies.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4 md:px-8">
                  {yearMovies.map((m, i) => (
                    <PosterCard key={m.link || i} item={m} type="movies" fluid />
                  ))}
                </div>
                <div className="flex justify-center mt-8">
                  <Button
                    variant="secondary"
                    onClick={() => openYear(activeYear, yearPages + 1, true)}
                    disabled={loadingYear}
                  >
                    {loadingYear ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                    Load more
                  </Button>
                </div>
              </>
            ) : loadingYear ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4 md:px-8">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3]" />
                ))}
              </div>
            ) : null}
          </section>
        )}

        {/* Year shelves */}
        {rows.map((row) => (
          <section key={row.name} aria-label={row.name}>
            <SectionHeader title={row.name} />
            <MovieCarousel movies={row.movies.slice(0, 16)} type="movies" />
          </section>
        ))}

        {loading && (
          <>
            <SectionHeader title="Tamil Cinema" />
            <div className="flex gap-4 px-4 md:px-8">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="min-w-[140px] md:min-w-[180px] w-[140px] md:w-[180px] aspect-[2/3] shrink-0"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
