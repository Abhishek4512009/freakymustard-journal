import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Star } from 'lucide-react';
import { cleanTitle, extractYear, watchLinkFor, ratingColor } from '../lib/format';
import { PosterFallback } from './ui/States';

/**
 * Poster card used in carousels and grids.
 * Handles both English items ({id, poster, rating}) and Tamil items ({link, title}).
 */
export default function PosterCard({ item, type = 'movies', size = 'md', fluid = false }) {
  const [imgFailed, setImgFailed] = useState(false);

  const title = cleanTitle(item.title);
  const year = item.year || extractYear(item.title);
  const link = watchLinkFor(item, type);

  const sizeClasses = fluid
    ? 'w-full'
    : size === 'lg'
      ? 'min-w-[170px] md:min-w-[210px] w-[170px] md:w-[210px]'
      : 'min-w-[140px] md:min-w-[180px] w-[140px] md:w-[180px]';

  return (
    <Link
      to={link}
      aria-label={`Watch ${title}`}
      className={`relative ${sizeClasses} aspect-[2/3] rounded-xl overflow-hidden group/card shrink-0 bg-ink-800 border border-ink-700/60 transition-all duration-300 hover:scale-[1.06] hover:z-30 hover:border-brand-500/50 hover:shadow-card-hover focus-visible:scale-[1.06]`}
    >
      {item.poster && !imgFailed ? (
        <img
          src={item.poster}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
        />
      ) : (
        <PosterFallback title={title} />
      )}

      {/* Rating chip (always visible when present) */}
      {item.rating && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-bold">
          <Star size={10} className={`fill-current ${ratingColor(item.rating)}`} />
          <span className={ratingColor(item.rating)}>{item.rating}</span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent opacity-0 group-hover/card:opacity-100 group-focus-visible/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">{title}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] font-bold text-brand-300 bg-brand-500/15 px-1.5 py-0.5 rounded border border-brand-500/25">
            {year || 'HD'}
          </span>
          <span className="bg-brand-500 p-1.5 rounded-full shadow-glow">
            <Play size={12} className="text-white fill-current ml-px" />
          </span>
        </div>
      </div>
    </Link>
  );
}
