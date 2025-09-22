import notificationModel from '../models/notificationModel.js';
import mongoose from 'mongoose';

// ✅ CRÉER UNE NOUVELLE NOTIFICATION
export const createNotification = async (req, res) => {
    try {
        const {
            destinataire,
            expediteur,
            titre,
            message,
            type,
            sousType,
            referenceId,
            referenceType,
            priorite,
            envoiEmail,
            envoiPush,
            envoiSMS,
            donnees,
            urlAction,
            dateExpiration
        } = req.body;

        // Validation des données requises
        if (!destinataire || !titre || !message || !type) {
            return res.status(400).json({ 
                error: 'Destinataire, titre, message et type sont requis' 
            });
        }

        const newNotification = new notificationModel({
            destinataire: mongoose.Types.ObjectId(destinataire),
            expediteur: expediteur ? mongoose.Types.ObjectId(expediteur) : undefined,
            titre,
            message,
            type,
            sousType,
            referenceId: referenceId ? mongoose.Types.ObjectId(referenceId) : undefined,
            referenceType,
            priorite: priorite || 'NORMALE',
            envoiEmail: envoiEmail || false,
            envoiPush: envoiPush !== undefined ? envoiPush : true,
            envoiSMS: envoiSMS || false,
            donnees: donnees || {},
            urlAction,
            dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined
        });

        await newNotification.save();

        // Population pour la réponse
        const populatedNotification = await notificationModel
            .findById(newNotification._id)
            .populate('destinataire', 'nom prenom email')
            .populate('expediteur', 'nom prenom');

        res.status(201).json(populatedNotification);
    } catch (err) {
        console.error('Erreur création notification:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR TOUTES LES NOTIFICATIONS (avec filtres)
export const getAllNotifications = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            destinataire,
            type, 
            statut, 
            priorite,
            dateDebut,
            dateFin
        } = req.query;

        // Construction des filtres
        const filters = {};
        if (destinataire) filters.destinataire = mongoose.Types.ObjectId(destinataire);
        if (type) filters.type = type;
        if (statut) filters.statut = statut;
        if (priorite) filters.priorite = priorite;
        
        if (dateDebut && dateFin) {
            filters.createdAt = {
                $gte: new Date(dateDebut),
                $lte: new Date(dateFin)
            };
        }

        const notifications = await notificationModel.find(filters)
            .populate('destinataire', 'nom prenom email photoProfil')
            .populate('expediteur', 'nom prenom')
            .sort({ createdAt: -1, priorite: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await notificationModel.countDocuments(filters);

        res.status(200).json({
            notifications,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error('Erreur récupération notifications:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR LES NOTIFICATIONS D'UN UTILISATEUR
export const getUserNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const { 
            page = 1, 
            limit = 20, 
            statut, 
            type,
            nonLuesUniquement = false
        } = req.query;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        // Filtres pour l'utilisateur spécifique
        const filters = { destinataire: mongoose.Types.ObjectId(userId) };
        if (statut) filters.statut = statut;
        if (type) filters.type = type;
        if (nonLuesUniquement === 'true') filters.statut = 'NON_LUE';

        const notifications = await notificationModel.find(filters)
            .populate('expediteur', 'nom prenom')
            .sort({ priorite: -1, createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await notificationModel.countDocuments(filters);
        const nonLues = await notificationModel.countDocuments({
            destinataire: mongoose.Types.ObjectId(userId),
            statut: 'NON_LUE'
        });

        res.status(200).json({
            notifications,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total,
            nonLues
        });
    } catch (err) {
        console.error('Erreur récupération notifications utilisateur:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ MARQUER UNE NOTIFICATION COMME LUE
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de notification invalide' });
        }

        const notification = await notificationModel.findById(id);
        
        if (!notification) {
            return res.status(404).json({ error: 'Notification non trouvée' });
        }

        if (notification.statut === 'NON_LUE') {
            await notification.marquerCommeLue();
        }

        res.status(200).json(notification);
    } catch (err) {
        console.error('Erreur marquage lecture:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ MARQUER TOUTES LES NOTIFICATIONS D'UN UTILISATEUR COMME LUES
export const markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        const result = await notificationModel.updateMany(
            { 
                destinataire: mongoose.Types.ObjectId(userId),
                statut: 'NON_LUE'
            },
            { 
                statut: 'LUE',
                dateLue: new Date()
            }
        );

        res.status(200).json({ 
            message: `${result.modifiedCount} notifications marquées comme lues`,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        console.error('Erreur marquage toutes comme lues:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ ARCHIVER UNE NOTIFICATION
export const archiveNotification = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de notification invalide' });
        }

        const notification = await notificationModel.findById(id);
        
        if (!notification) {
            return res.status(404).json({ error: 'Notification non trouvée' });
        }

        await notification.archiver();

        res.status(200).json({ message: 'Notification archivée avec succès' });
    } catch (err) {
        console.error('Erreur archivage notification:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ SUPPRIMER UNE NOTIFICATION
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de notification invalide' });
        }

        const notification = await notificationModel.findByIdAndDelete(id);
        
        if (!notification) {
            return res.status(404).json({ error: 'Notification non trouvée' });
        }
        
        res.status(200).json({ message: 'Notification supprimée avec succès' });
    } catch (err) {
        console.error('Erreur suppression notification:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR LES STATISTIQUES DES NOTIFICATIONS
export const getNotificationStats = async (req, res) => {
    try {
        const { userId } = req.query;

        // Stats globales ou par utilisateur
        const matchCondition = userId ? 
            { destinataire: mongoose.Types.ObjectId(userId) } : 
            {};

        const stats = await notificationModel.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: {
                        statut: '$statut',
                        type: '$type'
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsParStatut = await notificationModel.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: '$statut',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsParType = await notificationModel.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        const total = await notificationModel.countDocuments(matchCondition);

        res.status(200).json({
            statsDetaillees: stats,
            statsParStatut,
            statsParType,
            total
        });
    } catch (err) {
        console.error('Erreur statistiques notifications:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ ENVOYER UNE NOTIFICATION EN MASSE
export const sendBulkNotification = async (req, res) => {
    try {
        const {
            destinataires, // Array d'IDs utilisateur
            titre,
            message,
            type,
            priorite = 'NORMALE',
            envoiEmail = false,
            envoiPush = true
        } = req.body;

        if (!destinataires || !Array.isArray(destinataires) || destinataires.length === 0) {
            return res.status(400).json({ error: 'Liste des destinataires requise' });
        }

        if (!titre || !message || !type) {
            return res.status(400).json({ error: 'Titre, message et type requis' });
        }

        // Création des notifications en masse
        const notifications = destinataires.map(dest => ({
            destinataire: mongoose.Types.ObjectId(dest),
            titre,
            message,
            type,
            priorite,
            envoiEmail,
            envoiPush
        }));

        const result = await notificationModel.insertMany(notifications);

        res.status(201).json({
            message: `${result.length} notifications envoyées`,
            notificationsCreees: result.length
        });
    } catch (err) {
        console.error('Erreur envoi notifications en masse:', err.message);
        res.status(500).json({ error: err.message });
    }
};

