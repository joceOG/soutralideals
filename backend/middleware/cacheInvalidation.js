// Invalidation intelligente du cache
const memoryCache = new Map();
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
/** @type {Map<string, { waiters: Array<(payload: unknown) => void> }>} */
const inflightGets = new Map();

const CACHE_DEBUG = process.env.CACHE_DEBUG === 'true';
<<<<<<< HEAD

export const invalidateCache = (pattern) => {
  let invalidatedCount = 0;

  for (const [key] of memoryCache.entries()) {
=======
=======
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

export const invalidateCache = (pattern) => {
  let invalidatedCount = 0;

<<<<<<< HEAD
  for (const [key, value] of memoryCache.entries()) {
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
  for (const [key] of memoryCache.entries()) {
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    if (key.includes(pattern)) {
      memoryCache.delete(key);
      invalidatedCount++;
    }
  }

<<<<<<< HEAD
<<<<<<< HEAD
  if (CACHE_DEBUG && invalidatedCount > 0) {
    console.log(`🗑️ Cache invalidé: ${invalidatedCount} entrée(s) pour pattern "${pattern}"`);
  }
  return invalidatedCount;
};

export const autoInvalidateCache = (req, res, next) => {
=======
  console.log(`🗑️ Cache invalidé: ${invalidatedCount} entrée(s) pour pattern "${pattern}"`);
=======
  if (CACHE_DEBUG && invalidatedCount > 0) {
    console.log(`🗑️ Cache invalidé: ${invalidatedCount} entrée(s) pour pattern "${pattern}"`);
  }
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
  return invalidatedCount;
};

export const autoInvalidateCache = (req, res, next) => {
<<<<<<< HEAD
  // Ne rien faire pour les requêtes GET
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
  if (req.method === 'GET') {
    return next();
  }

<<<<<<< HEAD
<<<<<<< HEAD
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
=======
  // Intercepter la réponse
  const originalSend = res.json;
=======
  const originalJson = res.json.bind(res);
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

  res.json = function (data) {
    if (res.statusCode >= 200 && res.statusCode < 300 && !res.locals._cacheInvalidatedOnce) {
      res.locals._cacheInvalidatedOnce = true;
      const parts = req.originalUrl.split('?')[0].split('/');
      const basePath = parts.length > 3 ? parts.slice(0, 3).join('/') : req.originalUrl.split('?')[0];

      if (!shouldSkipInvalidateForBasePath(basePath)) {
<<<<<<< HEAD
        console.log(`🔄 Auto-invalidation pour: ${req.method} ${req.originalUrl} -> Paterne: ${basePath}`);
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        if (CACHE_DEBUG) {
          console.log(`🔄 Auto-invalidation: ${req.method} ${req.originalUrl} -> ${basePath}`);
        }
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
        invalidateCache(basePath);
      }
    }

<<<<<<< HEAD
<<<<<<< HEAD
    return originalJson(data);
=======
    return originalSend.call(this, data);
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
    return originalJson(data);
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
  };

  next();
};

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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
<<<<<<< HEAD

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
=======
/** GET sous ce préfixe : pas de cache (liste souvent modifiée ; plusieurs stacks /api empilaient la même clé). */
const SKIP_CACHE_PATH_PREFIXES = ['/api/prestataire', '/api/utilisateur', '/api/notifications'];
=======
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

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
<<<<<<< HEAD
    // Seulement pour GET
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    if (req.method !== 'GET') {
      return next();
    }

    if (shouldSkipCacheForGet(req)) {
      return next();
    }

    const key = `${req.method}:${req.originalUrl}`;
    const cached = memoryCache.get(key);

<<<<<<< HEAD
<<<<<<< HEAD
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

=======
    // Si cache valide, retourner
=======
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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

<<<<<<< HEAD
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
    res.on('close', () => {
      if (inflightGets.has(key) && !res.writableFinished) {
        settleInflight(key, null);
      }
    });

>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    next();
  };
};

export { memoryCache };
