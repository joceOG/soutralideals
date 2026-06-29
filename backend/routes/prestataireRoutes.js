import { Router } from "express";
import multer from "multer";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import auth, { authAdmin, optionalAuth } from "../middleware/authMiddleware.js";
=======
import auth, { authAdmin } from "../middleware/authMiddleware.js";
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
=======
import auth, { authAdmin, optionalAuth } from "../middleware/authMiddleware.js";
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
import {
  requirePrestataireOwnerOrAdmin,
  requireSelfOrAdmin,
} from "../middleware/entityAccess.js";
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
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

<<<<<<< HEAD
<<<<<<< HEAD
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
prestataireRouter.get("/prestataire", optionalAuth, getAllPrestataires);
prestataireRouter.get("/prestataire/:id", optionalAuth, getPrestataireById);
<<<<<<< HEAD

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

=======
const upload = multer({ dest: "uploads/" }); // stockage temporaire pour Cloudinary
=======
const upload = multer({ dest: "uploads/" });
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)

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
prestataireRouter.get("/prestataire", getAllPrestataires);
prestataireRouter.get("/prestataire/:id", getPrestataireById);
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

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
// ⚠️ Routes spécifiques AVANT les routes paramétriques /:id
prestataireRouter.get("/prestataire/pending/list", getPendingPrestataires);

prestataireRouter.get("/prestataire", getAllPrestataires);
prestataireRouter.get("/prestataire/:id", getPrestataireById);
prestataireRouter.delete("/prestataire/:id", deletePrestataire);
prestataireRouter.put("/prestataire/:id/validate", validatePrestataire);
prestataireRouter.put("/prestataire/:id/reject", rejectPrestataire);

>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
export default prestataireRouter;
