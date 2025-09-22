const express = require('express');
const { addFavorite, removeFavorite, listFavorites } = require('../controller/favoriteController');

const favoriteRouter = express.Router();

favoriteRouter.post('/favorites', addFavorite);
favoriteRouter.get('/favorites', listFavorites);
favoriteRouter.delete('/favorites/:id', removeFavorite);

module.exports = favoriteRouter;


