import { Router } from "express";
import multer from "multer";
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

const upload = multer({ dest: "uploads/" }); // Stockage temporaire avant Cloudinary

const freelanceRouter = Router();

// ✅ Routes CRUD principales
freelanceRouter.post('/freelance', upload.fields([
  { name: 'profileImage', maxCount: 1 }, // Photo principale (sdealsapp)
  { name: 'cni1', maxCount: 1 },         // Documents vérification
  { name: 'cni2', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]), createFreelance);

freelanceRouter.put('/freelance/:id', upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'cni1', maxCount: 1 },
  { name: 'cni2', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]), updateFreelance);

// ⚠️ Routes spécifiques AVANT les routes paramétriques /:id
freelanceRouter.get("/freelance/pending/list", getPendingFreelances);
freelanceRouter.get("/freelances/category/:category", getFreelancesByCategory);
freelanceRouter.get("/freelances/search", searchFreelances);

freelanceRouter.get("/freelance", getAllFreelances);
freelanceRouter.get("/freelance/:id/services", listFreelanceServicesByFreelanceId);
freelanceRouter.get("/freelance/:id", getFreelanceById);
freelanceRouter.delete("/freelance/:id", deleteFreelance);
freelanceRouter.put("/freelance/:id/rating", updateFreelanceRating);
freelanceRouter.put("/freelance/:id/promote", promoteFreelance);
freelanceRouter.put("/freelance/:id/validate", validateFreelance);
freelanceRouter.put("/freelance/:id/reject", rejectFreelance);

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