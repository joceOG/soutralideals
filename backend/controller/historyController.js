import History from '../models/historyModel.js';
import Utilisateur from '../models/utilisateurModel.js';

// ➕ AJOUTER UNE CONSULTATION
export const addHistory = async (req, res) => {
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
      dureeConsultation,
      sessionId,
      userAgent,
      ipAddress,
      localisationUtilisateur,
      url,
      referrer,
      tagsConsultation,
      interactions,
      actions,
      deviceInfo
    } = req.body;
    
    if (!objetType || !titre || !sessionId) {
      return res.status(400).json({ error: 'objetType, titre et sessionId sont requis' });
    }
    
    // Vérifier s'il y a déjà une consultation récente (dans les 5 dernières minutes)
    const consultationRecente = await History.findOne({
      utilisateur: userId,
      objetType,
      objetId: objetId || null,
      dateConsultation: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });
    
    if (consultationRecente) {
      // Mettre à jour la consultation existante
      consultationRecente.nombreVues += 1;
      consultationRecente.dureeConsultation = dureeConsultation || consultationRecente.dureeConsultation;
      consultationRecente.dateDerniereConsultation = new Date();
      
      if (actions && actions.length > 0) {
        consultationRecente.actions.push(...actions);
      }
      
      if (interactions) {
        consultationRecente.interactions = { ...consultationRecente.interactions, ...interactions };
      }
      
      await consultationRecente.save();
      return res.status(200).json(consultationRecente);
    }
    
    const history = await History.create({
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
      dureeConsultation: dureeConsultation || 0,
      sessionId,
      userAgent,
      ipAddress,
      localisationUtilisateur,
      url,
      referrer,
      tagsConsultation,
      interactions: interactions || { clics: 0, scrolls: 0, tempsSurPage: 0 },
      actions: actions || [],
      deviceInfo
    });
    
    res.status(201).json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📋 LISTER L'HISTORIQUE DES CONSULTATIONS
export const listHistory = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { 
      objetType, 
      statut = 'ACTIVE', 
      categorie, 
      ville, 
      page = 1, 
      limit = 20,
      sortBy = 'dateConsultation',
      sortOrder = 'desc',
      periode = 30 // jours
    } = req.query;
    
    // Construction du filtre
    const filter = { utilisateur: userId };
    if (objetType) filter.objetType = objetType;
    if (statut) filter.statut = statut;
    if (categorie) filter.categorie = new RegExp(categorie, 'i');
    if (ville) filter['localisation.ville'] = new RegExp(ville, 'i');
    
    // Filtre par période
    if (periode) {
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - parseInt(periode));
      filter.dateConsultation = { $gte: dateDebut };
    }
    
    // Pagination
    const skip = (page - 1) * limit;
    
    // Tri
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const history = await History.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('utilisateur', 'nom prenom photoProfil');
    
    const total = await History.countDocuments(filter);
    
    res.status(200).json({
      history,
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

// 🔍 RECHERCHER DANS L'HISTORIQUE
export const searchHistory = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { q, objetType, categorie, ville, periode = 30 } = req.query;
    
    const filter = { 
      utilisateur: userId, 
      statut: 'ACTIVE' 
    };
    
    if (objetType) filter.objetType = objetType;
    if (categorie) filter.categorie = new RegExp(categorie, 'i');
    if (ville) filter['localisation.ville'] = new RegExp(ville, 'i');
    
    if (periode) {
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - parseInt(periode));
      filter.dateConsultation = { $gte: dateDebut };
    }
    
    if (q) {
      filter.$or = [
        { titre: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { categorie: new RegExp(q, 'i') },
        { tags: { $in: [new RegExp(q, 'i')] } },
        { tagsConsultation: { $in: [new RegExp(q, 'i')] } }
      ];
    }
    
    const history = await History.find(filter)
      .sort({ dateConsultation: -1 })
      .populate('utilisateur', 'nom prenom photoProfil');
    
    res.status(200).json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ MODIFIER UNE CONSULTATION
export const updateHistory = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { id } = req.params;
    const updateData = req.body;
    
    const history = await History.findOneAndUpdate(
      { _id: id, utilisateur: userId },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!history) {
      return res.status(404).json({ error: 'Consultation introuvable' });
    }
    
    res.status(200).json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🗑️ SUPPRIMER UNE CONSULTATION
export const removeHistory = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { id } = req.params;
    const history = await History.findOneAndUpdate(
      { _id: id, utilisateur: userId },
      { statut: 'SUPPRIME' },
      { new: true }
    );
    
    if (!history) {
      return res.status(404).json({ error: 'Consultation introuvable' });
    }
    
    res.status(200).json({ message: 'Consultation supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📊 STATISTIQUES DE L'HISTORIQUE
export const getHistoryStats = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { periode = 30 } = req.query;
    
    const stats = await History.getStatsUtilisateur(userId, parseInt(periode));
    
    res.status(200).json(stats[0] || {
      totalConsultations: 0,
      consultationsParType: [],
      consultationsParCategorie: [],
      tempsTotal: 0,
      consultationsRecentes: 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📱 CONSULTATIONS RÉCENTES
export const getRecentHistory = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { limit = 20 } = req.query;
    
    const history = await History.getConsultationsRecentes(userId, parseInt(limit));
    
    res.status(200).json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🏷️ CONSULTATIONS PAR TYPE
export const getHistoryByType = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { objetType, limit = 20 } = req.query;
    
    if (!objetType) {
      return res.status(400).json({ error: 'objetType est requis' });
    }
    
    const history = await History.getConsultationsParType(userId, objetType, parseInt(limit));
    
    res.status(200).json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔄 ARCHIVER UNE CONSULTATION
export const archiveHistory = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { id } = req.params;
    const history = await History.findOneAndUpdate(
      { _id: id, utilisateur: userId },
      { statut: 'ARCHIVE' },
      { new: true }
    );
    
    if (!history) {
      return res.status(404).json({ error: 'Consultation introuvable' });
    }
    
    res.status(200).json({ message: 'Consultation archivée avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🧹 NETTOYER L'HISTORIQUE ANCIEN
export const cleanOldHistory = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });
    
    const { jours = 90 } = req.query;
    
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - parseInt(jours));
    
    const result = await History.deleteMany({
      utilisateur: userId,
      dateConsultation: { $lt: dateLimite }
    });
    
    res.status(200).json({ 
      message: `${result.deletedCount} consultations supprimées`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



