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

// ✅ ROUTES CRUD PRINCIPALES (modernisées)
vendeurRouter.post("/vendeur", uploaderVendeur, createVendeur);
vendeurRouter.get("/vendeur", getAllVendeurs);                    // Avec filtres avancés
vendeurRouter.get("/vendeur/:id", getVendeurById);               // Avec stats
vendeurRouter.put("/vendeur/:id", uploaderVendeur, updateVendeur); // Moderne
vendeurRouter.delete("/vendeur/:id", deleteVendeur);

// ✅ ROUTES SPÉCIALISÉES SDEALSAPP

// 🌟 SYSTÈME DE NOTATION
vendeurRouter.put("/vendeur/:id/rating", updateVendeurRating);     // Mettre à jour note
vendeurRouter.put("/vendeur/:id/promote", promoteVendeur);         // Promouvoir vendeur

// 🔍 RECHERCHE & DÉCOUVERTE
vendeurRouter.get("/vendeurs/category/:category", getVendeursByCategory); // Par catégorie
vendeurRouter.get("/vendeurs/search", searchVendeurs);             // Recherche avancée
vendeurRouter.get("/vendeurs/top", getTopVendeurs);               // Top vendeurs

// 📊 STATISTIQUES & ANALYTICS
vendeurRouter.get("/vendeur/:id/stats", getVendeurStats);         // Statistiques vendeur

// ⚙️ GESTION ADMINISTRATIVE
vendeurRouter.patch("/vendeur/:id/status", changeVendeurStatus);   // Changer statut

// 🆕 Routes validation (Option C)
vendeurRouter.get("/vendeur/pending/list", getPendingVendeurs);
vendeurRouter.put("/vendeur/:id/validate", validateVendeur);
vendeurRouter.put("/vendeur/:id/reject", rejectVendeur);

export default vendeurRouter;
