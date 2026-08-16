/**
 * FreakyMustard HTTP layer.
 *
 * Production concerns handled here:
 *  - Render free-tier cold starts can take 30-50s: generous first-attempt
 *    timeout + automatic retry with backoff.
 *  - Request deduplication: identical in-flight GETs share one fetch.
 *  - Small TTL cache: shelves re-render instantly on back-navigation and
 *    we stop hammering the backend on every route change.
 *  - AbortController support for component unmounts.
 */

const DEFAULT_TIMEOUT = 45_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 1_200;

/** In-flight GET dedup: url -> Promise */
const inflight = new Map();

/** TTL cache: url -> { data, expires } */
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX = 120;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cacheGet(url) {
  const hit = cache.get(url);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    cache.delete(url);
    return undefined;
  }
  return hit.data;
}

function cacheSet(url, data) {
  if (cache.size >= CACHE_MAX) {
    // Evict oldest entry (Map preserves insertion order)
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(url, { data, expires: Date.now() + CACHE_TTL });
}

/** Drop cached entries (e.g. pull-to-refresh semantics). */
export function invalidateCache(prefix = '') {
  for (const key of [...cache.keys()]) {
    if (!prefix || key.startsWith(prefix)) cache.delete(key);
  }
}

/**
 * Fetch JSON with timeout, retries and dedup.
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.timeout]
 * @param {AbortSignal} [options.signal]
 * @param {boolean} [options.cache] default true for GET
 * @param {number} [options.retries]
 */
export async function fetchJson(url, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    signal,
    cache: useCache = true,
    retries = MAX_RETRIES,
  } = options;

  if (useCache) {
    const cached = cacheGet(url);
    if (cached !== undefined) return cached;
  }

  // Dedup identical in-flight requests
  if (inflight.has(url)) return inflight.get(url);

  const attempt = async () => {
    let lastError;
    for (let i = 0; i <= retries; i++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort('timeout'), timeout);

      // Chain external abort signal into our controller
      const onExternalAbort = () => controller.abort(signal?.reason);
      if (signal) {
        if (signal.aborted) controller.abort(signal.reason);
        else signal.addEventListener('abort', onExternalAbort, { once: true });
      }

      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? 'Content not found on server.'
              : `Server responded with ${res.status}.`
          );
        }
        const data = await res.json();
        if (useCache) cacheSet(url, data);
        return data;
      } catch (err) {
        lastError = err;
        const abortedByCaller = signal?.aborted;
        if (abortedByCaller) throw err; // caller unmounted — don't retry
        if (i < retries) {
          // Cold start or transient failure — back off and retry.
          await sleep(RETRY_BASE_DELAY * (i + 1));
        }
      } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onExternalAbort);
      }
    }
    throw normalizeError(lastError);
  };

  const promise = attempt().finally(() => inflight.delete(url));
  inflight.set(url, promise);
  return promise;
}

function normalizeError(err) {
  if (!err) return new Error('Network request failed.');
  if (err === 'timeout' || err?.name === 'AbortError') {
    return new Error(
      'The server took too long to respond. It may be waking up from sleep — please try again in a few seconds.'
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}
