const Favorite = require('../models/favoriteModel');
const Utilisateur = require('../models/utilisateurModel');

export const addFavorite = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id || req.body.utilisateur;
    if (!userId) return res.status(401).json({ error: 'Auth requise' });
    const { service, title, image } = req.body;
    if (!title) return res.status(400).json({ error: 'title requis' });
    const fav = await Favorite.create({ utilisateur: userId, service, title, image });
    return res.status(201).json(fav);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ message: 'Déjà en favori' });
    }
    res.status(500).json({ error: err.message });
  }
};

export const removeFavorite = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Auth requise' });
    const { id } = req.params;
    const deleted = await Favorite.findOneAndDelete({ _id: id, utilisateur: userId });
    if (!deleted) return res.status(404).json({ error: 'Favori introuvable' });
    res.status(200).json({ message: 'Supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listFavorites = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Auth requise' });
    const items = await Favorite.find({ utilisateur: userId }).sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


