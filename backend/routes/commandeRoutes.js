import { Router } from 'express';
import {
    createCommande,
    getAllCommandes,
    getCommandeById,
    updateCommande,
    deleteCommande,
    getCommandeStats
} from '../controller/commandeController.js';
import auth from '../middleware/authMiddleware.js';

const commandeRouter = Router();

// ⚠️ Routes spécifiques AVANT /:id
commandeRouter.get('/commandes/stats', auth, getCommandeStats);
commandeRouter.get('/commandes/mes-commandes', auth, async (req, res) => {
  req.query.utilisateur = req.utilisateur._id.toString();
  return getAllCommandes(req, res);
});

// ✅ ROUTES CRUD COMMANDES (protégées)
commandeRouter.post('/commande', auth, createCommande);
commandeRouter.get('/commandes', auth, getAllCommandes);
commandeRouter.get('/commande/:id', auth, getCommandeById);
commandeRouter.put('/commande/:id', auth, updateCommande);
commandeRouter.delete('/commande/:id', auth, deleteCommande);

export default commandeRouter;
