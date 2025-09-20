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
} from "../controller/freelanceController.js";

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

freelanceRouter.get("/freelance", getAllFreelances);
freelanceRouter.get("/freelance/:id", getFreelanceById);
freelanceRouter.delete("/freelance/:id", deleteFreelance);

// ✅ Routes spécifiques au modèle sdealsapp
freelanceRouter.put("/freelance/:id/rating", updateFreelanceRating);        // Mettre à jour note
freelanceRouter.put("/freelance/:id/promote", promoteFreelance);             // Promouvoir freelance
freelanceRouter.get("/freelances/category/:category", getFreelancesByCategory); // Par catégorie
freelanceRouter.get("/freelances/search", searchFreelances);                 // Recherche avancée

export default freelanceRouter;
