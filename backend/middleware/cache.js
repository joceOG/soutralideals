import { Redis } from 'ioredis';
import logger from './logger.js';

// 🔧 Configuration Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// 📊 Statistiques du cache
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
};

// 🎯 Middleware de cache pour les requêtes GET
export const cacheMiddleware = (ttl = 300) => { // TTL par défaut: 5 minutes
  return async (req, res, next) => {
    // Seulement pour les requêtes GET
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const cacheKey = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;
      
      // 🔍 Vérifier si la donnée est en cache
      const cachedData = await redis.get(cacheKey);
      
      if (cachedData) {
        cacheStats.hits++;
        logger.info(`Cache HIT for key: ${cacheKey}`);
        
        return res.json(JSON.parse(cachedData));
      }
      
      cacheStats.misses++;
      logger.info(`Cache MISS for key: ${cacheKey}`);
      
      // 💾 Intercepter la réponse pour la mettre en cache
      const originalSend = res.send;
      res.send = function(data) {
        // Mettre en cache seulement si la réponse est valide
        if (res.statusCode === 200) {
          redis.setex(cacheKey, ttl, data)
            .then(() => {
              cacheStats.sets++;
              logger.info(`Data cached with key: ${cacheKey}, TTL: ${ttl}s`);
            })
            .catch(err => {
              logger.error('Redis SET error:', err);
            });
        }
        
        return originalSend.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next(); // Continuer sans cache en cas d'erreur
    }
  };
};

// 🗑️ Fonction pour invalider le cache
export const invalidateCache = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      cacheStats.deletes += keys.length;
      logger.info(`Cache invalidated for pattern: ${pattern}, ${keys.length} keys deleted`);
    }
  } catch (error) {
    logger.error('Cache invalidation error:', error);
  }
};

// 🔄 Fonction pour invalider le cache d'un utilisateur spécifique
export const invalidateUserCache = async (userId) => {
  const patterns = [
    `cache:*user*${userId}*`,
    `cache:*utilisateur*${userId}*`,
    `cache:*profile*${userId}*`,
  ];
  
  for (const pattern of patterns) {
    await invalidateCache(pattern);
  }
};

// 📊 Fonction pour obtenir les statistiques du cache
export const getCacheStats = () => {
  return {
    ...cacheStats,
    hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0,
    total: cacheStats.hits + cacheStats.misses,
  };
};

// 🧹 Fonction pour nettoyer le cache expiré
export const cleanExpiredCache = async () => {
  try {
    // Redis gère automatiquement l'expiration, mais on peut forcer un nettoyage
    await redis.eval(`
      local keys = redis.call('keys', 'cache:*')
      local cleaned = 0
      for i=1,#keys do
        if redis.call('ttl', keys[i]) == -1 then
          redis.call('del', keys[i])
          cleaned = cleaned + 1
        end
      end
      return cleaned
    `, 0);
    
    logger.info('Cache cleanup completed');
  } catch (error) {
    logger.error('Cache cleanup error:', error);
  }
};

// 🔧 Middleware pour les sessions utilisateur
export const sessionCache = async (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '');
    const sessionKey = `session:${token}`;
    
    try {
      const sessionData = await redis.get(sessionKey);
      if (sessionData) {
        req.session = JSON.parse(sessionData);
      }
    } catch (error) {
      logger.error('Session cache error:', error);
    }
  }
  
  next();
};

// 💾 Fonction pour sauvegarder une session
export const saveSession = async (token, sessionData, ttl = 3600) => {
  try {
    await redis.setex(`session:${token}`, ttl, JSON.stringify(sessionData));
    logger.info(`Session saved for token: ${token.substring(0, 10)}...`);
  } catch (error) {
    logger.error('Session save error:', error);
  }
};

// 🗑️ Fonction pour supprimer une session
export const deleteSession = async (token) => {
  try {
    await redis.del(`session:${token}`);
    logger.info(`Session deleted for token: ${token.substring(0, 10)}...`);
  } catch (error) {
    logger.error('Session delete error:', error);
  }
};

// 📈 Middleware pour les métriques de cache
export const cacheMetrics = (req, res, next) => {
  if (req.path === '/cache/stats') {
    return res.json({
      cache: getCacheStats(),
      redis: {
        status: redis.status,
        connected: redis.status === 'ready',
      },
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

export default redis;