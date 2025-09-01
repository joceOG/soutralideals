import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import {
  createVendeur,
  getAllVendeurs,
  getVendeurById,
  updateVendeur,
  deleteVendeur,
} from "../controller/vendeurController.js";

// 🧰 Configuration de Cloudinary (tu peux adapter avec ton .env)
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "vendeurs",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage });

// 📌 Multer : accepter cni1, cni2, selfie
const uploaderVendeur = upload.fields([
  { name: "cni1", maxCount: 1 },
  { name: "cni2", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
]);

const vendeurRouter = Router();

// 🔹 Créer un vendeur avec fichiers
vendeurRouter.post("/vendeur", uploaderVendeur, createVendeur);

// 🔹 Récupérer tous les vendeurs
vendeurRouter.get("/vendeur", getAllVendeurs);

// 🔹 Récupérer un vendeur par ID
vendeurRouter.get("/vendeur/:id", getVendeurById);

// 🔹 Mettre à jour un vendeur avec fichiers (optionnels)
vendeurRouter.put("/vendeur/:id", uploaderVendeur, updateVendeur);

// 🔹 Supprimer un vendeur par ID
vendeurRouter.delete("/vendeur/:id", deleteVendeur);

export default vendeurRouter;
