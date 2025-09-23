import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import morgan from 'morgan';
import cors from 'cors';
import { config } from 'dotenv';
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

/** import connection file */
import connect from './database/connex.js';

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
app.use(morgan('tiny'));
app.use(cors());
app.use(express.json());
// ✅ Forcer l'encodage UTF-8 pour toutes les réponses JSON
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});
config();




/** appliation port */
const port = process.env.PORT ;


/** routes */
app.use('/api', utilisateurRouter) /** apis utilisateur */
app.use('/api', groupeRouter);
app.use('/api', categorieRouter);
app.use('/api', articleRouter);
app.use('/api', serviceRouter);
// app.use('/api', utilisateurRoute);
app.use('/api', prestataireRouter);
app.use('/api', freelanceRouter);
app.use('/api', vendeurRouter);

// ✅ NOUVELLES ROUTES POUR LES MODULES AJOUTÉS
app.use('/api', commandeRouter);
app.use('/api', notificationRouter);
app.use('/api', messageRouter);
app.use('/api', prestationRouter);
app.use('/api', promotionRouter);


app.get('/', (req, res) => {
    try {
        res.json("Get Request")
    } catch (error) {
        res.json(error)
    }
})




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