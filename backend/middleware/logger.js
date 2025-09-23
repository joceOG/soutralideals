import winston from 'winston';
import path from 'path';

// 🎨 Configuration des couleurs pour les logs
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// 📝 Format personnalisé pour les logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// 📁 Configuration des transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: 'debug',
    format: logFormat,
  }),
  
  // Fichier pour les erreurs
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
  
  // Fichier pour tous les logs
  new winston.transports.File({
    filename: path.join('logs', 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// 🏗️ Création du logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join('logs', 'exceptions.log') })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join('logs', 'rejections.log') })
  ],
});

// 📊 Middleware pour logger les requêtes HTTP
export const httpLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };
    
    if (res.statusCode >= 400) {
      logger.error('HTTP Request Error', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });
  
  next();
};

// 🔐 Middleware pour logger les tentatives d'authentification
export const authLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (req.path.includes('/login') || req.path.includes('/register')) {
      const logData = {
        action: req.path.includes('/login') ? 'LOGIN_ATTEMPT' : 'REGISTER_ATTEMPT',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: res.statusCode < 400,
        timestamp: new Date().toISOString(),
      };
      
      if (res.statusCode >= 400) {
        logger.warn('Authentication Failed', logData);
      } else {
        logger.info('Authentication Success', logData);
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// 💰 Middleware pour logger les transactions financières
export const transactionLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (req.path.includes('/paiement') || req.path.includes('/commande')) {
      const logData = {
        action: 'FINANCIAL_TRANSACTION',
        method: req.method,
        path: req.path,
        ip: req.ip,
        status: res.statusCode,
        timestamp: new Date().toISOString(),
      };
      
      logger.info('Financial Transaction', logData);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// 📱 Middleware pour logger les actions des utilisateurs
export const userActionLogger = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (req.user || req.utilisateur) {
      const userId = req.user?.id || req.utilisateur?._id;
      const logData = {
        userId,
        action: req.method + ' ' + req.path,
        ip: req.ip,
        status: res.statusCode,
        timestamp: new Date().toISOString(),
      };
      
      logger.info('User Action', logData);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

export default logger;
