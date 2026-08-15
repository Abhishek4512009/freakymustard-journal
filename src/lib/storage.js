/**
 * Safe localStorage wrapper.
 * Never throws (private mode / quota / SSR) and namespaces all keys.
 */

const NS = 'streamda:v2:';

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(NS + key);
    } catch {
      /* noop */
    }
  },
};

/**
 * Migrate v1 keys (streamda_watchlist / streamda_continue) into v2
 * so existing users keep their data after the overhaul.
 */
export function migrateV1() {
  try {
    const legacyWatch = localStorage.getItem('streamda_watchlist');
    if (legacyWatch && !localStorage.getItem(NS + 'watchlist')) {
      storage.set('watchlist', JSON.parse(legacyWatch));
      localStorage.removeItem('streamda_watchlist');
    }
    const legacyCont = localStorage.getItem('streamda_continue');
    if (legacyCont && !localStorage.getItem(NS + 'continue')) {
      storage.set('continue', JSON.parse(legacyCont));
      localStorage.removeItem('streamda_continue');
    }
  } catch {
    /* best effort */
  }
}
