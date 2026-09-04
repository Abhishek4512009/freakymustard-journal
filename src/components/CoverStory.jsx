import { Link } from 'react-router-dom';
import { Check, Play, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cleanTitle, watchLinkFor } from '../lib/format';

/**
 * Cover story: one featured title, set like a magazine opener.
 * No rotation, no crossfade — a single opinion per page load.
 */
export default function CoverStory({ item, type = 'movies' }) {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist, showToast } = useApp();

  if (!item) {
    return (
      <section className="fm-cover" aria-label="Featured title">
        <div>
          <p className="fm-kicker">The cover story</p>
          <h1 className="fm-cover-title">This week at the pictures.</h1>
          <p className="fm-standfirst">
            English features, long-form series and the newest Tamil releases — indexed below.
          </p>
        </div>
      </section>
    );
  }

  const id = item.id || item.link;
  const title = cleanTitle(item.title);
  const link = watchLinkFor(item, type);
  const saved = isInWatchlist(id);

  const toggleSaved = () => {
    if (saved) {
      removeFromWatchlist(id);
      showToast(`Removed “${title}” from your list`, 'info');
    } else {
      addToWatchlist({
        id,
        title: item.title,
        type: item.link ? 'tamil' : type,
        poster: item.poster || item.backdrop,
        year: item.year,
        rating: item.rating,
        link: item.link,
      });
      showToast(`Saved “${title}”`, 'success');
    }
  };

  return (
    <section className="fm-cover" aria-label="Featured title">
      <figure className="fm-cover-figure">
        {(item.backdrop || item.poster) && (
          <img src={item.backdrop || item.poster} alt="" loading="eager" />
        )}
        <figcaption>
          {title}
          {item.year ? ` — ${item.year}` : ''}
        </figcaption>
      </figure>
      <div>
        <p className="fm-kicker">The cover story</p>
        <h1 className="fm-cover-title">{title}</h1>
        <p className="fm-byline">
          {item.year && <span>{item.year}</span>}
          {item.rating && <span>Rated {item.rating}</span>}
          {item.runtime && <span>{item.runtime}</span>}
          {item.genres?.length > 0 && <span>{item.genres.slice(0, 3).join(' · ')}</span>}
        </p>
        <p className="fm-standfirst">
          {item.description || 'Our editors’ pick from this week’s catalogue — now showing.'}
        </p>
        <div className="fm-cover-actions">
          <Link to={link} className="fm-btn">
            <Play size={14} /> Watch
          </Link>
          <button
            type="button"
            onClick={toggleSaved}
            className="fm-btn fm-btn--plain"
            aria-pressed={saved}
          >
            {saved ? <Check size={14} /> : <Plus size={14} />} {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </section>
  );
}
