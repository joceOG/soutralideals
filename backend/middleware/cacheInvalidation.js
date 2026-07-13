// Invalidation intelligente du cache
const memoryCache = new Map();

/**
 * Invalide le cache pour un pattern d'URL donné
 * @param {string} pattern - Pattern de l'URL à invalider (ex: '/api/service')
 */
export const invalidateCache = (pattern) => {
  let invalidatedCount = 0;

  for (const [key, value] of memoryCache.entries()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
      invalidatedCount++;
    }
  }

  console.log(`🗑️ Cache invalidé: ${invalidatedCount} entrée(s) pour pattern "${pattern}"`);
  return invalidatedCount;
};

/**
 * Middleware d'invalidation automatique du cache après POST/PUT/DELETE
 */
export const autoInvalidateCache = (req, res, next) => {
  // Ne rien faire pour les requêtes GET
  if (req.method === 'GET') {
    return next();
  }

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
        invalidateCache(basePath);
      }
    }

    return originalSend.call(this, data);
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
 * Cache simple avec invalidation
 */
export const smartCache = (duration = 300) => {
  return (req, res, next) => {
    // Seulement pour GET
    if (req.method !== 'GET') {
      return next();
    }

    if (shouldSkipCacheForGet(req)) {
      return next();
    }

    const key = `${req.method}:${req.originalUrl}`;
    const cached = memoryCache.get(key);

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

    next();
  };
};

export { memoryCache };