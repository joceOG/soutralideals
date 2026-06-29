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
    if (res.statusCode >= 200 && res.statusCode < 300 && !res.locals._cacheInvalidatedOnce) {
      res.locals._cacheInvalidatedOnce = true;
      const parts = req.originalUrl.split('?')[0].split('/');
      const basePath = parts.length > 3 ? parts.slice(0, 3).join('/') : req.originalUrl.split('?')[0];

      if (!shouldSkipInvalidateForBasePath(basePath)) {
        if (CACHE_DEBUG) {
          console.log(`🔄 Auto-invalidation: ${req.method} ${req.originalUrl} -> ${basePath}`);
        }
        invalidateCache(basePath);
      }
    }

    return originalJson(data);
  };

  next();
};

/** GET sans cache (auth, données utilisateur, temps réel). */
const SKIP_CACHE_PATH_PREFIXES = [
  '/api/prestataire',
  '/api/utilisateur',
  '/api/notifications',
  '/api/notification',
  '/api/message',
  '/api/messages',
  '/api/cart',
  '/api/prestations',
  '/api/prestation',
  '/api/commandes',
  '/api/commande',
  '/api/paiements',
  '/api/paiement',
  '/api/favorites',
  '/api/wallet',
  '/api/maps',
];

function shouldSkipCacheForGet(req) {
  if (req.headers.authorization) {
    return true;
  }
  const path = req.originalUrl.split('?')[0];
  return SKIP_CACHE_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function shouldSkipInvalidateForBasePath(basePath) {
  return SKIP_CACHE_PATH_PREFIXES.some(
    (prefix) => basePath === prefix || basePath.startsWith(`${prefix}/`),
  );
}

function settleInflight(key, payload) {
  const entry = inflightGets.get(key);
  inflightGets.delete(key);
  entry?.waiters.forEach((notify) => {
    try {
      notify(payload);
    } catch {
      /* ignore */
    }
  });
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
