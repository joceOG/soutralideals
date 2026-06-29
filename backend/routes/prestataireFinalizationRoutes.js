import express from 'express';
import auth from '../middleware/authMiddleware.js';
import {
  requirePrestataireOwnerOrAdmin,
  requirePrestataireOwnerByBodyId,
} from '../middleware/entityAccess.js';
import {
  uploadDocument,
  finalizePrestataireProfile,
  getFinalizationStatus,
  getPrestataireDocuments,
  upload
} from '../controller/prestataireFinalizationController.js';

const router = express.Router();

// Upload document — propriétaire ou admin
router.post(
  '/upload/document',
  auth,
  requirePrestataireOwnerByBodyId(),
  upload.single('document'),
  uploadDocument,
);

// Finalisation profil — propriétaire ou admin
router.put(
  '/prestataire/:id/finalize',
  auth,
  requirePrestataireOwnerOrAdmin(),
  finalizePrestataireProfile,
);

// Statut finalisation — propriétaire ou admin
router.get(
  '/prestataire/:id/finalization-status',
  auth,
  requirePrestataireOwnerOrAdmin(),
  getFinalizationStatus,
);

// Documents identité — propriétaire ou admin (admin pour modération dashboard)
router.get(
  '/prestataire/:id/documents',
  auth,
  requirePrestataireOwnerOrAdmin(),
  getPrestataireDocuments,
);

export default router;
