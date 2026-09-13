/**
 * Store abstrait pour rate-limit Field Recensement V1.
 *
 * Implémentation actuelle : mémoire processus (une instance).
 * DETTE multi-instance : brancher un store Redis partagé avant scaling horizontal.
 * Sans store distribué, chaque instance compte séparément → pas de garantie globale.
 */
import crypto from 'node:crypto';

/**
 * @typedef {{ allowed: boolean, remaining: number, retryAfterSeconds: number, totalHits: number }} RateLimitConsumeResult
 */

/**
 * @typedef {{
 *   consume: (key: string, limit: number, windowMs: number) => Promise<RateLimitConsumeResult> | RateLimitConsumeResult,
 *   reset?: (key?: string) => Promise<void> | void,
 *   kind: string,
 * }} FieldRecensementRateLimitStore
 */

/** Hash stable non réversible pour clé (jamais userId/téléphone/IP brut). */
export function hashRateLimitIdentity(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex').slice(0, 32);
}

/**
 * Store mémoire in-process.
 * @returns {FieldRecensementRateLimitStore}
 */
export function createMemoryRateLimitStore() {
  /** @type {Map<string, { count: number, resetAt: number }>} */
  const buckets = new Map();

  function prune(now) {
    if (buckets.size < 5000) return;
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }

  return {
    kind: 'memory',
    consume(key, limit, windowMs) {
      const now = Date.now();
      prune(now);
      let entry = buckets.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        buckets.set(key, entry);
      }
      entry.count += 1;
      const remaining = Math.max(0, limit - entry.count);
      if (entry.count > limit) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((entry.resetAt - now) / 1000),
        );
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds,
          totalHits: entry.count,
        };
      }
      return {
        allowed: true,
        remaining,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
        totalHits: entry.count,
      };
    },
    reset(key) {
      if (key) buckets.delete(key);
      else buckets.clear();
    },
  };
}

/** @type {FieldRecensementRateLimitStore | null} */
let activeStore = null;

export function getFieldRecensementRateLimitStore() {
  if (!activeStore) {
    activeStore = createMemoryRateLimitStore();
  }
  return activeStore;
}

/** Tests uniquement. */
export function injectFieldRecensementRateLimitStore(store) {
  activeStore = store;
}

export function resetFieldRecensementRateLimitStore() {
  activeStore = null;
}

export default {
  hashRateLimitIdentity,
  createMemoryRateLimitStore,
  getFieldRecensementRateLimitStore,
  injectFieldRecensementRateLimitStore,
  resetFieldRecensementRateLimitStore,
};
