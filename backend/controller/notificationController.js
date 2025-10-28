import notificationModel from "../models/notificationModel.js";
import mongoose from "mongoose";

// ✅ Créer une notification
export const createNotification = async (req, res) => {
  try {
    const {
      destinataire,
      expediteur,
      type,
      titre,
      contenu,
      donnees = {},
      prestation,
      priorite = 'NORMALE',
      dateExpiration
    } = req.body;

    // Validation des champs obligatoires
    if (!destinataire || !type || !titre || !contenu) {
      return res.status(400).json({ 
        error: 'Destinataire, type, titre et contenu sont obligatoires' 
      });
    }

    const notification = new notificationModel({
      destinataire,
      expediteur,
      type,
      titre,
      contenu,
      donnees,
      prestation,
      priorite,
      dateExpiration: dateExpiration ? new Date(dateExpiration) : null
    });

    await notification.save();

    // Populer les références pour la réponse
    await notification.populate([
      { path: 'destinataire', select: 'nom prenom email telephone' },
      { path: 'expediteur', select: 'nom prenom email telephone' },
      { path: 'prestation', select: 'statut montantTotal' }
    ]);

    res.status(201).json(notification);
  } catch (err) {
    console.error('Erreur création notification:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Récupérer les notifications d'un utilisateur
export const getNotificationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { statut, limit = 50, offset = 0 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    const query = { destinataire: userId };
    if (statut) {
      query.statut = statut;
    }

    const notifications = await notificationModel
      .find(query)
      .populate('expediteur', 'nom prenom email telephone')
      .populate('prestation', 'statut montantTotal')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Compter le total
    const total = await notificationModel.countDocuments(query);

    res.status(200).json({
      notifications,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('Erreur récupération notifications:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Marquer une notification comme lue
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: 'ID notification invalide' });
    }

    const notification = await notificationModel.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    await notification.marquerCommeLue();
    res.status(200).json(notification);
  } catch (err) {
    console.error('Erreur marquage notification:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Marquer toutes les notifications comme lues
export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    const result = await notificationModel.updateMany(
      { destinataire: userId, statut: 'NON_LUE' },
      { 
        statut: 'LUE',
        dateLecture: new Date()
      }
    );

    res.status(200).json({ 
      message: `${result.modifiedCount} notifications marquées comme lues` 
    });
  } catch (err) {
    console.error('Erreur marquage notifications:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Supprimer une notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: 'ID notification invalide' });
    }

    const notification = await notificationModel.findByIdAndDelete(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    res.status(200).json({ message: 'Notification supprimée' });
  } catch (err) {
    console.error('Erreur suppression notification:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Compter les notifications non lues
export const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    const count = await notificationModel.countDocuments({
      destinataire: userId,
      statut: 'NON_LUE'
    });

    res.status(200).json({ count });
  } catch (err) {
    console.error('Erreur comptage notifications:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Créer une notification automatique (utilitaire)
export const createAutoNotification = async (data) => {
  try {
    const notification = new notificationModel(data);
    await notification.save();
    return notification;
  } catch (err) {
    console.error('Erreur création notification auto:', err.message);
    throw err;
  }
};