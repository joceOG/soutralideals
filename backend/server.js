import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import swaggerConfig from './swagger/swagger.config.js';
import utilisateurRouter from './routes/utilisateurRoutes.js';
import categorieRouter from './routes/categorieRoutes.js';
import groupeRouter from './routes/groupeRoutes.js';
import serviceRouter from './routes/serviceRoutes.js'
import prestataireRouter from './routes/prestataireRoutes.js';
import articleRouter from './routes/articleRoutes.js'
import freelanceRouter from './routes/freelanceRoutes.js';
import vendeurRouter from './routes/vendeurRoutes.js';
// ✅ NOUVEAUX IMPORTS POUR LES MODULES AJOUTÉS
import commandeRouter from './routes/commandeRoutes.js';
import notificationRouter from './routes/notificationRoutes.js';
import messageRouter from './routes/messageRoutes.js';
import prestationRouter from './routes/prestationRoutes.js';
import promotionRouter from './routes/promotionRoutes.js';
import favoriteRouter from './routes/favoriteRoutes.js';
import mailRouter from './routes/mailRouter.js';
import smsRouter from './routes/smsRoutes.js';
import reportRouter from './routes/reportRoutes.js';
import googleMapsRouter from './routes/googleMapsRoutes.js';
import avisRouter from './routes/avisRoutes.js';
import historyRouter from './routes/historyRoutes.js';
import userPreferencesRouter from './routes/userPreferencesRoutes.js';
import securityRouter from './routes/securityRoutes.js';

/** import connection file */
import connect from './database/connex.js';

// 🚀 IMPORTS DES MIDDLEWARES D'OPTIMISATION
import logger, { httpLogger, authLogger, transactionLogger, userActionLogger } from './middleware/logger.js';
import { cacheMiddleware, sessionCache } from './middleware/cache.js';
import { simpleCache } from './middleware/simpleCache.js';

const app = express()
const httpServer = createServer(app);

// ✅ Configuration Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});


/** app middlewares */
// 🛡️ SÉCURITÉ - Helmet pour les headers HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// 🛡️ RATE LIMITING - Protection contre les abus
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limite chaque IP à 100 requêtes par windowMs
  message: {
    error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🛡️ RATE LIMITING STRICT pour les routes d'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limite à 5 tentatives de connexion par IP
  message: {
    error: 'Trop de tentatives de connexion, veuillez réessayer plus tard.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true,
});

app.use(limiter);
app.use('/api/utilisateur/login', authLimiter);
app.use('/api/utilisateur/register', authLimiter);

// 📝 LOGGING AVANCÉ
app.use(httpLogger);
app.use(authLogger);
app.use(transactionLogger);
app.use(userActionLogger);

// 💾 CACHE ET SESSIONS
app.use(sessionCache);

app.use(morgan('tiny'));
app.use(cors());
app.use(express.json());
// ✅ Forcer l'encodage UTF-8 pour toutes les réponses JSON
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});
config();

// ✅ CONFIGURATION SWAGGER
const swaggerSpec = swaggerConfig;

/** appliation port */
const port = process.env.PORT ;


/** routes */
// 🚀 ROUTES AVEC CACHE SIMPLE (sans Redis)
app.use('/api', simpleCache(300), utilisateurRouter) /** apis utilisateur */
app.use('/api', simpleCache(600), groupeRouter); // Cache 10 minutes
app.use('/api', simpleCache(600), categorieRouter); // Cache 10 minutes
app.use('/api', simpleCache(300), articleRouter); // Cache 5 minutes
app.use('/api', simpleCache(300), serviceRouter); // Cache 5 minutes
app.use('/api', simpleCache(300), prestataireRouter); // Cache 5 minutes
app.use('/api', simpleCache(300), freelanceRouter); // Cache 5 minutes
app.use('/api', simpleCache(300), vendeurRouter); // Cache 5 minutes

// ✅ NOUVELLES ROUTES POUR LES MODULES AJOUTÉS
app.use('/api', commandeRouter);
app.use('/api', notificationRouter);
app.use('/api', messageRouter);
app.use('/api', prestationRouter);
app.use('/api', promotionRouter);
app.use('/api', favoriteRouter);
app.use('/api', mailRouter);
app.use('/api', smsRouter);
app.use('/api', reportRouter);
app.use('/api', avisRouter);
app.use('/api', historyRouter);
app.use('/api', userPreferencesRouter);
// Cache simple pour les routes de sécurité (sans Redis)
app.use('/api', simpleCache(300), securityRouter);
app.use('/api/maps', googleMapsRouter);

