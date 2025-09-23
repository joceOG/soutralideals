import { Router } from 'express';
import { addFavorite, removeFavorite, listFavorites } from '../controller/favoriteController.js';

const favoriteRouter = Router();

favoriteRouter.post('/favorites', addFavorite);
favoriteRouter.get('/favorites', listFavorites);
favoriteRouter.delete('/favorites/:id', removeFavorite);

export default favoriteRouter;


