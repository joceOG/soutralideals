import { Router } from 'express';
import multer from 'multer';
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

const upload = multer({ dest: 'uploads/' }); // Stockage temporaire pour Cloudinary

const messageRouter = Router();

// ✅ ROUTES PRINCIPALES
messageRouter.post('/message', upload.single('pieceJointe'), sendMessage);
messageRouter.get('/messages/conversations/:userId', getUserConversations);
messageRouter.get('/messages/conversation/:conversationId', getConversationMessages);

// ✅ ROUTES DE GESTION
messageRouter.patch('/messages/mark-read', markMessagesAsRead);
messageRouter.delete('/message/:messageId/user', deleteMessageForUser);

// ✅ ROUTES DE RECHERCHE ET STATS
messageRouter.get('/messages/search', searchMessages);
messageRouter.get('/messages/stats', getMessageStats);
messageRouter.get('/messages/unread/:userId', getUnreadMessages);

export default messageRouter;

