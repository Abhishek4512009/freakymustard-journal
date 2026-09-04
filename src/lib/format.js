/**
 * Formatting & content helpers shared across the journal.
 */

/** Strip trailing "(2024)" year suffixes from scraped titles. */
export function cleanTitle(title = '') {
  return title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

/** Extract a 4-digit year from a scraped "Title (2024)" string. */
export function extractYear(title = '') {
  const m = title.match(/\((\d{4})\)/);
  return m ? m[1] : null;
}

/** Format seconds as h:mm:ss / mm:ss. */
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Clamp a number between min and max. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * True when a Tamil scrape row is really a navigation/collection link
 * ("Tamil 2024 Movies", "Moviesda Collections", …) rather than a film.
 */
export function isTamilNavigationItem(item) {
  const t = item?.title || '';
  return (
    t.startsWith('Tamil') ||
    t.includes('Movies') ||
    t.includes('Collection') ||
    t.includes('Movie List')
  );
}

/**
 * Build the internal watch route for any content item.
 * Single scheme: /watch/movie|series|tamil|tamil-series/:id
 */
export function watchLinkFor(item, type = 'movies') {
  if (item?.link) {
    const kind = item.kind === 'series' || type === 'tamil-series' ? 'tamil-series' : 'tamil';
    return `/watch/${kind}/${encodeURIComponent(item.link)}?title=${encodeURIComponent(item.title || '')}`;
  }
  const kind = type === 'series' ? 'series' : 'movie';
  return `/watch/${kind}/${item?.id}`;
}

/** Rating tone for the flat journal rating mark. high | mid | low */
export function ratingTone(rating) {
  const n = parseFloat(rating);
  if (!Number.isFinite(n)) return 'low';
  if (n >= 7.5) return 'high';
  if (n >= 6) return 'mid';
  return 'low';
}
