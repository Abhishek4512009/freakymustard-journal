import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Plus, Check, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cleanTitle, watchLinkFor, ratingColor } from '../lib/format';
import Badge from './ui/Badge';

const ROTATE_MS = 8000;

/**
 * Cinematic hero with auto-rotating slides, backdrop crossfade,
 * watchlist toggle and watch CTA.
 */
export default function HeroBanner({ movies = [], type = 'movies' }) {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist, showToast } = useApp();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = useMemo(
    () => (movies || []).filter((m) => m && (m.backdrop || m.poster)).slice(0, 6),
    [movies]
  );

  const count = slides.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(timer);
  }, [count, paused]);

  const goTo = useCallback((i) => setIndex(((i % count) + count) % count), [count]);

  if (count === 0) {
    return (
      <div className="relative h-[55vh] md:h-[78vh] w-full bg-gradient-to-b from-ink-900 to-ink-950 flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-3xl md:text-5xl font-black font-display text-gradient-brand mb-3">
            FREAKYMUSTARD
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
            English blockbusters, binge-worthy series and the latest Tamil cinema — all in one
            place.
          </p>
        </div>
      </div>
    );
  }

  const movie = slides[index];
  const movieId = movie.id || movie.link;
  const isAdded = isInWatchlist(movieId);
  const link = watchLinkFor(movie, type);
  const title = cleanTitle(movie.title);

  const toggleWatchlist = () => {
    if (isAdded) {
      removeFromWatchlist(movieId);
      showToast(`Removed "${title}" from Watchlist`, 'info');
    } else {
      addToWatchlist({
        id: movieId,
        title: movie.title,
        type: movie.link ? 'tamil' : type,
        poster: movie.poster || movie.backdrop,
        year: movie.year,
        rating: movie.rating,
        link: movie.link,
      });
      showToast(`Added "${title}" to Watchlist`, 'success');
    }
  };

  return (
    <section
      aria-label="Featured titles"
      className="relative h-[62vh] md:h-[82vh] w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Crossfading backdrops (all mounted for smooth transitions) */}
      {slides.map((m, i) => (
        <div
          key={m.id || m.link || i}
          aria-hidden="true"
          className={`absolute inset-0 transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={m.backdrop || m.poster}
            alt=""
            className={`w-full h-full object-cover ${i === index ? 'scale-105' : 'scale-100'} transition-transform duration-[9000ms] ease-linear`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        </div>
      ))}

      {/* Gradient masks */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/35 to-ink-950/10"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/50 to-transparent"
      />

      {/* Content */}
      <div className="absolute bottom-[14%] md:bottom-[18%] left-4 md:left-12 right-4 max-w-2xl space-y-4 md:space-y-5 z-10">
        <div key={movieId} className="space-y-4 md:space-y-5 animate-fade-in-up">
          <h1 className="text-3xl md:text-6xl font-black text-white drop-shadow-2xl tracking-tight line-clamp-2 leading-[1.05] font-display">
            {title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs md:text-sm text-slate-300 font-semibold">
            {movie.rating && (
              <span className={`flex items-center gap-1 ${ratingColor(movie.rating)}`}>
                <Star size={13} className="fill-current" /> {movie.rating}
              </span>
            )}
            {movie.year && <span>{movie.year}</span>}
            {movie.runtime && <span>{movie.runtime}</span>}
            {movie.genres?.length > 0 && (
              <span className="hidden sm:inline text-slate-400">
                {movie.genres.slice(0, 3).join(' · ')}
              </span>
            )}
          </div>

          <p className="text-sm md:text-base text-slate-300/90 drop-shadow-md max-w-xl line-clamp-2 md:line-clamp-3 leading-relaxed">
            {movie.description || 'Experience the latest blockbuster in high quality.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to={link}
              className="flex items-center gap-2 bg-white text-ink-950 px-6 py-3 md:px-8 md:py-3.5 rounded-xl hover:bg-slate-200 transition-all duration-200 font-bold text-sm md:text-base shadow-card hover:scale-[1.04] active:scale-[0.98]"
            >
              <Play size={18} className="fill-current" /> Watch Now
            </Link>

            <button
              onClick={toggleWatchlist}
              aria-pressed={isAdded}
              className={`flex items-center gap-2 px-5 py-3 md:py-3.5 rounded-xl glass border font-bold text-sm md:text-base transition-all duration-200 hover:scale-[1.04] active:scale-[0.98] cursor-pointer ${
                isAdded
                  ? 'border-brand-500/50 text-brand-300'
                  : 'border-white/10 text-white hover:bg-white/15'
              }`}
            >
              {isAdded ? <Check size={17} /> : <Plus size={17} />}
              {isAdded ? 'In Watchlist' : 'Watchlist'}
            </button>

            {movie.type === 'series' || type === 'series' ? (
              <Badge tone="accent" className="ml-1">
                SERIES
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      {count > 1 && (
        <div
          className="absolute bottom-6 left-4 md:left-12 z-20 flex items-center gap-2"
          role="tablist"
          aria-label="Featured slides"
        >
          {slides.map((m, i) => (
            <button
              key={m.id || m.link || i}
              role="tab"
              aria-selected={i === index}
              aria-label={`Show slide ${i + 1}: ${cleanTitle(m.title)}`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === index ? 'w-8 bg-brand-400' : 'w-3 bg-white/25 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
