import { Router } from "express";
import {
  createNotification,
  getNotificationsByUser,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  getAllNotificationsAdmin,
  getNotificationStatsAdmin,
  archiveNotification,
  bulkCreateNotificationsAdmin,
} from "../controller/notificationController.js";
import auth, { authRole } from "../middleware/authMiddleware.js";

const notificationRouter = Router();

// Dashboard admin (avant les routes /notification/:id)
notificationRouter.get(
  "/notifications/stats",
  auth,
  authRole(["Admin", "ADMIN"]),
  getNotificationStatsAdmin
);
notificationRouter.get(
  "/notifications",
  auth,
  authRole(["Admin", "ADMIN"]),
  getAllNotificationsAdmin
);
notificationRouter.post(
  "/notifications/bulk",
  auth,
  authRole(["Admin", "ADMIN"]),
  bulkCreateNotificationsAdmin
);

notificationRouter.post("/notification", auth, createNotification);
notificationRouter.get("/notification/user/:userId", auth, getNotificationsByUser);
notificationRouter.put("/notification/:notificationId/read", auth, markAsRead);
notificationRouter.put("/notification/:notificationId/archive", auth, archiveNotification);
notificationRouter.put("/notification/user/:userId/read-all", auth, markAllAsRead);
notificationRouter.delete("/notification/:notificationId", auth, deleteNotification);
notificationRouter.get("/notification/user/:userId/unread-count", auth, getUnreadCount);

export default notificationRouter;

