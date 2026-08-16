/**
 * Safe localStorage wrapper.
 * Never throws (private mode / quota / SSR) and namespaces all keys.
 */

const NS = 'freakymustard:v2:';

// Previous namespace (the app was branded "Streamda" before). Kept so we can
// migrate existing users' data forward without losing watchlists/progress.
const LEGACY_NS = 'streamda:v2:';

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
 * Migrate legacy keys into the current namespace so existing users keep
 * their data across rebrands/overhauls:
 *  - v1 keys: streamda_watchlist / streamda_continue (pre-v2 overhaul)
 *  - old v2 namespace: streamda:v2:* -> freakymustard:v2:* (rebrand)
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

  // Rebrand migration: copy every streamda:v2:* key into the new namespace
  // (only if the new key doesn't exist yet), then drop the old keys.
  try {
    const toMigrate = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LEGACY_NS)) toMigrate.push(k);
    }
    for (const k of toMigrate) {
      const newKey = NS + k.slice(LEGACY_NS.length);
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, localStorage.getItem(k));
      }
      localStorage.removeItem(k);
    }
  } catch {
    /* best effort */
  }
}
