import { Router } from "express";
import multer from "multer";
import {
  createPrestataire,
  getAllPrestataires,
  getPrestataireById,
  updatePrestataire,
  deletePrestataire,
  validatePrestataire,
  rejectPrestataire,
  getPendingPrestataires,
} from "../controller/prestataireController.js";

const upload = multer({ dest: "uploads/" }); // stockage temporaire pour Cloudinary

const prestataireRouter = Router();

prestataireRouter.post(
  '/prestataire',
  upload.fields([
    { name: 'cni1', maxCount: 1 },
    { name: 'cni2', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'diplomeCertificat', maxCount: 10 }, // plusieurs diplômes
    { name: 'attestationAssurance', maxCount: 1 }, // si tu veux gérer l'assurance
  ]),
  createPrestataire
);

prestataireRouter.put(
  '/prestataire/:id',
  upload.fields([
    { name: 'cni1', maxCount: 1 },
    { name: 'cni2', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'diplomeCertificat', maxCount: 10 },
    { name: 'attestationAssurance', maxCount: 1 },
  ]),
  updatePrestataire
);

prestataireRouter.get("/prestataire", getAllPrestataires);
prestataireRouter.get("/prestataire/:id", getPrestataireById);
prestataireRouter.delete("/prestataire/:id", deletePrestataire);

// 🆕 Routes validation (Option C)
prestataireRouter.get("/prestataire/pending/list", getPendingPrestataires);
prestataireRouter.put("/prestataire/:id/validate", validatePrestataire);
prestataireRouter.put("/prestataire/:id/reject", rejectPrestataire);

export default prestataireRouter;