// ✅ ROUTE SWAGGER UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 🏥 HEALTH CHECK - Surveillance de l'état de l'API
/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Monitoring]
 *     summary: 🏥 Vérification de l'état de l'API
 *     description: Endpoint de santé pour vérifier l'état de l'API, la mémoire, l'uptime et les performances
 *     responses:
 *       200:
 *         description: API en bonne santé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *             example:
 *               status: "OK"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *               uptime: 3600
 *               memory:
 *                 rss: 100593664
 *                 heapTotal: 48250880
 *                 heapUsed: 43367920
 *                 external: 22232457
 *                 arrayBuffers: 18453136
 *               version: "1.0.0"
 *       500:
 *         description: API en erreur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
    });
});

// 📊 METRICS - Endpoint de métriques basiques
/**
 * @swagger
 * /metrics:
 *   get:
 *     tags: [Monitoring]
 *     summary: 📈 Métriques de performance
 *     description: Récupère les métriques détaillées de performance de l'API
 *     responses:
 *       200:
 *         description: Métriques récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Metrics'
 *             example:
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *               uptime: 3600
 *               memory:
 *                 used: "42 MB"
 *                 total: "46 MB"
 *               cpu:
 *                 user: 3671000
 *                 system: 1890000
 *               platform: "win32"
 *               nodeVersion: "v22.2.0"
 *       500:
 *         description: Erreur lors de la récupération des métriques
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/metrics', (req, res) => {
    res.status(200).json({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        },
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
    });
});

// 💾 CACHE STATS - Statistiques du cache Redis
/**
 * @swagger
 * /cache/stats:
 *   get:
 *     tags: [Cache]
 *     summary: 💾 Statistiques du cache Redis
 *     description: Récupère les statistiques détaillées du cache Redis (hits, misses, hit rate)
 *     responses:
 *       200:
 *         description: Statistiques du cache récupérées
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CacheStats'
 *             example:
 *               cache:
 *                 hits: 150
 *                 misses: 50
 *                 sets: 200
 *                 deletes: 10
 *                 hitRate: 0.75
 *                 total: 200
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *               status: "OK"
 *       500:
 *         description: Cache non disponible
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Cache non disponible"
 *               message: "Redis connection failed"
 */
