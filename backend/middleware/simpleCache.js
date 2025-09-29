// Cache simple en mémoire (sans Redis)
const memoryCache = new Map();

export const simpleCache = (duration = 300) => {
  return (req, res, next) => {
    const key = `${req.method}:${req.originalUrl}`;
    const cached = memoryCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < duration * 1000) {
      return res.json(cached.data);
    }
    
    // Intercepter la réponse pour la mettre en cache
    const originalSend = res.json;
    res.json = function(data) {
      memoryCache.set(key, {
        data: data,
        timestamp: Date.now()
      });
      
      // Nettoyer le cache après 1 heure
      setTimeout(() => {
        memoryCache.delete(key);
      }, 3600000);
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

export default simpleCache;

