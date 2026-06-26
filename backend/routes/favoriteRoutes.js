import { Router } from 'express';
import auth from '../middleware/authMiddleware.js';
import { 
  addFavorite, 
  removeFavorite, 
  listFavorites, 
  searchFavorites,
  updateFavorite,
  getFavoriteStats,
  getCustomLists,
  archiveFavorite
} from '../controller/favoriteController.js';

const favoriteRouter = Router();

// ✅ ROUTES CRUD FAVORIS
favoriteRouter.post('/favorites', auth, addFavorite);
favoriteRouter.get('/favorites', auth, listFavorites);
favoriteRouter.get('/favorites/search', auth, searchFavorites);
favoriteRouter.put('/favorites/:id', auth, updateFavorite);
favoriteRouter.delete('/favorites/:id', auth, removeFavorite);

// ✅ ROUTE TOGGLE (chercher puis supprimer ou créer)
favoriteRouter.post('/favorites/toggle', auth, async (req, res) => {
  const userId = req.utilisateur._id;
  const { objetType, objetId } = req.body;
  const Favorite = (await import('../models/favoriteModel.js')).default;
  const existing = await Favorite.findOne({ utilisateur: userId, objetType, objetId, statut: { $ne: 'SUPPRIME' } });
  if (existing) {
    await Favorite.findByIdAndUpdate(existing._id, { statut: 'SUPPRIME' });
    return res.json({ isFavorite: false });
  }
  req.body.utilisateur = userId;
  return addFavorite(req, res);
});

// ✅ ROUTES SPÉCIFIQUES
favoriteRouter.get('/favorites/stats', auth, getFavoriteStats);
favoriteRouter.get('/favorites/lists', auth, getCustomLists);
favoriteRouter.patch('/favorites/:id/archive', auth, archiveFavorite);

export default favoriteRouter;


