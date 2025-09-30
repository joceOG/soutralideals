import Avis from '../models/avisModel.js';
import mongoose from 'mongoose';

// 📝 CRÉER UN AVIS
export const createAvis = async (req, res) => {
  try {
    const {
      objetType,
      objetId,
      note,
      titre,
      commentaire,
      categories,
      medias,
      recommande,
      localisation,
      tags,
      anonyme
    } = req.body;

    // Validation des données
    if (!objetType || !objetId || !note || !titre || !commentaire) {
      return res.status(400).json({ 
        error: 'Champs obligatoires manquants' 
      });
    }

    if (note < 1 || note > 5) {
      return res.status(400).json({ 
        error: 'La note doit être entre 1 et 5' 
      });
    }

    // Vérifier si l'utilisateur a déjà donné un avis pour cet objet
    const avisExistant = await Avis.findOne({
      auteur: req.userId,
      objetType,
      objetId
    });

    if (avisExistant) {
      return res.status(400).json({ 
        error: 'Vous avez déjà donné un avis pour cet élément' 
      });
    }

    // Créer l'avis
    const nouvelAvis = new Avis({
      auteur: req.userId,
      objetType,
      objetId,
      note,
      titre,
      commentaire,
      categories: categories || [],
      medias: medias || [],
      recommande: recommande !== undefined ? recommande : true,
      localisation: localisation || {},
      tags: tags || [],
      anonyme: anonyme || false,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const avisSauvegarde = await nouvelAvis.save();
    
    // Populer les données de l'auteur
    await avisSauvegarde.populate('auteur', 'nom prenom photoProfil');

    res.status(201).json({
      message: 'Avis créé avec succès',
      avis: avisSauvegarde
    });

  } catch (error) {
    console.error('Erreur création avis:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création de l\'avis',
      details: error.message 
    });
  }
};

// 📋 RÉCUPÉRER TOUS LES AVIS
export const getAllAvis = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      objetType,
      objetId,
      note,
      statut = 'PUBLIE',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Construction du filtre
    const filtre = {};
    
    if (objetType) filtre.objetType = objetType;
    if (objetId) filtre.objetId = objetId;
    if (note) filtre.note = parseInt(note);
    if (statut) filtre.statut = statut;

    // Options de tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const avis = await Avis.find(filtre)
      .populate('auteur', 'nom prenom photoProfil verifie')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Avis.countDocuments(filtre);

    res.json({
      avis,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur récupération avis:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des avis',
      details: error.message 
    });
  }
};

// 🔍 RÉCUPÉRER UN AVIS PAR ID
export const getAvisById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const avis = await Avis.findById(id)
      .populate('auteur', 'nom prenom photoProfil verifie')
      .populate('reponse.auteur', 'nom prenom photoProfil');

    if (!avis) {
      return res.status(404).json({ error: 'Avis non trouvé' });
    }

    res.json(avis);

  } catch (error) {
    console.error('Erreur récupération avis:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération de l\'avis',
      details: error.message 
    });
  }
};

// 📝 MODIFIER UN AVIS
export const updateAvis = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // Vérifier que l'utilisateur est l'auteur de l'avis
    const avis = await Avis.findById(id);
    if (!avis) {
      return res.status(404).json({ error: 'Avis non trouvé' });
    }

    if (avis.auteur.toString() !== req.userId) {
      return res.status(403).json({ error: 'Non autorisé à modifier cet avis' });
    }

    // Mise à jour
    const avisModifie = await Avis.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('auteur', 'nom prenom photoProfil');

    res.json({
      message: 'Avis modifié avec succès',
      avis: avisModifie
    });

  } catch (error) {
    console.error('Erreur modification avis:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la modification de l\'avis',
      details: error.message 
    });
  }
};

// 🗑️ SUPPRIMER UN AVIS
export const deleteAvis = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // Vérifier que l'utilisateur est l'auteur de l'avis
    const avis = await Avis.findById(id);
    if (!avis) {
      return res.status(404).json({ error: 'Avis non trouvé' });
    }

    if (avis.auteur.toString() !== req.userId) {
      return res.status(403).json({ error: 'Non autorisé à supprimer cet avis' });
    }

    await Avis.findByIdAndDelete(id);

    res.json({ message: 'Avis supprimé avec succès' });

  } catch (error) {
    console.error('Erreur suppression avis:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de l\'avis',
      details: error.message 
    });
  }
};

