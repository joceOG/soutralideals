import { Router } from "express";
import multer from "multer";
<<<<<<< HEAD
import auth, { authAdmin, optionalAuth } from "../middleware/authMiddleware.js";
import {
  requireSelfOrAdmin,
  requireVendeurOwnerOrAdmin,
} from "../middleware/entityAccess.js";
=======
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
import {
  createVendeur,
  getAllVendeurs,
  getVendeurById,
  updateVendeur,
  deleteVendeur,
<<<<<<< HEAD
=======
  // ✅ NOUVELLES MÉTHODES SDEALSAPP
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
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
} from "../controller/vendeurController.js";

// ✅ CONFIGURATION MULTER POUR UPLOAD TEMPORAIRE
const upload = multer({ dest: "uploads/" }); // Stockage temporaire avant Cloudinary

// ✅ MULTER MODERNISÉ : Accepter tous les fichiers nécessaires
const uploaderVendeur = upload.fields([
  { name: "shopLogo", maxCount: 1 },        // ✅ NOUVEAU: Logo boutique
  { name: "cni1", maxCount: 1 },           // Documents vérification
  { name: "cni2", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "businessLicense", maxCount: 1 }, // ✅ NOUVEAU: Licence commerciale
  { name: "taxDocument", maxCount: 1 },     // ✅ NOUVEAU: Document fiscal
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
]);

const vendeurRouter = Router();

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
vendeurRouter.get("/vendeurs/category/:category", getVendeursByCategory);
vendeurRouter.get("/vendeurs/search", searchVendeurs);
vendeurRouter.get("/vendeurs/top", getTopVendeurs);

// ✅ ROUTES CRUD PRINCIPALES
vendeurRouter.post("/vendeur", uploaderVendeur, createVendeur);
vendeurRouter.get("/vendeur", getAllVendeurs);
vendeurRouter.get("/vendeur/:id", getVendeurById);
vendeurRouter.put("/vendeur/:id", uploaderVendeur, updateVendeur);
vendeurRouter.delete("/vendeur/:id", deleteVendeur);

// ✅ ROUTES SPÉCIALISÉES
vendeurRouter.put("/vendeur/:id/rating", updateVendeurRating);
vendeurRouter.put("/vendeur/:id/promote", promoteVendeur);
vendeurRouter.get("/vendeur/:id/stats", getVendeurStats);
vendeurRouter.patch("/vendeur/:id/status", changeVendeurStatus);
vendeurRouter.put("/vendeur/:id/validate", validateVendeur);
vendeurRouter.put("/vendeur/:id/reject", rejectVendeur);
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)

export default vendeurRouter;
