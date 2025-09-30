import { Router } from 'express';
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
favoriteRouter.post('/favorites', addFavorite);
favoriteRouter.get('/favorites', listFavorites);
favoriteRouter.get('/favorites/search', searchFavorites);
favoriteRouter.put('/favorites/:id', updateFavorite);
favoriteRouter.delete('/favorites/:id', removeFavorite);

// ✅ ROUTES SPÉCIFIQUES
favoriteRouter.get('/favorites/stats', getFavoriteStats);
favoriteRouter.get('/favorites/lists', getCustomLists);
favoriteRouter.patch('/favorites/:id/archive', archiveFavorite);

export default favoriteRouter;


