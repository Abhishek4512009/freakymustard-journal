import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2, Play, SearchX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePageMeta } from '../hooks';
import { cleanTitle, watchLinkFor } from '../lib/format';
import { EmptyState } from '../components/ui/States';
import Badge from '../components/ui/Badge';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'movies', label: 'Movies' },
  { key: 'series', label: 'Series' },
  { key: 'tamil', label: 'Tamil' },
];

/** Dedicated watchlist manager. */
export default function Watchlist() {
  usePageMeta('Watchlist — Streamda', 'Everything you saved to watch later.');
  const { watchlist, removeFromWatchlist, showToast } = useApp();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(
    () => (filter === 'all' ? watchlist : watchlist.filter((x) => (x.type || 'movies') === filter)),
    [watchlist, filter]
  );

  return (
    <div className="min-h-screen pb-20 pt-8 md:pt-14 px-4 md:px-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white font-display flex items-center gap-3">
            <Bookmark size={26} className="text-brand-400" /> Watchlist
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {watchlist.length} saved title{watchlist.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex gap-2" role="tablist" aria-label="Filter watchlist">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                filter === f.key
                  ? 'bg-brand-500 border-brand-400 text-white'
                  : 'bg-ink-800 border-ink-700 text-slate-300 hover:text-white hover:border-brand-500/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {watchlist.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          message="Browse the catalog and hit the + button on anything you want to watch later."
          action={
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-sm font-bold transition-colors"
            >
              Start browsing
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={`No ${filter} in your watchlist`}
          message="Try a different filter."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const title = cleanTitle(item.title);
            const link = item.link
              ? item.link.startsWith('/')
                ? item.link
                : watchLinkFor(item)
              : watchLinkFor(item, item.type || 'movies');
            return (
              <div
                key={item.id}
                className="group flex gap-4 p-3.5 rounded-2xl bg-ink-900/60 border border-ink-700/60 hover:border-brand-500/40 transition-all duration-200"
              >
                <Link
                  to={link}
                  className="relative w-20 shrink-0 aspect-[2/3] rounded-lg overflow-hidden bg-ink-800"
                >
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Bookmark size={18} />
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={18} className="text-white fill-current" />
                  </span>
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <Link
                      to={link}
                      className="text-sm font-bold text-white leading-snug line-clamp-2 hover:text-brand-300 transition-colors"
                    >
                      {title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge
                        tone={
                          item.type === 'tamil'
                            ? 'warning'
                            : item.type === 'series'
                              ? 'accent'
                              : 'brand'
                        }
                      >
                        {(item.type || 'movies').toUpperCase()}
                      </Badge>
                      {item.year && (
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {String(item.year).slice(0, 4)}
                        </span>
                      )}
                      {item.rating && (
                        <span className="text-[11px] text-amber-400 font-bold">
                          ★ {item.rating}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      removeFromWatchlist(item.id);
                      showToast(`Removed "${title}" from Watchlist`, 'info');
                    }}
                    className="self-start flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-red-400 transition-colors cursor-pointer mt-2"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
