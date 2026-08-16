/**
 * Formatting & content helpers shared across the app.
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

/** Build the internal watch route for any content item. */
export function watchLinkFor(item, type = 'movies') {
  if (item?.link) {
    const base =
      item.kind === 'series' || type === 'tamil-series' ? '/watch/tamil-series' : '/watch/tamil';
    return `${base}/${encodeURIComponent(item.link)}?title=${encodeURIComponent(item.title || '')}`;
  }
  return `/watch/english/${type}/${item?.id}`;
}

/** Deterministic pseudo-rating color for badges. */
export function ratingColor(rating) {
  const n = parseFloat(rating);
  if (!Number.isFinite(n)) return 'text-slate-400';
  if (n >= 8) return 'text-emerald-400';
  if (n >= 6.5) return 'text-amber-400';
  return 'text-orange-400';
}
