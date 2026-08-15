import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import PosterCard from './PosterCard';
import { PosterSkeletonRow } from './ui/Skeleton';
import { PosterFallback } from './ui/States';
import { cleanTitle } from '../lib/format';
import { useApp } from '../context/AppContext';

/** Continue-watching card: landscape poster, progress bar, remove button. */
function ContinueCard({ item }) {
  const { removeProgress } = useApp();
  const [imgFailed, setImgFailed] = useState(false);
  const title = cleanTitle(item.title);
  const to = item._watchLink || item.watchLink || '#';
  const epLabel =
    item.type === 'series' && item.season != null ? `S${item.season} · E${item.episode}` : null;

  return (
    <div className="relative min-w-[240px] md:min-w-[280px] w-[240px] md:w-[280px] shrink-0 group/cont">
      <Link
        to={to}
        aria-label={`Resume ${title}`}
        className="block relative aspect-video rounded-xl overflow-hidden bg-ink-800 border border-ink-700/60 transition-all duration-300 hover:scale-[1.04] hover:border-brand-500/50 hover:shadow-card-hover"
      >
        {item.poster && !imgFailed ? (
          <img
            src={item.poster}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <PosterFallback title={title} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cont:opacity-100 transition-opacity duration-200">
          <span className="bg-white/95 rounded-full p-3 shadow-card">
            <Play size={18} className="text-ink-950 fill-current ml-0.5" />
          </span>
        </div>
        <div className="absolute bottom-0 inset-x-0 p-3">
          <p className="text-white text-sm font-bold truncate">{title}</p>
          {epLabel && <p className="text-[10px] text-slate-400 font-semibold">{epLabel}</p>}
        </div>
        {/* Progress bar */}
        {item.progress != null && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-white/15" aria-hidden="true">
            <div
              className="h-full bg-gradient-to-r from-brand-400 to-accent-500"
              style={{ width: `${Math.min(100, Math.max(2, item.progress))}%` }}
            />
          </div>
        )}
      </Link>
      <button
        onClick={() => removeProgress(item.id)}
        aria-label={`Remove ${title} from Continue Watching`}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-slate-300 opacity-0 group-hover/cont:opacity-100 focus-visible:opacity-100 hover:bg-red-600 hover:text-white transition-all cursor-pointer z-10"
      >
        <X size={13} />
      </button>
    </div>
  );
}

/**
 * Horizontal poster shelf with:
 *  - mouse drag-to-scroll (desktop) + native touch scroll
 *  - arrow buttons that appear when scrollable in that direction
 *  - edge fade masks
 *  - isContinueWatching mode: landscape cards with progress bars
 */
export default function MovieCarousel({
  movies = [],
  type = 'movies',
  loading = false,
  size = 'md',
  isContinueWatching = false,
}) {
  const rowRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  // Drag-to-scroll state (mouse only; touch uses native scrolling)
  const drag = useRef({ down: false, startX: 0, scrollLeft: 0, moved: false });

  const updateArrows = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = rowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateArrows, movies.length]);

  const scrollBy = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth - 120), behavior: 'smooth' });
  };

  const onMouseDown = (e) => {
    const el = rowRef.current;
    if (!el) return;
    drag.current = { down: true, startX: e.pageX, scrollLeft: el.scrollLeft, moved: false };
  };
  const onMouseMove = (e) => {
    if (!drag.current.down || !rowRef.current) return;
    const dx = e.pageX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    rowRef.current.scrollLeft = drag.current.scrollLeft - dx;
  };
  const endDrag = () => {
    drag.current.down = false;
  };
  // Suppress the click that follows a drag so cards don't open accidentally.
  const onClickCapture = (e) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  if (loading) return <PosterSkeletonRow />;
  if (!movies || movies.length === 0) return null;

  return (
    <div className="relative group/carousel">
      {/* Edge fades */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-0 top-0 bottom-8 w-8 md:w-16 bg-gradient-to-r from-ink-950 to-transparent z-10 transition-opacity duration-300 ${canLeft ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute right-0 top-0 bottom-8 w-8 md:w-16 bg-gradient-to-l from-ink-950 to-transparent z-10 transition-opacity duration-300 ${canRight ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Arrows */}
      {canLeft && (
        <button
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className="hidden md:flex absolute left-3 top-[42%] -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full glass border border-white/10 text-white opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 transition-all hover:bg-brand-500/80 hover:scale-110 cursor-pointer"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {canRight && (
        <button
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className="hidden md:flex absolute right-3 top-[42%] -translate-y-1/2 z-20 items-center justify-center w-10 h-10 rounded-full glass border border-white/10 text-white opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 transition-all hover:bg-brand-500/80 hover:scale-110 cursor-pointer"
        >
          <ChevronRight size={22} />
        </button>
      )}

      <div
        ref={rowRef}
        onScroll={updateArrows}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={endDrag}
        onMouseUp={endDrag}
        onClickCapture={onClickCapture}
        className="flex gap-3.5 md:gap-4 overflow-x-auto hide-scrollbar px-4 md:px-8 py-2 cursor-grab active:cursor-grabbing select-none"
      >
        {movies.map((movie, idx) =>
          isContinueWatching ? (
            <ContinueCard key={movie.id || idx} item={movie} />
          ) : (
            <PosterCard key={movie.id || movie.link || idx} item={movie} type={type} size={size} />
          )
        )}
      </div>
    </div>
  );
}
