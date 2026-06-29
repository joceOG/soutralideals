import notificationModel from "../models/notificationModel.js";
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
import prestataireModel from "../models/prestataireModel.js";
import mongoose from "mongoose";

async function repairLegacyPrestataireNotifications(userId) {
  const linkedPrestataires = await prestataireModel
    .find({ utilisateur: userId })
    .select("_id")
    .lean();

  if (linkedPrestataires.length === 0) return;

  await notificationModel.updateMany(
    { destinataire: { $in: linkedPrestataires.map((p) => p._id) } },
    { $set: { destinataire: new mongoose.Types.ObjectId(userId) } },
  );
}

<<<<<<< HEAD
=======
import mongoose from "mongoose";

>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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

    // 🛡️ IDOR : un utilisateur ne peut lire que ses propres notifications
    if (req.utilisateur._id.toString() !== userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

<<<<<<< HEAD
<<<<<<< HEAD
    await repairLegacyPrestataireNotifications(userId);

=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
    await repairLegacyPrestataireNotifications(userId);

>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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
    if (req.utilisateur._id.toString() !== userId) {
      return res.status(403).json({ error: 'Accès refusé' });
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

    const notification = await notificationModel.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    const isAdmin = req.utilisateur?.role === 'Admin';
    if (
      !isAdmin &&
      req.utilisateur._id.toString() !== notification.destinataire.toString()
    ) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await notification.deleteOne();

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
    if (req.utilisateur._id.toString() !== userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

<<<<<<< HEAD
<<<<<<< HEAD
    await repairLegacyPrestataireNotifications(userId);

=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
    await repairLegacyPrestataireNotifications(userId);

>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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

// ✅ Liste admin (dashboard)
export const getAllNotificationsAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.statut) filter.statut = req.query.statut;
    if (req.query.type) filter.type = req.query.type;

    const [notifications, total] = await Promise.all([
      notificationModel
        .find(filter)
        .populate('destinataire', 'nom prenom email telephone photoProfil')
        .populate('expediteur', 'nom prenom email telephone')
        .populate('prestation', 'statut montantTotal')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      notificationModel.countDocuments(filter),
    ]);

    res.status(200).json({
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Erreur liste admin notifications:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getNotificationStatsAdmin = async (req, res) => {
  try {
    const [statsParStatut, statsParType, total] = await Promise.all([
      notificationModel.aggregate([
        { $group: { _id: '$statut', count: { $sum: 1 } } },
      ]),
      notificationModel.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      notificationModel.countDocuments(),
    ]);

    res.status(200).json({
      statsParStatut,
      statsParType,
      total,
    });
  } catch (err) {
    console.error('Erreur stats admin notifications:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const archiveNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: 'ID notification invalide' });
    }
    const notification = await notificationModel.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }
    const isAdmin = req.utilisateur?.role === 'Admin';
    if (
      !isAdmin &&
      req.utilisateur._id.toString() !== notification.destinataire.toString()
    ) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    await notification.archiver();
    res.status(200).json(notification);
  } catch (err) {
    console.error('Erreur archivage notification:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const bulkCreateNotificationsAdmin = async (req, res) => {
  try {
    const { destinataires, titre, contenu, message, type, priorite } = req.body;
    const texte = contenu || message;
    if (!Array.isArray(destinataires) || destinataires.length === 0 || !titre || !texte || !type) {
      return res.status(400).json({
        error: 'destinataires (tableau non vide), titre, type, et contenu ou message sont requis',
      });
    }
    const validTypes = [
      'NOUVELLE_MISSION',
      'MISSION_ACCEPTEE',
      'MISSION_REFUSEE',
      'MISSION_DEMARREE',
      'MISSION_TERMINEE',
      'MESSAGE_RECU',
      'EVALUATION_RECUE',
      'SYSTEME',
    ];
    const resolvedType = validTypes.includes(type) ? type : 'SYSTEME';
    const prioMap = {
      BASSE: 'FAIBLE',
      FAIBLE: 'FAIBLE',
      NORMALE: 'NORMALE',
      HAUTE: 'HAUTE',
      CRITIQUE: 'URGENTE',
      URGENTE: 'URGENTE',
    };
    const resolvedP = prioMap[priorite] || priorite || 'NORMALE';
    const allowedPrio = ['FAIBLE', 'NORMALE', 'HAUTE', 'URGENTE'];
    const p = allowedPrio.includes(resolvedP) ? resolvedP : 'NORMALE';

    const docs = destinataires.map((d) => ({
      destinataire: d,
      type: resolvedType,
      titre,
      contenu: texte,
      priorite: p,
    }));

    const created = await notificationModel.insertMany(docs);
    res.status(201).json({ created: created.length });
  } catch (err) {
    console.error('Erreur bulk notifications:', err.message);
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