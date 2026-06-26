import { Router } from "express";
import multer from "multer";
<<<<<<< HEAD
import auth, { authAdmin, optionalAuth } from "../middleware/authMiddleware.js";
=======
import auth, { authAdmin } from "../middleware/authMiddleware.js";
>>>>>>> 5be76ff (fix(security): protéger routes admin, maps API et authentification Socket)
import {
  requirePrestataireOwnerOrAdmin,
  requireSelfOrAdmin,
} from "../middleware/entityAccess.js";
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

const upload = multer({ dest: "uploads/" });

const prestataireRouter = Router();

const uploadFields = upload.fields([
  { name: "cni1", maxCount: 1 },
  { name: "cni2", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "diplomeCertificat", maxCount: 10 },
  { name: "attestationAssurance", maxCount: 1 },
]);

// Public — catalogue (routes spécifiques avant /:id)
prestataireRouter.get("/prestataire/pending/list", ...authAdmin, getPendingPrestataires);
<<<<<<< HEAD
prestataireRouter.get("/prestataire", optionalAuth, getAllPrestataires);
prestataireRouter.get("/prestataire/:id", optionalAuth, getPrestataireById);
=======
prestataireRouter.get("/prestataire", getAllPrestataires);
prestataireRouter.get("/prestataire/:id", getPrestataireById);
>>>>>>> 5be76ff (fix(security): protéger routes admin, maps API et authentification Socket)

// Admin — modération
prestataireRouter.put("/prestataire/:id/validate", ...authAdmin, validatePrestataire);
prestataireRouter.put("/prestataire/:id/reject", ...authAdmin, rejectPrestataire);
prestataireRouter.delete("/prestataire/:id", ...authAdmin, deletePrestataire);

// Authentifié — inscription / mise à jour propre profil
prestataireRouter.post(
  "/prestataire",
  auth,
  requireSelfOrAdmin("utilisateur"),
  uploadFields,
  createPrestataire,
);

prestataireRouter.put(
  "/prestataire/:id",
  auth,
  requirePrestataireOwnerOrAdmin(),
  uploadFields,
  updatePrestataire,
);

<<<<<<< HEAD
export default prestataireRouter;
=======
export default prestataireRouter;
>>>>>>> 5be76ff (fix(security): protéger routes admin, maps API et authentification Socket)
