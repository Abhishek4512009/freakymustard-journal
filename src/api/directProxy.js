import { fetchJson } from '../lib/http';

/**
 * FreakyMustard Direct — our own ad-free HLS resolution proxy.
 *
 * The proxy (a FastAPI service on Hugging Face Spaces) resolves clean HLS
 * streams from the VidSrc API and relays every byte through a signed,
 * stateless byte-proxy. The browser never touches the provider's ad-laden
 * page, and the CDN's Cloudflare WAF (which 403s any request carrying an
 * Origin/Referer header) is satisfied because the proxy sends neither.
 *
 * Override the base with VITE_DIRECT_PROXY if you self-host the proxy
 * (VITE_STREAMDA_PROXY is still honoured for backward compatibility).
 */
export const PROXY_BASE = (
  import.meta.env.VITE_DIRECT_PROXY ||
  import.meta.env.VITE_STREAMDA_PROXY ||
  'https://freakymustard67-potato.hf.space'
).replace(/\/$/, '');

/**
 * Resolve direct HLS sources for a title.
 *
 * @param {object} args
 * @param {'movies'|'series'} args.type
 * @param {string} args.imdbId  e.g. "tt1375666"
 * @param {number} [args.season]  required for series
 * @param {number} [args.episode] required for series
 * @param {AbortSignal} [signal]
 * @returns {Promise<{provider:string, title:string, sources:Array<{label:string,url:string,format:string}>}>}
 */
export function resolveDirect({ type, imdbId, season, episode }, signal) {
  const path =
    type === 'movies'
      ? `/resolve/movie/${encodeURIComponent(imdbId)}`
      : `/resolve/tv/${encodeURIComponent(imdbId)}/${season}/${episode}`;
  return fetchJson(`${PROXY_BASE}${path}`, { signal, cache: true });
}

/**
 * Build a single-file download URL for a Direct source.
 *
 * The proxy's /download endpoint takes the same signed token as /hls, picks
 * the best variant server-side and streams one MPEG-TS attachment, so the
 * browser saves it natively instead of buffering a movie-sized blob.
 *
 * @param {string} sourceUrl  a Direct source url (`…/hls/{token}`)
 * @param {string} [filename] download name (server sanitizes + adds .ts)
 * @returns {string|null} null when the url isn't a proxy /hls link
 */
export function buildDownloadUrl(sourceUrl, filename = 'video') {
  const match = /^(.*\/)hls\/([^/?#]+)/.exec(sourceUrl || '');
  if (!match) return null;
  const clean = filename
    .replace(/[^A-Za-z0-9._() -]/g, '')
    .trim()
    .slice(0, 120);
  return `${match[1]}download/${match[2]}?filename=${encodeURIComponent(clean || 'video')}`;
}
