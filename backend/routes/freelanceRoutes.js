import { Router } from "express";
import multer from "multer";
import {
  createFreelance,
  getAllFreelances,
  getFreelanceById,
  updateFreelance,
  deleteFreelance,
} from "../controller/freelanceController.js";

const upload = multer({ dest: "uploads/" }); // Stockage temporaire avant Cloudinary

const freelanceRouter = Router();

// ✅ Créer un freelance (avec upload de fichiers)
freelanceRouter.post('/freelance', upload.fields([
  { name: 'cni1', maxCount: 1 },
  { name: 'cni2', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]), createFreelance);

// ✅ Mettre à jour un freelance (avec upload de fichiers)
freelanceRouter.put('/freelance/:id', upload.fields([
  { name: 'cni1', maxCount: 1 },
  { name: 'cni2', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]), updateFreelance);

// ✅ Lire tous les freelances
freelanceRouter.get("/freelance", getAllFreelances);

// ✅ Lire un freelance par ID
freelanceRouter.get("/freelance/:id", getFreelanceById);

// ✅ Supprimer un freelance
freelanceRouter.delete("/freelance/:id", deleteFreelance);

export default freelanceRouter;
