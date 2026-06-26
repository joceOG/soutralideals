import { Router } from "express";
import multer from "multer";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
import auth, { authAdmin, optionalAuth } from "../middleware/authMiddleware.js";
=======
import auth, { authAdmin } from "../middleware/authMiddleware.js";
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
=======
import auth, { authAdmin, optionalAuth } from "../middleware/authMiddleware.js";
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
import auth, { authAdmin, optionalAuth } from "../middleware/authMiddleware.js";
=======
import auth, { authAdmin } from "../middleware/authMiddleware.js";
>>>>>>> cc0abbd (fix(security): protéger routes admin, maps API et authentification Socket)
<<<<<<< HEAD
>>>>>>> 37a9202 (fix(security): protéger routes admin, maps API et authentification Socket)
=======
=======
import auth, { authAdmin, optionalAuth } from "../middleware/authMiddleware.js";
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
import auth, { authAdmin, optionalAuth } from "../middleware/authMiddleware.js";
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
import {
  requirePrestataireOwnerOrAdmin,
  requireSelfOrAdmin,
} from "../middleware/entityAccess.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
=======
=======
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
=======
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> cc0abbd (fix(security): protéger routes admin, maps API et authentification Socket)
>>>>>>> 37a9202 (fix(security): protéger routes admin, maps API et authentification Socket)
=======
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 37a9202 (fix(security): protéger routes admin, maps API et authentification Socket)
=======
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
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
=======
const upload = multer({ dest: "uploads/" }); // stockage temporaire pour Cloudinary
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
=======
=======
const upload = multer({ dest: "uploads/" });
>>>>>>> cc0abbd (fix(security): protéger routes admin, maps API et authentification Socket)
>>>>>>> 37a9202 (fix(security): protéger routes admin, maps API et authentification Socket)

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
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

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
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
<<<<<<< HEAD
>>>>>>> 37a9202 (fix(security): protéger routes admin, maps API et authentification Socket)
// ⚠️ Routes spécifiques AVANT les routes paramétriques /:id
prestataireRouter.get("/prestataire/pending/list", getPendingPrestataires);

prestataireRouter.get("/prestataire", getAllPrestataires);
prestataireRouter.get("/prestataire/:id", getPrestataireById);
prestataireRouter.delete("/prestataire/:id", deletePrestataire);
prestataireRouter.put("/prestataire/:id/validate", validatePrestataire);
prestataireRouter.put("/prestataire/:id/reject", rejectPrestataire);

<<<<<<< HEAD
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
=======
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
<<<<<<< HEAD
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
=======
>>>>>>> cc0abbd (fix(security): protéger routes admin, maps API et authentification Socket)
>>>>>>> 37a9202 (fix(security): protéger routes admin, maps API et authentification Socket)
export default prestataireRouter;
=======
export default prestataireRouter;
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
