import { Router } from 'express';
import multer from 'multer';
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

const upload = multer({ dest: 'uploads/' }); // Stockage temporaire pour Cloudinary

const prestationRouter = Router();

// ✅ ROUTES CRUD PRESTATIONS
prestationRouter.post('/prestation', upload.fields([
    { name: 'photosAvant', maxCount: 5 }
]), createPrestation);

prestationRouter.get('/prestations', getAllPrestations);
prestationRouter.get('/prestation/:id', getPrestationById);

prestationRouter.put('/prestation/:id', upload.fields([
    { name: 'photosApres', maxCount: 5 }
]), updatePrestation);

prestationRouter.delete('/prestation/:id', deletePrestation);

// ✅ ROUTES SPÉCIALISÉES
prestationRouter.patch('/prestation/:id/statut', changerStatutPrestation);
prestationRouter.get('/prestations/prestataire/:prestataireId', getPrestationsPrestataire);
prestationRouter.get('/prestations/utilisateur/:utilisateurId', getPrestationsUtilisateur);
prestationRouter.get('/prestations/stats', getPrestationStats);

export default prestationRouter;

