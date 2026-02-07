import { Router } from "express";
import {
  createNotification,
  getNotificationsByUser,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
} from "../controller/notificationController.js";

const notificationRouter = Router();

// Routes pour les notifications
notificationRouter.post("/notification", createNotification);
notificationRouter.get("/notification/user/:userId", getNotificationsByUser);
notificationRouter.put("/notification/:notificationId/read", markAsRead);
notificationRouter.put("/notification/user/:userId/read-all", markAllAsRead);
notificationRouter.delete("/notification/:notificationId", deleteNotification);
notificationRouter.get("/notification/user/:userId/unread-count", getUnreadCount);

export default notificationRouter;

