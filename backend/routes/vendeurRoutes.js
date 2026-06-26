import { Router } from "express";
import multer from "multer";
import auth, { authAdmin } from "../middleware/authMiddleware.js";
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

// Public — catalogue (routes spécifiques avant /:id)
vendeurRouter.get("/vendeur/pending/list", ...authAdmin, getPendingVendeurs);
vendeurRouter.get("/vendeur", getAllVendeurs);
vendeurRouter.get("/vendeurs/category/:category", getVendeursByCategory);
vendeurRouter.get("/vendeurs/search", searchVendeurs);
vendeurRouter.get("/vendeurs/top", getTopVendeurs);
vendeurRouter.get("/vendeur/:id", getVendeurById);
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

vendeurRouter.put(
  "/vendeur/:id",
  auth,
  requireVendeurOwnerOrAdmin(),
  uploaderVendeur,
  updateVendeur,
);

vendeurRouter.put("/vendeur/:id/rating", auth, updateVendeurRating);

export default vendeurRouter;