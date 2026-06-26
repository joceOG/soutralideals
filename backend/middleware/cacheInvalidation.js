// Invalidation intelligente du cache
const memoryCache = new Map();
/** @type {Map<string, { waiters: Array<(payload: unknown) => void> }>} */
const inflightGets = new Map();

const CACHE_DEBUG = process.env.CACHE_DEBUG === 'true';

export const invalidateCache = (pattern) => {
  let invalidatedCount = 0;

  for (const [key] of memoryCache.entries()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
      invalidatedCount++;
    }
  }

  if (CACHE_DEBUG && invalidatedCount > 0) {
    console.log(`🗑️ Cache invalidé: ${invalidatedCount} entrée(s) pour pattern "${pattern}"`);
  }
  return invalidatedCount;
};

export const autoInvalidateCache = (req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (data) {
    // Si la requête a réussi (status 2xx), invalider le cache
    if (res.statusCode >= 200 && res.statusCode < 300 && !res.locals._cacheInvalidatedOnce) {
      res.locals._cacheInvalidatedOnce = true;
      // Extraire le path de base (ex: /api/service/123 -> /api/service)
      const parts = req.originalUrl.split('?')[0].split('/');
      const basePath = parts.length > 3 ? parts.slice(0, 3).join('/') : req.originalUrl.split('?')[0];

      if (!shouldSkipInvalidateForBasePath(basePath)) {
        console.log(`🔄 Auto-invalidation pour: ${req.method} ${req.originalUrl} -> Paterne: ${basePath}`);
        invalidateCache(basePath);
      }
    }

    return originalJson(data);
  };

  next();
};

/** GET sous ce préfixe : pas de cache (liste souvent modifiée ; plusieurs stacks /api empilaient la même clé). */
const SKIP_CACHE_PATH_PREFIXES = ['/api/prestataire', '/api/utilisateur', '/api/notifications'];

function shouldSkipCacheForGet(req) {
  const path = req.originalUrl.split('?')[0];
  return SKIP_CACHE_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

/** Pas d’invalidation sur ces collections : elles ne sont plus cachées (évite logs « 0 entrée » inutiles). */
function shouldSkipInvalidateForBasePath(basePath) {
  return (
    basePath === '/api/prestataire' ||
    basePath === '/api/utilisateur' ||
    basePath === '/api/notifications'
  );
}

/**
 * Cache mémoire avec déduplication des requêtes GET concurrentes (routes publiques uniquement)
 */
export const smartCache = (duration = 300) => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    if (shouldSkipCacheForGet(req)) {
      return next();
    }

    const key = `${req.method}:${req.originalUrl}`;
    const cached = memoryCache.get(key);

    if (cached && Date.now() - cached.timestamp < duration * 1000) {
      if (CACHE_DEBUG) console.log(`✅ Cache HIT: ${key}`);
      return res.json(cached.data);
    }

    const inflight = inflightGets.get(key);
    if (inflight) {
      inflight.waiters.push((payload) => {
        if (payload === null) {
          next();
        } else {
          res.json(payload);
        }
      });
      return;
    }

    if (CACHE_DEBUG) console.log(`❌ Cache MISS: ${key}`);

    inflightGets.set(key, { waiters: [] });

    const originalJson = res.json.bind(res);
    res.json = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(key, { data, timestamp: Date.now() });
        setTimeout(() => memoryCache.delete(key), (duration + 3600) * 1000);
        settleInflight(key, data);
      } else {
        settleInflight(key, null);
      }

      return originalJson(data);
    };

    res.on('close', () => {
      if (inflightGets.has(key) && !res.writableFinished) {
        settleInflight(key, null);
      }
    });

    next();
  };
};

export { memoryCache };