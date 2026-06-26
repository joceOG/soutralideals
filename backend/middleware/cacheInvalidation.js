// Invalidation intelligente du cache
const memoryCache = new Map();
<<<<<<< HEAD
/** @type {Map<string, { waiters: Array<(payload: unknown) => void> }>} */
const inflightGets = new Map();

const CACHE_DEBUG = process.env.CACHE_DEBUG === 'true';

export const invalidateCache = (pattern) => {
  let invalidatedCount = 0;

  for (const [key] of memoryCache.entries()) {
=======

/**
 * Invalide le cache pour un pattern d'URL donné
 * @param {string} pattern - Pattern de l'URL à invalider (ex: '/api/service')
 */
export const invalidateCache = (pattern) => {
  let invalidatedCount = 0;

  for (const [key, value] of memoryCache.entries()) {
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
    if (key.includes(pattern)) {
      memoryCache.delete(key);
      invalidatedCount++;
    }
  }

<<<<<<< HEAD
  if (CACHE_DEBUG && invalidatedCount > 0) {
    console.log(`🗑️ Cache invalidé: ${invalidatedCount} entrée(s) pour pattern "${pattern}"`);
  }
  return invalidatedCount;
};

export const autoInvalidateCache = (req, res, next) => {
=======
  console.log(`🗑️ Cache invalidé: ${invalidatedCount} entrée(s) pour pattern "${pattern}"`);
  return invalidatedCount;
};

/**
 * Middleware d'invalidation automatique du cache après POST/PUT/DELETE
 */
export const autoInvalidateCache = (req, res, next) => {
  // Ne rien faire pour les requêtes GET
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
  if (req.method === 'GET') {
    return next();
  }

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

  res.json = function (data) {
    // Si la requête a réussi (status 2xx), invalider le cache
    if (res.statusCode >= 200 && res.statusCode < 300 && !res.locals._cacheInvalidatedOnce) {
      res.locals._cacheInvalidatedOnce = true;
      // Extraire le path de base (ex: /api/service/123 -> /api/service)
      const parts = req.originalUrl.split('?')[0].split('/');
      // Si on a un ID à la fin (ex: /api/service/123), on l'enlève
      // Si c'est juste /api/service, on garde tout
      const basePath = parts.length > 3 ? parts.slice(0, 3).join('/') : req.originalUrl.split('?')[0];

      if (!shouldSkipInvalidateForBasePath(basePath)) {
        console.log(`🔄 Auto-invalidation pour: ${req.method} ${req.originalUrl} -> Paterne: ${basePath}`);
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
        invalidateCache(basePath);
      }
    }

<<<<<<< HEAD
    return originalJson(data);
=======
    return originalSend.call(this, data);
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
  };

  next();
};

<<<<<<< HEAD
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
=======
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
 * Cache simple avec invalidation
 */
export const smartCache = (duration = 300) => {
  return (req, res, next) => {
    // Seulement pour GET
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
    if (req.method !== 'GET') {
      return next();
    }

    if (shouldSkipCacheForGet(req)) {
      return next();
    }

    const key = `${req.method}:${req.originalUrl}`;
    const cached = memoryCache.get(key);

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
    if (cached && Date.now() - cached.timestamp < duration * 1000) {
      console.log(`✅ Cache HIT: ${key}`);
      return res.json(cached.data);
    }

    console.log(`❌ Cache MISS: ${key}`);

    // Intercepter la réponse pour la mettre en cache
    const originalSend = res.json;
    res.json = function (data) {
      memoryCache.set(key, {
        data: data,
        timestamp: Date.now()
      });

      // Nettoyer le cache après expiration + 1 heure
      setTimeout(() => {
        memoryCache.delete(key);
      }, (duration + 3600) * 1000);

      return originalSend.call(this, data);
    };

>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
    next();
  };
};

export { memoryCache };
