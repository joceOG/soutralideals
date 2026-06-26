import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import auth from '../middleware/authMiddleware.js';
import {
    sendMessage,
    getUserConversations,
    getConversationMessages,
    markMessagesAsRead,
    deleteMessageForUser,
    searchMessages,
    getMessageStats,
    getUnreadMessages
} from '../controller/messageController.js';

const upload = multer({ dest: 'uploads/' });

// 🛡️ Rate limiter spécifique messages : 30 messages/minute max
const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Trop de messages envoyés, attendez une minute.' },
  // On utilise uniquement l'ID utilisateur (toujours authentifié ici)
  keyGenerator: (req) => req.utilisateur?._id?.toString() ?? 'anonymous',
  skip: (req) => !req.utilisateur?._id, // pas de limite si pas d'user (couche auth bloque avant)
});

const messageRouter = Router();

// 🔐 Toutes les routes messages nécessitent une authentification
messageRouter.post('/message', auth, messageLimiter, upload.single('pieceJointe'), sendMessage);
messageRouter.get('/messages/conversations/:userId', auth, getUserConversations);
messageRouter.get('/messages/conversation/:conversationId', auth, getConversationMessages);

// ✅ ROUTES DE GESTION
messageRouter.patch('/messages/mark-read', auth, markMessagesAsRead);
messageRouter.delete('/message/:messageId/user', auth, deleteMessageForUser);

// ✅ ROUTES DE RECHERCHE ET STATS
messageRouter.get('/messages/search', auth, searchMessages);
messageRouter.get('/messages/stats', auth, getMessageStats);
messageRouter.get('/messages/unread/:userId', auth, getUnreadMessages);

export default messageRouter;

