import { Router } from "express";
import multer from "multer";
<<<<<<< HEAD
import auth, { authAdmin, optionalAuth } from "../middleware/authMiddleware.js";
=======
import auth, { authAdmin } from "../middleware/authMiddleware.js";
>>>>>>> 5be76ff (fix(security): protéger routes admin, maps API et authentification Socket)
import {
  requireFreelanceOwnerOrAdmin,
  requireSelfOrAdmin,
} from "../middleware/entityAccess.js";
import {
  createFreelance,
  getAllFreelances,
  getFreelanceById,
  updateFreelance,
  deleteFreelance,
  updateFreelanceRating,
  promoteFreelance,
  getFreelancesByCategory,
  searchFreelances,
  validateFreelance,
  rejectFreelance,
  getPendingFreelances,
} from "../controller/freelanceController.js";
import { listFreelanceServicesByFreelanceId } from "../controller/freelanceServiceController.js";

const upload = multer({ dest: "uploads/" });
const freelanceRouter = Router();

const uploadFields = upload.fields([
  { name: "profileImage", maxCount: 1 },
  { name: "cni1", maxCount: 1 },
  { name: "cni2", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
]);

// Public — catalogue (routes spécifiques avant /:id)
freelanceRouter.get("/freelance/pending/list", ...authAdmin, getPendingFreelances);
<<<<<<< HEAD
freelanceRouter.get("/freelance", optionalAuth, getAllFreelances);
freelanceRouter.get("/freelances/category/:category", optionalAuth, getFreelancesByCategory);
freelanceRouter.get("/freelances/search", optionalAuth, searchFreelances);
freelanceRouter.get("/freelance/:id/services", listFreelanceServicesByFreelanceId);
freelanceRouter.get("/freelance/:id", optionalAuth, getFreelanceById);
=======
freelanceRouter.get("/freelance", getAllFreelances);
freelanceRouter.get("/freelances/category/:category", getFreelancesByCategory);
freelanceRouter.get("/freelances/search", searchFreelances);
freelanceRouter.get("/freelance/:id/services", listFreelanceServicesByFreelanceId);
freelanceRouter.get("/freelance/:id", getFreelanceById);

// Admin — modération
freelanceRouter.put("/freelance/:id/validate", ...authAdmin, validateFreelance);
freelanceRouter.put("/freelance/:id/reject", ...authAdmin, rejectFreelance);
freelanceRouter.delete("/freelance/:id", ...authAdmin, deleteFreelance);
freelanceRouter.put("/freelance/:id/promote", ...authAdmin, promoteFreelance);

// Authentifié
freelanceRouter.post(
  "/freelance",
  auth,
  requireSelfOrAdmin("utilisateur"),
  uploadFields,
  createFreelance,
);

freelanceRouter.put(
  "/freelance/:id",
  auth,
  requireFreelanceOwnerOrAdmin(),
  uploadFields,
  updateFreelance,
);

freelanceRouter.put("/freelance/:id/rating", auth, updateFreelanceRating);
>>>>>>> 5be76ff (fix(security): protéger routes admin, maps API et authentification Socket)

// Admin — modération
freelanceRouter.put("/freelance/:id/validate", ...authAdmin, validateFreelance);
freelanceRouter.put("/freelance/:id/reject", ...authAdmin, rejectFreelance);
freelanceRouter.delete("/freelance/:id", ...authAdmin, deleteFreelance);
freelanceRouter.put("/freelance/:id/promote", ...authAdmin, promoteFreelance);

// Authentifié
freelanceRouter.post(
  "/freelance",
  auth,
  requireSelfOrAdmin("utilisateur"),
  uploadFields,
  createFreelance,
);

freelanceRouter.put(
  "/freelance/:id",
  auth,
  requireFreelanceOwnerOrAdmin(),
  uploadFields,
  updateFreelance,
);

freelanceRouter.put("/freelance/:id/rating", auth, updateFreelanceRating);

export default freelanceRouter;