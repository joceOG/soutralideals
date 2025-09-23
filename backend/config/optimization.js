// 🚀 CONFIGURATION DES OPTIMISATIONS - SOUTRALI DEALS

export const optimizationConfig = {
  // 🛡️ SÉCURITÉ
  security: {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requêtes par fenêtre
      authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5, // 5 tentatives d'auth
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    },
  },

  // 💾 CACHE
  cache: {
    enabled: process.env.ENABLE_CACHE === 'true' || true,
    defaultTTL: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    },
    ttl: {
      users: 300, // 5 minutes
      categories: 600, // 10 minutes
      articles: 300, // 5 minutes
      services: 300, // 5 minutes
      prestataires: 300, // 5 minutes
      freelances: 300, // 5 minutes
      sessions: 3600, // 1 heure
    },
  },

  // 📝 LOGGING
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/',
    maxFiles: 5,
    maxSize: '20m',
    datePattern: 'YYYY-MM-DD',
    colors: {
      error: 'red',
      warn: 'yellow',
      info: 'green',
      http: 'magenta',
      debug: 'white',
    },
  },

  // 📊 MONITORING
  monitoring: {
    enabled: process.env.ENABLE_METRICS === 'true' || true,
    healthCheck: {
      enabled: process.env.ENABLE_HEALTH_CHECK === 'true' || true,
      path: '/health',
    },
    metrics: {
      enabled: true,
      path: '/metrics',
      cacheStats: '/cache/stats',
    },
  },

  // 🚀 PERFORMANCE
  performance: {
    compression: {
      enabled: process.env.ENABLE_COMPRESSION === 'true' || true,
      level: 6,
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: process.env.CORS_CREDENTIALS === 'true' || true,
    },
    upload: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
      allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(','),
    },
  },

  // 🔔 NOTIFICATIONS
  notifications: {
    push: {
      enabled: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true' || true,
    },
    email: {
      enabled: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true' || true,
    },
    sms: {
      enabled: process.env.ENABLE_SMS_NOTIFICATIONS === 'true' || false,
    },
  },

  // 🛠️ DÉVELOPPEMENT
  development: {
    debug: process.env.DEBUG === 'true' || false,
    verboseLogging: process.env.VERBOSE_LOGGING === 'true' || false,
    swagger: {
      enabled: process.env.ENABLE_SWAGGER === 'true' || true,
      path: '/api-docs',
    },
  },

  // 📈 ANALYTICS
  analytics: {
    enabled: process.env.ENABLE_ANALYTICS === 'true' || false,
    googleAnalytics: {
      id: process.env.GOOGLE_ANALYTICS_ID || null,
    },
  },
};

// 🎯 CONFIGURATION SPÉCIFIQUE PAR ENVIRONNEMENT
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const configs = {
    development: {
      ...optimizationConfig,
      logging: {
        ...optimizationConfig.logging,
        level: 'debug',
        verboseLogging: true,
      },
      cache: {
        ...optimizationConfig.cache,
        defaultTTL: 60, // Cache plus court en dev
      },
    },
    
    production: {
      ...optimizationConfig,
      logging: {
        ...optimizationConfig.logging,
        level: 'warn',
        verboseLogging: false,
      },
      cache: {
        ...optimizationConfig.cache,
        defaultTTL: 600, // Cache plus long en prod
      },
      security: {
        ...optimizationConfig.security,
        rateLimit: {
          ...optimizationConfig.security.rateLimit,
          max: 50, // Limite plus stricte en prod
        },
      },
    },
    
    test: {
      ...optimizationConfig,
      cache: {
        ...optimizationConfig.cache,
        enabled: false, // Pas de cache en test
      },
      logging: {
        ...optimizationConfig.logging,
        level: 'error',
      },
    },
  };
  
  return configs[env] || configs.development;
};

// 🔧 FONCTIONS UTILITAIRES
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isTest = () => process.env.NODE_ENV === 'test';

// 📊 MÉTRIQUES DE PERFORMANCE
export const performanceMetrics = {
  startTime: Date.now(),
  requests: 0,
  errors: 0,
  cacheHits: 0,
  cacheMisses: 0,
  
  incrementRequests: () => performanceMetrics.requests++,
  incrementErrors: () => performanceMetrics.errors++,
  incrementCacheHits: () => performanceMetrics.cacheHits++,
  incrementCacheMisses: () => performanceMetrics.cacheMisses++,
  
  getStats: () => ({
    uptime: Date.now() - performanceMetrics.startTime,
    requests: performanceMetrics.requests,
    errors: performanceMetrics.errors,
    cacheHits: performanceMetrics.cacheHits,
    cacheMisses: performanceMetrics.cacheMisses,
    errorRate: performanceMetrics.requests > 0 ? (performanceMetrics.errors / performanceMetrics.requests) * 100 : 0,
    cacheHitRate: (performanceMetrics.cacheHits + performanceMetrics.cacheMisses) > 0 
      ? (performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses)) * 100 
      : 0,
  }),
};

export default optimizationConfig;
