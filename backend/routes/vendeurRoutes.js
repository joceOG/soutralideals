import { Router } from "express";
import multer from "multer";
import {
  createVendeur,
  getAllVendeurs,
  getVendeurById,
  updateVendeur,
  deleteVendeur,
  // ✅ NOUVELLES MÉTHODES SDEALSAPP
  updateVendeurRating,
  promoteVendeur,
  getVendeursByCategory,
  searchVendeurs,
  getTopVendeurs,
  getVendeurStats,
  changeVendeurStatus,
  validateVendeur,
  rejectVendeur,
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
]);

const vendeurRouter = Router();

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

export default vendeurRouter;