// 📊 STATISTIQUES D'UN OBJET
export const getStatsObjet = async (req, res) => {
  try {
    const { objetType, objetId } = req.params;

    const stats = await Avis.getStatsByObjet(objetType, objetId);

    if (stats.length === 0) {
      return res.json({
        totalAvis: 0,
        moyenneNote: 0,
        distributionNotes: { note1: 0, note2: 0, note3: 0, note4: 0, note5: 0 }
      });
    }

    const result = stats[0];
    
    // Calculer la distribution des notes
    const distribution = result.distributionNotes.reduce((acc, note) => {
      acc[note] = (acc[note] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalAvis: result.totalAvis,
      moyenneNote: Math.round(result.moyenneNote * 10) / 10,
      distributionNotes: {
        note1: distribution.note1 || 0,
        note2: distribution.note2 || 0,
        note3: distribution.note3 || 0,
        note4: distribution.note4 || 0,
        note5: distribution.note5 || 0
      }
    });

  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({ 
      error: 'Erreur lors du calcul des statistiques',
      details: error.message 
    });
  }
};

// 👍 MARQUER UN AVIS COMME UTILE
export const marquerUtile = async (req, res) => {
  try {
    const { id } = req.params;
    const { utile } = req.body; // true pour utile, false pour pas utile

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const avis = await Avis.findById(id);
    if (!avis) {
      return res.status(404).json({ error: 'Avis non trouvé' });
    }

    if (utile) {
      avis.utile += 1;
    } else {
      avis.pasUtile += 1;
    }

    await avis.save();

    res.json({
      message: 'Merci pour votre retour',
      utile: avis.utile,
      pasUtile: avis.pasUtile
    });

  } catch (error) {
    console.error('Erreur marquage utile:', error);
    res.status(500).json({ 
      error: 'Erreur lors du marquage',
      details: error.message 
    });
  }
};

// 💬 RÉPONDRE À UN AVIS
export const repondreAvis = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenu } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const avis = await Avis.findById(id);
    if (!avis) {
      return res.status(404).json({ error: 'Avis non trouvé' });
    }

    // Vérifier que l'utilisateur peut répondre (propriétaire de l'objet)
    // Cette logique dépend de votre structure de données
    // Pour l'instant, on autorise tous les utilisateurs authentifiés

    avis.reponse = {
      contenu,
      date: new Date(),
      auteur: req.userId
    };

    await avis.save();

    res.json({
      message: 'Réponse ajoutée avec succès',
      reponse: avis.reponse
    });

  } catch (error) {
    console.error('Erreur réponse avis:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'ajout de la réponse',
      details: error.message 
    });
  }
};

// 🚨 SIGNALER UN AVIS
export const signalerAvis = async (req, res) => {
  try {
    const { id } = req.params;
    const { motifs } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const avis = await Avis.findById(id);
    if (!avis) {
      return res.status(404).json({ error: 'Avis non trouvé' });
    }

    avis.signale = true;
    avis.motifsSignalement = motifs || [];
    avis.statut = 'MODERE';

    await avis.save();

    res.json({ message: 'Avis signalé avec succès' });

  } catch (error) {
    console.error('Erreur signalement avis:', error);
    res.status(500).json({ 
      error: 'Erreur lors du signalement',
      details: error.message 
    });
  }
};

// 📊 AVIS RÉCENTS
export const getAvisRecents = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const avisRecents = await Avis.getAvisRecents(parseInt(limit));

    res.json(avisRecents);

  } catch (error) {
    console.error('Erreur avis récents:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des avis récents',
      details: error.message 
    });
  }
};

// 🔍 RECHERCHER DES AVIS
export const searchAvis = async (req, res) => {
  try {
    const { q, objetType, note, ville } = req.query;

    const filtre = { statut: 'PUBLIE' };

    if (objetType) filtre.objetType = objetType;
    if (note) filtre.note = parseInt(note);
    if (ville) filtre['localisation.ville'] = new RegExp(ville, 'i');

    if (q) {
      filtre.$or = [
        { titre: new RegExp(q, 'i') },
        { commentaire: new RegExp(q, 'i') },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    const avis = await Avis.find(filtre)
      .populate('auteur', 'nom prenom photoProfil')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(avis);

  } catch (error) {
    console.error('Erreur recherche avis:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la recherche',
      details: error.message 
    });
  }
};



