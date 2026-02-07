import express from 'express';
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
import auth from '../middleware/authMiddleware.js';
import {
  requirePrestataireOwnerOrAdmin,
  requirePrestataireOwnerByBodyId,
} from '../middleware/entityAccess.js';
import {
  uploadDocument,
  finalizePrestataireProfile,
<<<<<<< HEAD
=======
import { 
  uploadDocument, 
  finalizePrestataireProfile, 
>>>>>>> 1ca350b (Dashboard Complet and Merge)
  getFinalizationStatus,
  upload 
} from '../controller/prestataireFinalizationController.js';
import prestataireModel from '../models/prestataireModel.js';

const router = express.Router();

// 🎯 UPLOAD D'UN DOCUMENT
router.post('/upload/document', upload.single('document'), uploadDocument);

// 🎯 FINALISATION DU PROFIL
router.put('/prestataire/:id/finalize', finalizePrestataireProfile);

// 🎯 RÉCUPÉRER LE STATUT DE FINALISATION
router.get('/prestataire/:id/finalization-status', getFinalizationStatus);

<<<<<<< HEAD
// Documents identité — propriétaire ou admin (admin pour modération dashboard)
router.get(
  '/prestataire/:id/documents',
  auth,
  requirePrestataireOwnerOrAdmin(),
  getPrestataireDocuments,
);
=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
import { 
  uploadDocument, 
  finalizePrestataireProfile, 
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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

<<<<<<< HEAD
=======
>>>>>>> 1ca350b (Dashboard Complet and Merge)
// 🎯 RÉCUPÉRER LES DOCUMENTS D'UN PRESTATAIRE
router.get('/prestataire/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    
    const prestataire = await prestataireModel.findById(id)
      .populate('utilisateur', 'nom prenom telephone email')
      .populate('service', 'nomservice')
      .select('cni1 cni2 selfie diplomeCertificat attestationAssurance finalizationStatus');
    
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire non trouvé' });
    }
    
    res.status(200).json({
      success: true,
      prestataire: {
        id: prestataire._id,
        utilisateur: prestataire.utilisateur,
        service: prestataire.service,
        documents: {
          cni1: prestataire.cni1,
          cni2: prestataire.cni2,
          selfie: prestataire.selfie,
          certificates: prestataire.diplomeCertificat,
          insurance: prestataire.attestationAssurance,
        },
        finalizationStatus: prestataire.finalizationStatus
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération documents:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des documents' });
  }
});
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
// Documents identité — propriétaire ou admin (admin pour modération dashboard)
router.get(
  '/prestataire/:id/documents',
  auth,
  requirePrestataireOwnerOrAdmin(),
  getPrestataireDocuments,
);
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 1ca350b (Dashboard Complet and Merge)

export default router;
