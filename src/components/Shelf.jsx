import { Link } from 'react-router-dom';
import TitleCard from './TitleCard';
import { cleanTitle } from '../lib/format';

/** Numbered section head with optional index link. */
export function Section({ no, title, to, count, children }) {
  return (
    <section className="fm-section" aria-label={title}>
      <div className="fm-section-head">
        <h2 className="fm-section-title">
          <span className="fm-section-no">{no}</span>
          {title}
        </h2>
        <span className="fm-section-count">
          {count != null ? `${count} titles` : ''}
          {to ? (
            <>
              {'  ·  '}
              <Link to={to} className="fm-textlink">
                Full index →
              </Link>
            </>
          ) : null}
        </span>
      </div>
      {children}
    </section>
  );
}

/** Flat poster grid shelf. */
export function Shelf({ items = [], type = 'movies', strip = false }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className={strip ? 'fm-shelf--strip' : 'fm-shelf'}>
      {items.map((m, i) => (
        <li key={m.id || m.link || i}>
          <TitleCard item={m} type={type} />
        </li>
      ))}
    </ul>
  );
}

/** Continue-reading ledger: numbered rows with a progress rule. */
export function ContinueLedger({ items = [] }) {
  if (!items || items.length === 0) return null;
  return (
    <ol className="fm-ledger">
      {items.map((item, i) => {
        const to = item._watchLink || item.watchLink || '#';
        const ep =
          item.type === 'series' && item.season != null
            ? ` — S${item.season} E${item.episode}`
            : '';
        return (
          <li key={item.id || i}>
            <Link to={to} aria-label={`Resume ${cleanTitle(item.title)}`}>
              <span className="fm-ledger-idx">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="fm-ledger-title">{cleanTitle(item.title)}</span>
                <span className="fm-ledger-sub">
                  {(item.type || 'film').toUpperCase()}
                  {ep}
                  {item.progress != null ? ` · ${item.progress}% read` : ' · opened'}
                </span>
                {item.progress != null && (
                  <span className="fm-progress-rule" aria-hidden="true">
                    <i style={{ width: `${Math.min(100, Math.max(2, item.progress))}%` }} />
                  </span>
                )}
              </span>
              <span className="fm-ledger-idx">→</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
