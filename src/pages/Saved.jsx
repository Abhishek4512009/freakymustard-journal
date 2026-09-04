import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContinueLedger } from '../components/Shelf';
import { Empty } from '../components/Notices';
import { usePageMeta } from '../hooks';
import { useApp } from '../context/AppContext';
import { cleanTitle } from '../lib/format';

const FILTERS = [
  { key: 'all', label: 'Everything' },
  { key: 'movies', label: 'Films' },
  { key: 'series', label: 'Series' },
  { key: 'tamil', label: 'Tamil' },
];

/**
 * Saved: one reader's list. Watchlist rows + continue-reading ledger.
 * Replaces the old Watchlist page and the multi-profile My Space.
 */
export default function Saved() {
  usePageMeta(
    'Saved — FreakyMustard',
    'Your list and your reading history. Kept in this browser only.'
  );
  const { watchlist, removeFromWatchlist, continueWatching, removeProgress, showToast } = useApp();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(
    () => (filter === 'all' ? watchlist : watchlist.filter((x) => (x.type || 'movies') === filter)),
    [watchlist, filter]
  );

  const finished = continueWatching.filter((x) => (x.progress || 0) >= 95).length;

  return (
    <div className="fm-main">
      <div className="fm-index-head">
        <p className="fm-kicker">Your copy</p>
        <h1 className="fm-index-title">Saved</h1>
        <p className="fm-index-dek">
          {watchlist.length} saved · {continueWatching.length} in progress
          {finished > 0 ? ` · ${finished} finished` : ''}. Everything below lives in this browser —
          no accounts, no tracking.
        </p>
      </div>

      {continueWatching.length > 0 && (
        <section aria-label="Continue reading">
          <h2 className="fm-rule-head">Continue reading</h2>
          <ContinueLedger items={continueWatching} />
          <p className="fm-search-meta">
            Embedded prints are marked “opened”; direct streams keep your exact page.
          </p>
        </section>
      )}

      <section aria-label="Your list">
        <h2 className="fm-rule-head">Your list</h2>
        <nav className="fm-filters" aria-label="Filter your list">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="fm-filter"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </nav>

        {watchlist.length === 0 ? (
          <Empty
            title="A blank page."
            message="Browse the catalogue and save anything worth an evening."
            action={
              <Link to="/" className="fm-btn">
                Open the front page
              </Link>
            }
          />
        ) : filtered.length === 0 ? (
          <Empty title={`Nothing saved under ${filter}.`} message="Try a different shelf." />
        ) : (
          <ul className="fm-ledger">
            {filtered.map((item, i) => {
              const title = cleanTitle(item.title);
              const to = item.watchLink || '#';
              return (
                <li key={item.id || i}>
                  <div className="fm-saved-row" style={{ border: 0, padding: '12px 2px' }}>
                    {item.poster ? (
                      <img src={item.poster} alt="" loading="lazy" className="fm-saved-thumb" />
                    ) : (
                      <span className="fm-saved-thumb fm-saved-thumb--empty">No still</span>
                    )}
                    <span>
                      <span className="fm-saved-title">
                        <Link to={to}>{title}</Link>
                      </span>
                      <span className="fm-saved-meta" style={{ display: 'block' }}>
                        {String(i + 1).padStart(2, '0')} · {(item.type || 'film').toUpperCase()}
                        {item.year ? ` · ${String(item.year).slice(0, 4)}` : ''}
                        {item.rating ? ` · ★ ${item.rating}` : ''}
                      </span>
                    </span>
                    <span style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <Link to={to} className="fm-textlink">
                        Open →
                      </Link>
                      <button
                        type="button"
                        className="fm-remove"
                        onClick={() => {
                          removeFromWatchlist(item.id);
                          removeProgress(item.id);
                          showToast(`Removed “${title}”`, 'info');
                        }}
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
