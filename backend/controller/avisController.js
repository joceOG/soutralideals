import Avis from '../models/avisModel.js';
import vendeurModel from '../models/vendeurModel.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import articleModel from '../models/articleModel.js';
import mongoose from 'mongoose';
import { isAdmin } from '../utils/accessControl.js';
import { pickFields } from '../utils/pickFields.js';
import { syncEntityRating } from '../utils/ratingSync.js';

const AVIS_EDITABLE_FIELDS = [
  'note', 'titre', 'commentaire', 'categories', 'medias',
  'recommande', 'localisation', 'tags', 'anonyme',
];

const VALID_SIGNALEMENT_MOTIFS = [
  'CONTENU_INAPPROPRIE', 'FAUSSE_INFORMATION', 'SPAM', 'HARCELEMENT', 'AUTRE',
];

function getAuthUserId(req) {
  return req.utilisateur?._id?.toString();
}

async function isObjetOwner(userId, objetType, objetId) {
  switch (objetType) {
    case 'VENDEUR': {
      const doc = await vendeurModel.findById(objetId).select('utilisateur');
      return doc?.utilisateur?.toString() === userId;
    }
    case 'PRESTATAIRE': {
      const doc = await prestataireModel.findById(objetId).select('utilisateur');
      return doc?.utilisateur?.toString() === userId;
    }
    case 'FREELANCE': {
      const doc = await freelanceModel.findById(objetId).select('utilisateur');
      return doc?.utilisateur?.toString() === userId;
    }
    case 'ARTICLE': {
      const doc = await articleModel.findById(objetId).populate({ path: 'vendeur', select: 'utilisateur' });
      return doc?.vendeur?.utilisateur?.toString() === userId;
    }
    default:
      return false;
  }
}

// 📝 CRÉER UN AVIS
export const createAvis = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

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

    if (!objetType || !objetId || !note) {
      return res.status(400).json({ 
        error: 'Champs obligatoires manquants (objetType, objetId, note)' 
      });
    }

    if (note < 1 || note > 5) {
      return res.status(400).json({ 
        error: 'La note doit être entre 1 et 5' 
      });
    }

    const avisExistant = await Avis.findOne({
      auteur: userId,
      objetType,
      objetId
    });

    if (avisExistant) {
      return res.status(400).json({ 
        error: 'Vous avez déjà donné un avis pour cet élément' 
      });
    }

    const nouvelAvis = new Avis({
      auteur: userId,
      objetType,
      objetId,
      note,
      ...(titre?.trim() ? { titre: titre.trim() } : {}),
      ...(commentaire?.trim() ? { commentaire: commentaire.trim() } : {}),
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
    await avisSauvegarde.populate('auteur', 'nom prenom photoProfil');

    if (avisSauvegarde.statut === 'PUBLIE') {
      await syncEntityRating(objetType, objetId);
    }

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

    const filtre = {};
    
    if (objetType) filtre.objetType = objetType;
    if (objetId) filtre.objetId = objetId;
    if (note) filtre.note = parseInt(note);
    if (statut) filtre.statut = statut;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

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
    const userId = getAuthUserId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const avis = await Avis.findById(id);
    if (!avis) {
      return res.status(404).json({ error: 'Avis non trouvé' });
    }

    if (!isAdmin(req) && avis.auteur.toString() !== userId) {
      return res.status(403).json({ error: 'Non autorisé à modifier cet avis' });
    }

    const updates = pickFields(req.body, AVIS_EDITABLE_FIELDS);
    if (updates.note !== undefined && (updates.note < 1 || updates.note > 5)) {
      return res.status(400).json({ error: 'La note doit être entre 1 et 5' });
    }

    const avisModifie = await Avis.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('auteur', 'nom prenom photoProfil');

    if (avisModifie?.statut === 'PUBLIE') {
      await syncEntityRating(avisModifie.objetType, avisModifie.objetId);
    }

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
    const userId = getAuthUserId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const avis = await Avis.findById(id);
    if (!avis) {
      return res.status(404).json({ error: 'Avis non trouvé' });
    }

    if (!isAdmin(req) && avis.auteur.toString() !== userId) {
      return res.status(403).json({ error: 'Non autorisé à supprimer cet avis' });
    }

    const { objetType, objetId } = avis;
    await Avis.findByIdAndDelete(id);
    await syncEntityRating(objetType, objetId);

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
    const { utile } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const avis = await Avis.findById(id);
    if (!avis) {
      return res.status(404).json({ error: 'Avis non trouvé' });
    }

    if (utile === true || utile === 'true') {
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
    const userId = getAuthUserId(req);

    if (!contenu?.trim()) {
      return res.status(400).json({ error: 'Contenu de réponse requis' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const avis = await Avis.findById(id);
    if (!avis) {
      return res.status(404).json({ error: 'Avis non trouvé' });
    }

    const canRespond = isAdmin(req) || await isObjetOwner(userId, avis.objetType, avis.objetId);
    if (!canRespond) {
      return res.status(403).json({ error: 'Seul le propriétaire peut répondre à cet avis' });
    }

    avis.reponse = {
      contenu: contenu.trim(),
      date: new Date(),
      auteur: userId
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

    const safeMotifs = Array.isArray(motifs)
      ? motifs.filter((m) => VALID_SIGNALEMENT_MOTIFS.includes(m))
      : [];

    avis.signale = true;
    avis.motifsSignalement = safeMotifs;
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