app.get('/cache/stats', async (req, res) => {
    try {
        const { getCacheStats } = await import('./middleware/cache.js');
        const stats = getCacheStats();
        res.status(200).json({
            cache: stats,
            timestamp: new Date().toISOString(),
            status: 'OK'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Cache non disponible',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /:
 *   get:
 *     tags: [Monitoring]
 *     summary: 🏠 Informations de l'API
 *     description: Endpoint racine avec informations sur l'API, documentation et endpoints disponibles
 *     responses:
 *       200:
 *         description: Informations de l'API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "SoutraLi Deals API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 documentation:
 *                   type: string
 *                   example: "http://localhost:3000/api-docs"
 *                 health:
 *                   type: string
 *                   example: "http://localhost:3000/health"
 *                 metrics:
 *                   type: string
 *                   example: "http://localhost:3000/metrics"
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: string
 *                       example: "/api/utilisateur"
 *                     services:
 *                       type: string
 *                       example: "/api/service"
 *                     orders:
 *                       type: string
 *                       example: "/api/commande"
 *                     messages:
 *                       type: string
 *                       example: "/api/message"
 *                     notifications:
 *                       type: string
 *                       example: "/api/notification"
 */
app.get('/', (req, res) => {
    try {
        res.json({
            message: "SoutraLi Deals API",
            version: "1.0.0",
            documentation: "http://localhost:3000/api-docs",
            health: "http://localhost:3000/health",
            metrics: "http://localhost:3000/metrics",
            endpoints: {
                users: "/api/utilisateur",
                services: "/api/service",
                orders: "/api/commande",
                messages: "/api/message",
                notifications: "/api/notification"
            }
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});




// const normalizePort = val => {
//     const port = parseInt(val, 10);

//     if (isNaN(port)) {
//         return val;
//     }
//     if (port >= 0) {
//         return port;
//     }
//     return false; 
// };

// const port = normalizePort(process.env.PORT ||  '3000');
// app.set('port', port);

// const errorHandler = error => {
//     if (error.syscall !== 'listen') {
//         throw error;
//     }
//     const address = server.address();
//     const bind = typeof address === 'string' ? 'pipe ' + address : 'port: ' + port;
//     switch (error.code) {
//         case 'EACCES':
//             console.error(bind + ' requires elevated privileges.');
//             process.exit(1);
//             break;
//         case 'EADDRINUSE':
//             console.error(bind + ' is already in use.');
//             process.exit(1);
//             break;
//         default:
//             throw error;
//     }
// };

// const server = http.createServer(app);

// server.on('error', errorHandler);
// server.on('listening', () => {
//     const address = server.address();
//     const bind = typeof address === 'string' ? 'pipe ' + address : 'port ' + port;
//     console.log('Listening on ' + bind);
// });





// ✅ GESTION DES CONNEXIONS WEBSOCKET
io.on('connection', (socket) => {
  console.log('🔌 Utilisateur connecté:', socket.id);

  // 📱 Authentification de l'utilisateur
  socket.on('authenticate', (userId) => {
    socket.userId = userId;
    socket.join(`user_${userId}`);
    console.log(`👤 Utilisateur ${userId} authentifié`);
  });

  // 💬 REJOINDRE UNE CONVERSATION
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`💬 Socket ${socket.id} a rejoint la conversation ${conversationId}`);
  });

  // 💬 QUITTER UNE CONVERSATION
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`💬 Socket ${socket.id} a quitté la conversation ${conversationId}`);
  });

  // 📨 ENVOYER UN MESSAGE
  socket.on('send-message', async (messageData) => {
    try {
      console.log('📨 Nouveau message reçu:', messageData);
      
      // Sauvegarder le message en base de données
      const messageModel = (await import('./models/messageModel.js')).default;
      const newMessage = new messageModel({
        expediteur: messageData.expediteur,
        destinataire: messageData.destinataire,
        contenu: messageData.contenu,
        conversationId: messageData.conversationId,
        typeMessage: messageData.typeMessage || 'NORMAL',
        statut: 'ENVOYE'
      });
      
      await newMessage.save();
      
      // Diffuser le message à tous les participants de la conversation
      io.to(`conversation_${messageData.conversationId}`).emit('new-message', {
        ...newMessage.toObject(),
        timestamp: new Date()
      });
      
      // Notifier le destinataire s'il est en ligne
      io.to(`user_${messageData.destinataire}`).emit('message-notification', {
        type: 'new_message',
        conversationId: messageData.conversationId,
        sender: messageData.expediteur,
        content: messageData.contenu
      });
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du message:', error);
      socket.emit('message-error', { error: 'Erreur lors de l\'envoi du message' });
    }
  });

  // 📦 MISE À JOUR STATUT COMMANDE
  socket.on('update-order-status', async (orderData) => {
    try {
      console.log('📦 Mise à jour statut commande:', orderData);
      
      // Mettre à jour en base de données
      const commandeModel = (await import('./models/commandeModel.js')).default;
      await commandeModel.findByIdAndUpdate(orderData.orderId, { 
        statusCommande: orderData.status 
      });
      
      // Notifier le client
      io.to(`user_${orderData.clientId}`).emit('order-status-updated', {
        orderId: orderData.orderId,
        status: orderData.status,
        timestamp: new Date()
      });
      
      // Diffuser à tous les participants de la commande
      io.to(`order_${orderData.orderId}`).emit('order-update', {
        orderId: orderData.orderId,
        status: orderData.status,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la commande:', error);
      socket.emit('order-error', { error: 'Erreur lors de la mise à jour' });
    }
  });

  // 🔔 NOTIFICATION PUSH
  socket.on('send-notification', (notificationData) => {
    console.log('🔔 Notification envoyée:', notificationData);
    
    // Diffuser la notification au destinataire
    io.to(`user_${notificationData.userId}`).emit('notification', {
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data,
      timestamp: new Date()
    });
  });

  // 👤 INDICATEUR DE TYPING
  socket.on('typing-start', (data) => {
    socket.to(`conversation_${data.conversationId}`).emit('user-typing', {
      userId: socket.userId,
      conversationId: data.conversationId,
      isTyping: true
    });
  });

  socket.on('typing-stop', (data) => {
    socket.to(`conversation_${data.conversationId}`).emit('user-typing', {
      userId: socket.userId,
      conversationId: data.conversationId,
      isTyping: false
    });
  });

  // 🔌 DÉCONNEXION
  socket.on('disconnect', () => {
    console.log('🔌 Utilisateur déconnecté:', socket.id);
  });
});

// ✅ DÉMARRAGE DU SERVEUR
connect().then(()=> {
    try{
    httpServer.listen(port,()=>{
        console.log(`🚀 Server connected to http://localhost:${port}`);
        console.log(`🔌 WebSocket server ready for connections`);
    })
}catch (error) {
    console.log("❌ Cannot connect to the server");
}
})
.catch(error => {
console.log("❌ Invalid Database Connection");
})