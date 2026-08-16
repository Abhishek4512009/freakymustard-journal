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
const PROXY_BASE = (
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
