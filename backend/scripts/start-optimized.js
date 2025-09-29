#!/usr/bin/env node

// 🚀 SCRIPT DE DÉMARRAGE OPTIMISÉ - SOUTRALI DEALS
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import logger from '../middleware/logger.js';
import { getEnvironmentConfig, isProduction } from '../config/optimization.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🎯 CONFIGURATION INITIALE
const config = getEnvironmentConfig();

// 📁 CRÉATION DES DOSSIERS NÉCESSAIRES
const createDirectories = () => {
  const directories = [
    'logs',
    'uploads',
    'temp',
    'backups',
  ];
  
  directories.forEach(dir => {
    const dirPath = join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`📁 Dossier créé: ${dir}`);
    }
  });
};

// 🔧 VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT
const checkEnvironmentVariables = () => {
  const requiredVars = [
    'MONGODB_URI',
    'TOKEN_SECRET',
    'PORT',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error(`❌ Variables d'environnement manquantes: ${missingVars.join(', ')}`);
    process.exit(1);
  }
  
  logger.info('✅ Variables d\'environnement vérifiées');
};

// 🗄️ VÉRIFICATION DE LA CONNEXION REDIS
const checkRedisConnection = async () => {
  try {
    const { default: redis } = await import('../middleware/cache.js');
    await redis.ping();
    logger.info('✅ Redis connecté');
  } catch (error) {
    logger.warn('⚠️ Redis non disponible, cache désactivé');
  }
};

// 🗄️ VÉRIFICATION DE LA CONNEXION MONGODB
const checkMongoDBConnection = async () => {
  try {
    const { default: connect } = await import('../database/connex.js');
    await connect();
    logger.info('✅ MongoDB connecté');
  } catch (error) {
    logger.error('❌ Erreur de connexion MongoDB:', error);
    process.exit(1);
  }
};

// 🧹 NETTOYAGE DES FICHIERS TEMPORAIRES
const cleanupTempFiles = () => {
  const tempDir = join(__dirname, '..', 'temp');
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      const filePath = join(tempDir, file);
      const stats = fs.statSync(filePath);
      // Supprimer les fichiers de plus de 1 heure
      if (Date.now() - stats.mtime.getTime() > 3600000) {
        fs.unlinkSync(filePath);
        logger.info(`🗑️ Fichier temporaire supprimé: ${file}`);
      }
    });
  }
};

// 📊 AFFICHAGE DES STATISTIQUES DE DÉMARRAGE
const displayStartupStats = () => {
  const stats = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
    uptime: process.uptime() + 's',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
  };
  
  logger.info('🚀 Statistiques de démarrage:', stats);
};

// 🔄 GESTION DES SIGNAUX DE FIN
const setupGracefulShutdown = () => {
  const gracefulShutdown = (signal) => {
    logger.info(`📡 Signal ${signal} reçu, arrêt en cours...`);
    
    // Nettoyage des ressources
    cleanupTempFiles();
    
    logger.info('✅ Arrêt propre terminé');
    process.exit(0);
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Pour nodemon
};

// 🚀 FONCTION PRINCIPALE DE DÉMARRAGE
const startOptimizedServer = async () => {
  try {
    logger.info('🚀 Démarrage du serveur SOUTRALI DEALS optimisé...');
    
    // 1. Création des dossiers
    createDirectories();
    
    // 2. Vérification des variables d'environnement
    checkEnvironmentVariables();
    
    // 3. Vérification des connexions
    await checkMongoDBConnection();
    await checkRedisConnection();
    
    // 4. Nettoyage des fichiers temporaires
    cleanupTempFiles();
    
    // 5. Configuration des signaux de fin
    setupGracefulShutdown();
    
    // 6. Affichage des statistiques
    displayStartupStats();
    
    // 7. Démarrage du serveur principal
    const { default: server } = await import('../server.js');
    
    logger.info('✅ Serveur SOUTRALI DEALS démarré avec succès !');
    
  } catch (error) {
    logger.error('❌ Erreur lors du démarrage:', error);
    process.exit(1);
  }
};

// 🎯 DÉMARRAGE
if (import.meta.url === `file://${process.argv[1]}`) {
  startOptimizedServer();
}

export default startOptimizedServer;


