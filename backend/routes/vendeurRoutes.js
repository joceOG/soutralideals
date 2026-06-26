import { Router } from "express";
import multer from "multer";
import auth, { authAdmin, optionalAuth } from "../middleware/authMiddleware.js";
import {
  requireSelfOrAdmin,
  requireVendeurOwnerOrAdmin,
} from "../middleware/entityAccess.js";
import {
  createVendeur,
  getAllVendeurs,
  getVendeurById,
  updateVendeur,
  deleteVendeur,
  updateVendeurRating,
  promoteVendeur,
  getVendeursByCategory,
  searchVendeurs,
  getTopVendeurs,
  getVendeurStats,
  changeVendeurStatus,
  validateVendeur,
  rejectVendeur,
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

vendeurRouter.put(
  "/vendeur/:id",
  auth,
  requireVendeurOwnerOrAdmin(),
  uploaderVendeur,
  updateVendeur,
);

vendeurRouter.put("/vendeur/:id/rating", auth, updateVendeurRating);

export default vendeurRouter;