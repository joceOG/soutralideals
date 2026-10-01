import { Router } from "express";

import { documentUpload } from "../utils/uploadMiddleware.js";

import auth, { authAdmin, optionalAuth } from "../middleware/authMiddleware.js";

import { requirePrestataireOwnerOnly } from "../middleware/entityAccess.js";
import { requireProfessionalCapability, requirePrestataireSelfDeactivateGate } from "../middleware/requireProfessionalCapability.js";

const requirePrestataireSelfDeactivateGateMw = requirePrestataireSelfDeactivateGate();

const requirePrestataireProfileSelf = requireProfessionalCapability('Prestataire', {
  requireOperational: false,
  allowAdmin: false,
});

import {

  requirePrestataireCreatePreUpload,

  requirePrestataireCreatePostUpload,

  requirePrestataireUpdatePreUpload,

  rejectUnknownPrestataireUploadFields,

} from "../middleware/prestataireMultipartGate.js";

import {

  createPrestataire,

  getAllPrestataires,

  getPrestataireById,

  updatePrestataire,

  deletePrestataire,

  validatePrestataire,

  rejectPrestataire,

  getPendingPrestataires,

  deactivatePrestataire,

  reactivatePrestataire,

  getHomePreview,

} from "../controller/prestataireController.js";



const prestataireRouter = Router();



const uploadFields = documentUpload.fields([

  { name: "cni1", maxCount: 1 },

  { name: "cni2", maxCount: 1 },

  { name: "selfie", maxCount: 1 },

  { name: "diplomeCertificat", maxCount: 10 },

  { name: "attestationAssurance", maxCount: 1 },

]);



function runDocumentUpload(req, res, next) {

  uploadFields(req, res, (err) => {

    if (err) {

      return res.status(400).json({ error: err.message || 'Fichier invalide' });

    }

    next();

  });

}



// Public — catalogue (routes spécifiques avant /:id)

prestataireRouter.get("/prestataire/pending/list", ...authAdmin, getPendingPrestataires);

// Route spécifique avant /:id — aperçu accueil avec filtre photo AVANT limite
prestataireRouter.get("/prestataire/home-preview", optionalAuth, getHomePreview);

prestataireRouter.get("/prestataire", optionalAuth, getAllPrestataires);

prestataireRouter.get("/prestataire/:id", optionalAuth, getPrestataireById);



// Admin — modération

prestataireRouter.put("/prestataire/:id/validate", ...authAdmin, validatePrestataire);

prestataireRouter.put("/prestataire/:id/reject", ...authAdmin, rejectPrestataire);

prestataireRouter.delete("/prestataire/:id", ...authAdmin, deletePrestataire);



// Authentifié — inscription / mise à jour (auth → autorisation → Multer → validation → contrôleur)

prestataireRouter.post(

  "/prestataire",

  auth,

  requirePrestataireCreatePreUpload,

  runDocumentUpload,

  rejectUnknownPrestataireUploadFields,

  requirePrestataireCreatePostUpload,

  createPrestataire,

);



prestataireRouter.put(

  "/prestataire/:id",

  auth,

  requirePrestataireUpdatePreUpload,

  runDocumentUpload,

  rejectUnknownPrestataireUploadFields,

  updatePrestataire,

);



prestataireRouter.post(

  "/prestataire/:id/deactivate",

  auth,

  requirePrestataireOwnerOnly(),

  requirePrestataireSelfDeactivateGateMw,

  deactivatePrestataire,

);



prestataireRouter.post(

  "/prestataire/:id/reactivate",

  auth,

  requirePrestataireOwnerOnly(),

  requirePrestataireProfileSelf,

  reactivatePrestataire,

);



export default prestataireRouter;


