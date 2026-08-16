import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clapperboard, Film, Tv } from 'lucide-react';
import HeroBanner from '../components/HeroBanner';
import MovieCarousel from '../components/MovieCarousel';
import SectionHeader from '../components/SectionHeader';
import { ErrorState } from '../components/ui/States';
import { usePageMeta } from '../hooks';
import { useApp } from '../context/AppContext';
import { getPopular, getByGenre } from '../api/englishApi';
import { getYears, getMovies } from '../api/tamilApi';

/**
 * Home: rotating hero + Continue Watching + trending shelves.
 * All data sources load in parallel; each shelf renders independently
 * so one slow endpoint never blocks the page.
 */
export default function Home() {
  usePageMeta(
    'FreakyMustard — Watch English & Tamil Movies Online',
    'Stream the latest English movies, series and Tamil cinema. Fast, beautiful, ad-light.'
  );

  const { continueWatching } = useApp();

  const [heroMovies, setHeroMovies] = useState([]);
  const [englishTrending, setEnglishTrending] = useState([]);
  const [seriesTrending, setSeriesTrending] = useState([]);
  const [tamilLatest, setTamilLatest] = useState([]);
  const [actionRow, setActionRow] = useState([]);
  const [phase, setPhase] = useState('loading'); // loading | ready | error

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      setPhase('loading');
      try {
        // Parallel first wave: hero + main shelves.
        const [engPopular, seriesPopular, years] = await Promise.all([
          getPopular('movies', 0, signal),
          getPopular('series', 0, signal),
          getYears(signal),
        ]);

        const engResults = engPopular?.results || [];
        const seriesResults = seriesPopular?.results || [];

        setEnglishTrending(engResults.slice(0, 14));
        setSeriesTrending(seriesResults.slice(0, 14));

        // Hero: interleave the best-looking entries (need backdrops).
        const heroPool = [...engResults.slice(0, 4), ...seriesResults.slice(0, 3)];
        setHeroMovies(heroPool.filter((m) => m.backdrop).slice(0, 6));

        // Tamil latest (depends on years list).
        if (years?.length > 0) {
          try {
            const tamil = await getMovies(years[0].link, 1, signal);
            setTamilLatest(tamil.slice(0, 14));
          } catch {
            /* non-fatal shelf */
          }
        }

        setPhase('ready');

        // Second wave (nice-to-have): action genre shelf.
        try {
          const action = await getByGenre('movies', 'action', 0, signal);
          setActionRow((action?.results || []).slice(0, 14));
        } catch {
          /* non-fatal */
        }
      } catch {
        if (!signal.aborted) setPhase('error');
      }
    };

    load();
    return () => controller.abort();
  }, []);

  if (phase === 'error') {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  const loading = phase === 'loading';

  return (
    <div className="pb-16">
      <HeroBanner movies={heroMovies} type="movies" />

      <div className="-mt-14 md:-mt-20 relative z-20 space-y-10 md:space-y-12">
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <section aria-label="Continue watching">
            <SectionHeader title="Continue Watching" to="/profile" />
            <MovieCarousel
              movies={continueWatching.map((item) => ({
                id: item.id,
                title: item.title,
                poster: item.poster,
                link: item.type === 'tamil' ? item.watchLink : undefined,
                _watchLink: item.watchLink,
                progress: item.progress,
                season: item.season,
                episode: item.episode,
                type: item.type,
              }))}
              type="movies"
              isContinueWatching
            />
          </section>
        )}

        {/* Trending English */}
        <section aria-label="Trending English movies">
          <SectionHeader title="Trending English" to="/english" />
          <MovieCarousel movies={englishTrending} type="movies" loading={loading} />
        </section>

        {/* Latest Tamil */}
        <section aria-label="Latest Tamil releases">
          <SectionHeader title="Latest Tamil Releases" to="/tamil" />
          <MovieCarousel
            movies={tamilLatest}
            type="movies"
            loading={loading && tamilLatest.length === 0}
          />
        </section>

        {/* Popular Series */}
        <section aria-label="Popular series">
          <SectionHeader title="Binge-Worthy Series" to="/english/series" />
          <MovieCarousel movies={seriesTrending} type="series" loading={loading} />
        </section>

        {/* Action shelf (second wave) */}
        {actionRow.length > 0 && (
          <section aria-label="Action movies">
            <SectionHeader title="Adrenaline: Action Picks" to="/english" />
            <MovieCarousel movies={actionRow} type="movies" />
          </section>
        )}

        {/* Portal CTA */}
        <section className="px-4 md:px-8 pt-4 pb-8">
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-ink-900 via-ink-900 to-brand-950/40 p-8 md:p-12">
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-20 w-72 h-72 bg-brand-500/15 rounded-full blur-[90px]"
            />
            <div
              aria-hidden="true"
              className="absolute -left-10 -bottom-24 w-64 h-64 bg-accent-500/10 rounded-full blur-[90px]"
            />
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-2xl md:text-3xl font-black text-white font-display mb-3">
                Two cinemas. One remote.
              </h2>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed mb-7">
                Jump between Hollywood blockbusters, binge-worthy series and the freshest Tamil
                releases — with watchlist and continue-watching built in.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/english"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-sm transition-all hover:scale-[1.03] shadow-glow"
                >
                  <Film size={16} /> English Movies
                </Link>
                <Link
                  to="/english/series"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-sm transition-all hover:scale-[1.03]"
                >
                  <Tv size={16} /> Series
                </Link>
                <Link
                  to="/tamil"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-sm transition-all hover:scale-[1.03]"
                >
                  <Clapperboard size={16} /> Tamil Cinema
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
