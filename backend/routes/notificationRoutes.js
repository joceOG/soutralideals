import { Router } from 'express';
import {
    createNotification,
    getAllNotifications,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    getNotificationStats,
    sendBulkNotification
} from '../controller/notificationController.js';

const notificationRouter = Router();

// ✅ ROUTES CRUD NOTIFICATIONS
notificationRouter.post('/notification', createNotification);
notificationRouter.get('/notifications', getAllNotifications);
notificationRouter.delete('/notification/:id', deleteNotification);

// ✅ ROUTES SPÉCIFIQUES UTILISATEUR
notificationRouter.get('/notifications/user/:userId', getUserNotifications);
notificationRouter.patch('/notification/:id/read', markAsRead);
notificationRouter.patch('/notifications/user/:userId/read-all', markAllAsRead);
notificationRouter.patch('/notification/:id/archive', archiveNotification);

// ✅ ROUTES STATISTIQUES ET MASSE
notificationRouter.get('/notifications/stats', getNotificationStats);
notificationRouter.post('/notifications/bulk', sendBulkNotification);

export default notificationRouter;

