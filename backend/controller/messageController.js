import messageModel from '../models/messageModel.js';
import mongoose from 'mongoose';
import cloudinary from 'cloudinary';
import fs from 'fs';

// Config Cloudinary
cloudinary.v2.config({
  cloud_name: 'dm0c8st6k',
  api_key: '541481188898557',
  api_secret: '6ViefK1wxoJP50p8j2pQ7IykIYY',
});

// ✅ ENVOYER UN MESSAGE
export const sendMessage = async (req, res) => {
    try {
        const {
            expediteur,
            destinataire,
            contenu,
            typeMessage,
            referenceId,
            referenceType,
            localisation
        } = req.body;

        // Validation des données requises
        if (!expediteur || !destinataire || !contenu) {
            return res.status(400).json({ 
                error: 'Expéditeur, destinataire et contenu requis' 
            });
        }

        // Génération de l'ID de conversation
        const conversationId = messageModel.genererConversationId(expediteur, destinataire);

        // Upload de pièce jointe si présente
        let pieceJointe = '';
        let typePieceJointe = '';
        
        if (req.file) {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'messages',
            });
            pieceJointe = result.secure_url;
            
            // Déterminer le type de fichier
            if (req.file.mimetype.startsWith('image/')) {
                typePieceJointe = 'IMAGE';
            } else if (req.file.mimetype.startsWith('video/')) {
                typePieceJointe = 'VIDEO';
            } else if (req.file.mimetype.startsWith('audio/')) {
                typePieceJointe = 'AUDIO';
            } else {
                typePieceJointe = 'DOCUMENT';
            }

            fs.unlinkSync(req.file.path);
        }

        const newMessage = new messageModel({
            expediteur: mongoose.Types.ObjectId(expediteur),
            destinataire: mongoose.Types.ObjectId(destinataire),
            contenu,
            conversationId,
            typeMessage: typeMessage || 'NORMAL',
            referenceId: referenceId ? mongoose.Types.ObjectId(referenceId) : undefined,
            referenceType,
            pieceJointe,
            typePieceJointe,
            localisation,
            statut: 'ENVOYE'
        });

        await newMessage.save();

        // Population pour la réponse
        const populatedMessage = await messageModel
            .findById(newMessage._id)
            .populate('expediteur', 'nom prenom photoProfil')
            .populate('destinataire', 'nom prenom photoProfil');

        res.status(201).json(populatedMessage);
    } catch (err) {
        console.error('Erreur envoi message:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR LES CONVERSATIONS D'UN UTILISATEUR
export const getUserConversations = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        const conversations = await messageModel.getConversations(userId);

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedConversations = conversations.slice(startIndex, endIndex);

        res.status(200).json({
            conversations: paginatedConversations,
            totalPages: Math.ceil(conversations.length / limit),
            currentPage: parseInt(page),
            total: conversations.length
        });
    } catch (err) {
        console.error('Erreur récupération conversations:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR LES MESSAGES D'UNE CONVERSATION
export const getConversationMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { page = 1, limit = 50, userId } = req.query;

        if (!conversationId) {
            return res.status(400).json({ error: 'ID de conversation requis' });
        }

        // Filtrer les messages non supprimés par l'utilisateur
        const matchCondition = {
            conversationId,
            estSupprime: false
        };

        // Si un userId est fourni, filtrer les messages non supprimés par cet utilisateur
        if (userId) {
            matchCondition['supprimePar.utilisateur'] = { $ne: mongoose.Types.ObjectId(userId) };
        }

        const messages = await messageModel.find(matchCondition)
            .populate('expediteur', 'nom prenom photoProfil')
            .populate('destinataire', 'nom prenom photoProfil')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await messageModel.countDocuments(matchCondition);

        res.status(200).json({
            messages: messages.reverse(), // Inverser pour avoir les plus anciens en premier
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error('Erreur récupération messages:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ MARQUER LES MESSAGES COMME LUS
export const markMessagesAsRead = async (req, res) => {
    try {
        const { conversationId, userId } = req.body;

        if (!conversationId || !userId) {
            return res.status(400).json({ error: 'ID conversation et utilisateur requis' });
        }

        const result = await messageModel.updateMany(
            {
                conversationId,
                destinataire: mongoose.Types.ObjectId(userId),
                statut: { $ne: 'LU' }
            },
            {
                statut: 'LU',
                dateLecture: new Date()
            }
        );

        res.status(200).json({
            message: `${result.modifiedCount} messages marqués comme lus`,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        console.error('Erreur marquage messages lus:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ SUPPRIMER UN MESSAGE POUR UN UTILISATEUR
export const deleteMessageForUser = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: 'ID de message invalide' });
        }

        const message = await messageModel.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ error: 'Message non trouvé' });
        }

        await message.supprimerPourUtilisateur(userId);

        res.status(200).json({ message: 'Message supprimé pour l\'utilisateur' });
    } catch (err) {
        console.error('Erreur suppression message:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ RECHERCHER DANS LES MESSAGES
export const searchMessages = async (req, res) => {
    try {
        const { userId, query, page = 1, limit = 20 } = req.query;

        if (!userId || !query) {
            return res.status(400).json({ error: 'ID utilisateur et terme de recherche requis' });
        }

        const searchCondition = {
            $or: [
                { expediteur: mongoose.Types.ObjectId(userId) },
                { destinataire: mongoose.Types.ObjectId(userId) }
            ],
            contenu: { $regex: query, $options: 'i' },
            estSupprime: false
        };

        const messages = await messageModel.find(searchCondition)
            .populate('expediteur', 'nom prenom photoProfil')
            .populate('destinataire', 'nom prenom photoProfil')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await messageModel.countDocuments(searchCondition);

        res.status(200).json({
            messages,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error('Erreur recherche messages:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR LES STATISTIQUES DES MESSAGES
export const getMessageStats = async (req, res) => {
    try {
        const { userId } = req.query;

        let matchCondition = { estSupprime: false };
        
        if (userId) {
            matchCondition = {
                ...matchCondition,
                $or: [
                    { expediteur: mongoose.Types.ObjectId(userId) },
                    { destinataire: mongoose.Types.ObjectId(userId) }
                ]
            };
        }

        const stats = await messageModel.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: {
                        typeMessage: '$typeMessage',
                        statut: '$statut'
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalMessages = await messageModel.countDocuments(matchCondition);
        
        const messagesParJour = await messageModel.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id': -1 } },
            { $limit: 7 } // 7 derniers jours
        ]);

        res.status(200).json({
            statsDetaillees: stats,
            totalMessages,
            messagesParJour
        });
    } catch (err) {
        console.error('Erreur statistiques messages:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR LES MESSAGES NON LUS
export const getUnreadMessages = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        const messages = await messageModel.find({
            destinataire: mongoose.Types.ObjectId(userId),
            statut: { $ne: 'LU' },
            estSupprime: false
        })
        .populate('expediteur', 'nom prenom photoProfil')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

        const total = await messageModel.countDocuments({
            destinataire: mongoose.Types.ObjectId(userId),
            statut: { $ne: 'LU' },
            estSupprime: false
        });

        res.status(200).json({
            messages,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error('Erreur récupération messages non lus:', err.message);
        res.status(500).json({ error: err.message });
    }
};

