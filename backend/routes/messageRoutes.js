import { Router } from 'express';
import { imageUpload } from '../utils/uploadMiddleware.js';
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

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Trop de messages envoyés, attendez une minute.' },
  keyGenerator: (req) => req.utilisateur?._id?.toString() ?? 'anonymous',
  skip: (req) => !req.utilisateur?._id,
});

const messageRouter = Router();

messageRouter.post('/message', auth, messageLimiter, imageUpload.single('pieceJointe'), sendMessage);
messageRouter.get('/messages/conversations/:userId', auth, getUserConversations);
messageRouter.get('/messages/conversation/:conversationId', auth, getConversationMessages);

messageRouter.patch('/messages/mark-read', auth, markMessagesAsRead);
messageRouter.delete('/message/:messageId/user', auth, deleteMessageForUser);

messageRouter.get('/messages/search', auth, searchMessages);
messageRouter.get('/messages/stats', auth, getMessageStats);
messageRouter.get('/messages/unread/:userId', auth, getUnreadMessages);

export default messageRouter;
