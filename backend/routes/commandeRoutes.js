import { Router } from 'express';
import {
    createCommande,
    getAllCommandes,
    getCommandeById,
    updateCommande,
    deleteCommande,
    getCommandeStats
} from '../controller/commandeController.js';

const commandeRouter = Router();

// ✅ ROUTES CRUD COMMANDES
commandeRouter.post('/commande', createCommande);
commandeRouter.get('/commandes', getAllCommandes);
commandeRouter.get('/commande/:id', getCommandeById);
commandeRouter.put('/commande/:id', updateCommande);
commandeRouter.delete('/commande/:id', deleteCommande);

// ✅ ROUTES SPÉCIALISÉES
commandeRouter.get('/commandes/stats', getCommandeStats);

export default commandeRouter;

