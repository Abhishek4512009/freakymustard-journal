import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cleanTitle, extractYear, ratingTone, watchLinkFor } from '../lib/format';

/**
 * Title card: bordered still, ruled caption. No hover zoom, no overlays.
 */
export default function TitleCard({ item, type = 'movies' }) {
  const [failed, setFailed] = useState(false);

  const title = cleanTitle(item.title);
  const year = item.year || extractYear(item.title);
  const link = watchLinkFor(item, type);

  return (
    <Link to={link} aria-label={`Watch ${title}`} className="fm-card">
      <span className="fm-card-still">
        {item.poster && !failed ? (
          <img
            src={item.poster}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="fm-card-fallback">{title}</span>
        )}
      </span>
      <span className="fm-card-body">
        <span className="fm-card-title">{title}</span>
        <span className="fm-card-meta">
          {item.rating && (
            <span className={`fm-rate fm-rate--${ratingTone(item.rating)}`}>★ {item.rating}</span>
          )}
          <span>{year || 'HD'}</span>
        </span>
      </span>
    </Link>
  );
}
