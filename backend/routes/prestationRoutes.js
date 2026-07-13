import { Router } from 'express';
import multer from 'multer';
import auth from '../middleware/authMiddleware.js';
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

const upload = multer({ dest: 'uploads/' });

const prestationRouter = Router();

// ✅ ROUTES SPÉCIFIQUES avant les routes paramétriques
prestationRouter.get('/prestations/stats', auth, getPrestationStats);
prestationRouter.get('/prestations/prestataire/:prestataireId', auth, getPrestationsPrestataire);
prestationRouter.get('/prestations/utilisateur/:utilisateurId', auth, getPrestationsUtilisateur);

// ✅ ROUTES CRUD PRESTATIONS
prestationRouter.post('/prestation', auth, upload.fields([
    { name: 'photosAvant', maxCount: 5 }
]), createPrestation);

prestationRouter.get('/prestations', getAllPrestations);
prestationRouter.get('/prestation/:id', getPrestationById);

prestationRouter.put('/prestation/:id', auth, upload.fields([
    { name: 'photosApres', maxCount: 5 }
]), updatePrestation);

prestationRouter.patch('/prestation/:id/statut', auth, changerStatutPrestation);
prestationRouter.delete('/prestation/:id', auth, deletePrestation);

export default prestationRouter;

