import Favorite from '../models/favoriteModel.js';
import Utilisateur from '../models/utilisateurModel.js';

// ➕ AJOUTER UN FAVORI
export const addFavorite = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id || req.body.utilisateur;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { 
      objetType, 
      objetId, 
      titre, 
      description, 
      image, 
      prix, 
      devise, 
      categorie, 
      tags, 
      localisation, 
      note, 
      listePersonnalisee, 
      notesPersonnelles,
      alertePrix,
      alerteDisponibilite 
    } = req.body;
    
    if (!objetType || !objetId || !titre) {
      return res.status(400).json({ error: 'objetType, objetId et titre sont requis' });
    }
    
    // Vérifier si le favori existe déjà
    const existingFavorite = await Favorite.findOne({
      utilisateur: userId,
      objetType,
      objetId,
      statut: { $ne: 'SUPPRIME' }
    });
    
    if (existingFavorite) {
      return res.status(200).json({ 
        message: 'Déjà en favori',
        favorite: existingFavorite 
      });
    }
    
    const favorite = await Favorite.create({
      utilisateur: userId,
      objetType,
      objetId,
      titre,
      description,
      image,
      prix,
      devise,
      categorie,
      tags,
      localisation,
      note,
      listePersonnalisee,
      notesPersonnelles,
      alertePrix: alertePrix || false,
      alerteDisponibilite: alerteDisponibilite || false
    });
    
    res.status(201).json(favorite);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ message: 'Déjà en favori' });
    }
    res.status(500).json({ error: err.message });
  }
};

// ➖ SUPPRIMER UN FAVORI
export const removeFavorite = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { id } = req.params;
    const favorite = await Favorite.findOneAndUpdate(
      { _id: id, utilisateur: userId },
      { statut: 'SUPPRIME' },
      { new: true }
    );
    
    if (!favorite) {
      return res.status(404).json({ error: 'Favori introuvable' });
    }
    
    res.status(200).json({ message: 'Favori supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📋 LISTER LES FAVORIS
export const listFavorites = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { 
      objetType, 
      statut = 'ACTIF', 
      categorie, 
      ville, 
      listePersonnalisee,
      page = 1, 
      limit = 20,
      sortBy = 'dateAjout',
      sortOrder = 'desc'
    } = req.query;
    
    // Construction du filtre
    const filter = { utilisateur: userId };
    if (objetType) filter.objetType = objetType;
    if (statut) filter.statut = statut;
    if (categorie) filter.categorie = new RegExp(categorie, 'i');
    if (ville) filter['localisation.ville'] = new RegExp(ville, 'i');
    if (listePersonnalisee) filter.listePersonnalisee = listePersonnalisee;
    
    // Pagination
    const skip = (page - 1) * limit;
    
    // Tri
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const favorites = await Favorite.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('utilisateur', 'nom prenom photoProfil');
    
    const total = await Favorite.countDocuments(filter);
    
    res.status(200).json({
      favorites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔍 RECHERCHER DANS LES FAVORIS
export const searchFavorites = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { q, objetType, categorie, ville } = req.query;
    
    const filter = { 
      utilisateur: userId, 
      statut: 'ACTIF' 
    };
    
    if (objetType) filter.objetType = objetType;
    if (categorie) filter.categorie = new RegExp(categorie, 'i');
    if (ville) filter['localisation.ville'] = new RegExp(ville, 'i');
    
    if (q) {
      filter.$or = [
        { titre: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { categorie: new RegExp(q, 'i') },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }
    
    const favorites = await Favorite.find(filter)
      .sort({ dateAjout: -1 })
      .populate('utilisateur', 'nom prenom photoProfil');
    
    res.status(200).json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ MODIFIER UN FAVORI
export const updateFavorite = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { id } = req.params;
    const updateData = req.body;
    
    const favorite = await Favorite.findOneAndUpdate(
      { _id: id, utilisateur: userId },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!favorite) {
      return res.status(404).json({ error: 'Favori introuvable' });
    }
    
    res.status(200).json(favorite);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📊 STATISTIQUES DES FAVORIS
export const getFavoriteStats = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const stats = await Favorite.aggregate([
      { $match: { utilisateur: userId, statut: 'ACTIF' } },
      {
        $group: {
          _id: null,
          totalFavorites: { $sum: 1 },
          byObjetType: {
            $push: {
              type: '$objetType',
              count: 1
            }
          },
          byCategorie: {
            $push: {
              categorie: '$categorie',
              count: 1
            }
          },
          recentFavorites: {
            $sum: {
              $cond: [
                { $gte: ['$dateAjout', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    res.status(200).json(stats[0] || {
      totalFavorites: 0,
      byObjetType: [],
      byCategorie: [],
      recentFavorites: 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🏷️ GÉRER LES LISTES PERSONNALISÉES
export const getCustomLists = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const lists = await Favorite.distinct('listePersonnalisee', {
      utilisateur: userId,
      statut: 'ACTIF',
      listePersonnalisee: { $ne: null, $ne: '' }
    });
    
    res.status(200).json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔄 ARCHIVER UN FAVORI
export const archiveFavorite = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { id } = req.params;
    const favorite = await Favorite.findOneAndUpdate(
      { _id: id, utilisateur: userId },
      { statut: 'ARCHIVE' },
      { new: true }
    );
    
    if (!favorite) {
      return res.status(404).json({ error: 'Favori introuvable' });
    }
    
    res.status(200).json({ message: 'Favori archivé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


