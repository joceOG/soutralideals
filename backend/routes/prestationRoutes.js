import { Router } from 'express';
import { imageUpload } from '../utils/uploadMiddleware.js';
import auth, { optionalAuth, authAdmin } from '../middleware/authMiddleware.js';
import {
    createPrestation,
    getAllPrestations,
    getPrestationById,
    updatePrestation,
    changerStatutPrestation,
    deletePrestation,
    getPrestationsPrestataire,
    getPrestationsUtilisateur,
    getPrestationStats
} from '../controller/prestationController.js';

const prestationRouter = Router();

// STAB-11 : stats globales admin only (ne touche pas la machine Prestation)
prestationRouter.get('/prestations/stats', ...authAdmin, getPrestationStats);
prestationRouter.get('/prestations/prestataire/:prestataireId', auth, getPrestationsPrestataire);
prestationRouter.get('/prestations/utilisateur/:utilisateurId', auth, getPrestationsUtilisateur);

// ✅ ROUTES CRUD PRESTATIONS
prestationRouter.post('/prestation', auth, imageUpload.fields([
    { name: 'photosAvant', maxCount: 5 }
]), createPrestation);

prestationRouter.get('/prestations', optionalAuth, getAllPrestations);
prestationRouter.get('/prestation/:id', optionalAuth, getPrestationById);

prestationRouter.put('/prestation/:id', auth, imageUpload.fields([
    { name: 'photosApres', maxCount: 5 }
]), updatePrestation);

prestationRouter.patch('/prestation/:id/statut', auth, changerStatutPrestation);
prestationRouter.delete('/prestation/:id', auth, deletePrestation);

export default prestationRouter;

