import { Router } from 'express';
import { imageUpload } from '../utils/uploadMiddleware.js';
import auth, { optionalAuth } from '../middleware/authMiddleware.js';
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

// ✅ ROUTES SPÉCIFIQUES avant les routes paramétriques
prestationRouter.get('/prestations/stats', auth, getPrestationStats);
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

