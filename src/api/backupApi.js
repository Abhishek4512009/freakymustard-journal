import { fetchJson } from '../lib/http';
import { PROXY_BASE } from './directProxy';

/**
 * FreakyMustard Backup — the freaky-backup Stremio-aggregator sidecar,
 * proxied through our backend origin so it stays single-origin (CORS) and so
 * the torrent→direct engine URLs are rewritten to be browser-reachable.
 *
 * Unlike Direct (HLS via hls.js), backup sources are *progressive* files
 * (MP4/MKV) that a plain <video> tag can play — no hls.js needed.
 */

/**
 * Resolve backup (progressive) sources for a title.
 *
 * @param {object} args
 * @param {'movie'|'series'} args.type
 * @param {string} args.imdbId  e.g. "tt1375666"
 * @param {number} [args.season]  required for series
 * @param {number} [args.episode] required for series
 * @param {'english'|'tamil'} [args.instance]  which freaky-backup to query
 * @param {AbortSignal} [signal]
 * @returns {Promise<{provider:string, mediaType:string, sources:Array<{url,label,format,quality}>, torrents:Array}>}
 */
export function resolveBackup({ type, imdbId, season, episode, instance = 'english' }, signal) {
  const params = new URLSearchParams({ type, id: imdbId, instance });
  if (type === 'series') {
    params.set('season', String(season ?? 1));
    params.set('episode', String(episode ?? 1));
  }
  return fetchJson(`${PROXY_BASE}/api/backup/streams?${params.toString()}`, { signal });
}
