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
  requireSelfOrAdmin,
  requireVendeurOwnerOrAdmin,
} from "../middleware/entityAccess.js";
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
import {
  createVendeur,
  getAllVendeurs,
  getVendeurById,
  updateVendeur,
  deleteVendeur,
<<<<<<< HEAD
<<<<<<< HEAD
=======
  // ✅ NOUVELLES MÉTHODES SDEALSAPP
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
  updateVendeurRating,
  promoteVendeur,
  getVendeursByCategory,
  searchVendeurs,
  getTopVendeurs,
  getVendeurStats,
  changeVendeurStatus,
  validateVendeur,
  rejectVendeur,
<<<<<<< HEAD
<<<<<<< HEAD
  getPendingVendeurs,
} from "../controller/vendeurController.js";

const upload = multer({ dest: "uploads/" });

const uploaderVendeur = upload.fields([
  { name: "shopLogo", maxCount: 1 },
  { name: "cni1", maxCount: 1 },
  { name: "cni2", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "businessLicense", maxCount: 1 },
  { name: "taxDocument", maxCount: 1 },
=======
  getPendingVendeurs
=======
  getPendingVendeurs,
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
} from "../controller/vendeurController.js";

const upload = multer({ dest: "uploads/" });

const uploaderVendeur = upload.fields([
  { name: "shopLogo", maxCount: 1 },
  { name: "cni1", maxCount: 1 },
  { name: "cni2", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
<<<<<<< HEAD
  { name: "businessLicense", maxCount: 1 }, // ✅ NOUVEAU: Licence commerciale
  { name: "taxDocument", maxCount: 1 },     // ✅ NOUVEAU: Document fiscal
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
  { name: "businessLicense", maxCount: 1 },
  { name: "taxDocument", maxCount: 1 },
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
]);

const vendeurRouter = Router();

<<<<<<< HEAD
<<<<<<< HEAD
// Public — catalogue (routes spécifiques avant /:id)
vendeurRouter.get("/vendeur/pending/list", ...authAdmin, getPendingVendeurs);
vendeurRouter.get("/vendeur", optionalAuth, getAllVendeurs);
vendeurRouter.get("/vendeurs/category/:category", optionalAuth, getVendeursByCategory);
vendeurRouter.get("/vendeurs/search", optionalAuth, searchVendeurs);
vendeurRouter.get("/vendeurs/top", optionalAuth, getTopVendeurs);
vendeurRouter.get("/vendeur/:id", optionalAuth, getVendeurById);
vendeurRouter.get("/vendeur/:id/stats", getVendeurStats);

// Admin — modération
vendeurRouter.put("/vendeur/:id/validate", ...authAdmin, validateVendeur);
vendeurRouter.put("/vendeur/:id/reject", ...authAdmin, rejectVendeur);
vendeurRouter.delete("/vendeur/:id", ...authAdmin, deleteVendeur);
vendeurRouter.put("/vendeur/:id/promote", ...authAdmin, promoteVendeur);
vendeurRouter.patch("/vendeur/:id/status", ...authAdmin, changeVendeurStatus);

// Authentifié
vendeurRouter.post(
  "/vendeur",
  auth,
  requireSelfOrAdmin("utilisateur"),
  uploaderVendeur,
  createVendeur,
);

vendeurRouter.put(
  "/vendeur/:id",
  auth,
  requireVendeurOwnerOrAdmin(),
  uploaderVendeur,
  updateVendeur,
);

vendeurRouter.put("/vendeur/:id/rating", auth, updateVendeurRating);
=======
// ⚠️ Routes spécifiques AVANT les routes paramétriques /:id
vendeurRouter.get("/vendeur/pending/list", getPendingVendeurs);
=======
// Public — catalogue (routes spécifiques avant /:id)
vendeurRouter.get("/vendeur/pending/list", ...authAdmin, getPendingVendeurs);
vendeurRouter.get("/vendeur", getAllVendeurs);
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
vendeurRouter.get("/vendeurs/category/:category", getVendeursByCategory);
vendeurRouter.get("/vendeurs/search", searchVendeurs);
vendeurRouter.get("/vendeurs/top", getTopVendeurs);
vendeurRouter.get("/vendeur/:id", getVendeurById);
vendeurRouter.get("/vendeur/:id/stats", getVendeurStats);
<<<<<<< HEAD
vendeurRouter.patch("/vendeur/:id/status", changeVendeurStatus);
vendeurRouter.put("/vendeur/:id/validate", validateVendeur);
vendeurRouter.put("/vendeur/:id/reject", rejectVendeur);
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======

// Admin — modération
vendeurRouter.put("/vendeur/:id/validate", ...authAdmin, validateVendeur);
vendeurRouter.put("/vendeur/:id/reject", ...authAdmin, rejectVendeur);
vendeurRouter.delete("/vendeur/:id", ...authAdmin, deleteVendeur);
vendeurRouter.put("/vendeur/:id/promote", ...authAdmin, promoteVendeur);
vendeurRouter.patch("/vendeur/:id/status", ...authAdmin, changeVendeurStatus);

// Authentifié
vendeurRouter.post(
  "/vendeur",
  auth,
  requireSelfOrAdmin("utilisateur"),
  uploaderVendeur,
  createVendeur,
);

vendeurRouter.put(
  "/vendeur/:id",
  auth,
  requireVendeurOwnerOrAdmin(),
  uploaderVendeur,
  updateVendeur,
);

vendeurRouter.put("/vendeur/:id/rating", auth, updateVendeurRating);
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)

vendeurRouter.put(
  "/vendeur/:id",
  auth,
  requireVendeurOwnerOrAdmin(),
  uploaderVendeur,
  updateVendeur,
);

vendeurRouter.put("/vendeur/:id/rating", auth, updateVendeurRating);

export default vendeurRouter;