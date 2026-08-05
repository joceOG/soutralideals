import messageModel from '../models/messageModel.js';
import prestataireModel from '../models/prestataireModel.js';
import mongoose from 'mongoose';
import cloudinary from 'cloudinary';
import fs from 'fs';
import { assertOwnerOrAdmin, assertAdmin, isAdmin } from '../utils/accessControl.js';
import { escapeRegex } from '../utils/escapeRegex.js';

function conversationIncludesUser(conversationId, userId) {
  if (!conversationId?.startsWith('conv_')) return false;
  const parts = conversationId.replace('conv_', '').split('_').filter(Boolean);
  return parts.includes(userId.toString());
}

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function formatConversationsForUser(conversations, userId) {
    const userIdStr = userId.toString();
    const utilisateurModel = (await import('../models/utilisateurModel.js')).default;

    return Promise.all(conversations.map(async (conv) => {
        const dm = conv.dernierMessage;
        const expId = dm?.expediteur?.toString?.() ?? String(dm?.expediteur ?? '');
        const destId = dm?.destinataire?.toString?.() ?? String(dm?.destinataire ?? '');

        let interlocuteur =
            expId === userIdStr
                ? conv.destinataireInfo?.[0]
                : conv.expediteurInfo?.[0];

        if (!interlocuteur?.nom && conv._id?.startsWith('conv_')) {
            const otherId = conv._id
                .replace('conv_', '')
                .split('_')
                .find((id) => id !== userIdStr);
            if (otherId) {
                interlocuteur = await utilisateurModel
                    .findById(otherId)
                    .select('nom prenom photoProfil')
                    .lean();
            }
        }

        return {
            conversationId: conv._id,
            interlocuteur: interlocuteur ?? { _id: expId === userIdStr ? destId : expId },
            dernierMessage: dm,
            nonLus: conv.nombreNonLus ?? 0,
        };
    }));
}

async function resolveConversationIds(conversationId) {
    const ids = conversationId.replace('conv_', '').split('_').filter(Boolean);
    if (ids.length !== 2) return [conversationId];

    const objectIds = ids
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    const linkedPrestataires = await prestataireModel
        .find({ utilisateur: { $in: objectIds } })
        .select('_id')
        .lean();

    const altIds = new Set([conversationId]);
    for (const pid of linkedPrestataires) {
        altIds.add(messageModel.genererConversationId(ids[0], pid._id.toString()));
        altIds.add(messageModel.genererConversationId(ids[1], pid._id.toString()));
    }

    return [...altIds];
}

async function resolveParticipantUserId(participantId) {
    if (!participantId || !mongoose.Types.ObjectId.isValid(participantId)) return null;

    const utilisateurModel = (await import('../models/utilisateurModel.js')).default;
    const asUser = await utilisateurModel.findById(participantId).select('_id').lean();
    if (asUser) return asUser._id;

    const prestDoc = await prestataireModel.findById(participantId).select('utilisateur').lean();
    return prestDoc?.utilisateur ?? null;
}

async function enrichAndRepairMessages(messages) {
    if (messages.length === 0) return messages;

    const ids = messages.map((m) => m._id);

    for (const msg of messages) {
        const lean = await messageModel.findById(msg._id).select('expediteur destinataire conversationId').lean();
        if (!lean) continue;

        const fixedExp = await resolveParticipantUserId(lean.expediteur);
        const fixedDest = await resolveParticipantUserId(lean.destinataire);
        const updates = {};

        if (fixedExp && fixedExp.toString() !== lean.expediteur?.toString()) {
            updates.expediteur = fixedExp;
        }
        if (fixedDest && fixedDest.toString() !== lean.destinataire?.toString()) {
            updates.destinataire = fixedDest;
        }

        if (Object.keys(updates).length > 0) {
            await messageModel.updateOne({ _id: msg._id }, { $set: updates });
        }
    }

    return messageModel
        .find({ _id: { $in: ids } })
        .populate('expediteur', 'nom prenom photoProfil')
        .populate('destinataire', 'nom prenom photoProfil')
        .sort({ createdAt: -1 })
        .exec();
}

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
            localisation,
            dureeFichier,
        } = req.body;

        // contenu obligatoire sauf si une pièce jointe est présente
        if (!expediteur || !destinataire || (!contenu && !req.file)) {
            return res.status(400).json({ 
                error: 'Expéditeur, destinataire et contenu (ou pièce jointe) requis' 
            });
        }

        if (req.utilisateur?._id?.toString() !== String(expediteur)) {
            return res.status(403).json({ error: 'Expéditeur non autorisé' });
        }

        const resolvedDestinataire = await resolveParticipantUserId(destinataire);
        if (!resolvedDestinataire) {
            return res.status(400).json({ error: 'Destinataire invalide' });
        }

        // Génération de l'ID de conversation
        const conversationId = messageModel.genererConversationId(expediteur, resolvedDestinataire);

        // Upload de pièce jointe si présente
        let pieceJointe;
        let typePieceJointe;
        
        if (req.file) {
            // resource_type 'auto' permet les images ET les fichiers audio
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'messages',
                resource_type: 'auto',
            });
            pieceJointe = result.secure_url;
            
            if (req.file.mimetype.startsWith('image/')) {
                typePieceJointe = 'IMAGE';
            } else if (req.file.mimetype.startsWith('audio/')) {
                typePieceJointe = 'AUDIO';
            } else if (req.file.mimetype.startsWith('video/')) {
                typePieceJointe = 'VIDEO';
            } else {
                typePieceJointe = 'DOCUMENT';
            }

            fs.unlinkSync(req.file.path);
        }

        const newMessage = new messageModel({
            expediteur: new mongoose.Types.ObjectId(expediteur),
            destinataire: resolvedDestinataire,
            contenu: contenu || (typePieceJointe === 'AUDIO' ? '🎤 Message vocal' : '📷 Photo'),
            conversationId,
            typeMessage: typeMessage || 'NORMAL',
            referenceId: referenceId ? new mongoose.Types.ObjectId(referenceId) : undefined,
            referenceType,
            ...(pieceJointe && typePieceJointe ? { pieceJointe, typePieceJointe } : {}),
            ...(dureeFichier ? { dureeFichier: Number(dureeFichier) } : {}),
            localisation,
            statut: 'ENVOYE'
        });

        await newMessage.save();

        // Population pour la réponse
        const populatedMessage = await messageModel
            .findById(newMessage._id)
            .populate('expediteur', 'nom prenom photoProfil')
            .populate('destinataire', 'nom prenom photoProfil');

        // Temps réel : même chemin que le relay socket (HTTP persist + emit)
        try {
            const { emitNewMessage } = await import('../utils/socketIo.js');
            emitNewMessage(populatedMessage);
        } catch (emitErr) {
            console.warn('Emit WS après HTTP sendMessage:', emitErr.message);
        }

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

        if (!assertOwnerOrAdmin(req, res, userId)) return;

        // Réparer les anciens messages
        const linkedPrestataires = await prestataireModel
            .find({ utilisateur: userId })
            .select('_id')
            .lean();

        for (const prestataire of linkedPrestataires) {
            const legacyAsExpediteur = await messageModel.find({ expediteur: prestataire._id });
            for (const msg of legacyAsExpediteur) {
                const partnerId = msg.destinataire?.toString();
                if (!partnerId) continue;
                msg.expediteur = new mongoose.Types.ObjectId(userId);
                msg.conversationId = messageModel.genererConversationId(userId, partnerId);
                await msg.save();
            }

            const legacyAsDestinataire = await messageModel.find({ destinataire: prestataire._id });
            for (const msg of legacyAsDestinataire) {
                const partnerId = msg.expediteur?.toString();
                if (!partnerId) continue;
                msg.destinataire = new mongoose.Types.ObjectId(userId);
                msg.conversationId = messageModel.genererConversationId(userId, partnerId);
                await msg.save();
            }
        }

        const conversations = await messageModel.getConversations(userId);

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedConversations = conversations.slice(startIndex, endIndex);
        const formattedConversations = await formatConversationsForUser(
            paginatedConversations,
            userId,
        );

        res.status(200).json({
            conversations: formattedConversations,
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

        const requesterId = req.utilisateur?._id?.toString();
        const queryUserId = userId?.toString();

        if (queryUserId && queryUserId !== requesterId && !isAdmin(req)) {
            return res.status(403).json({ error: 'Accès refusé à cette conversation.' });
        }

        const effectiveUserId = queryUserId ?? requesterId;
        if (!effectiveUserId) {
            return res.status(401).json({ error: 'Utilisateur requis.' });
        }

        if (!conversationIncludesUser(conversationId, effectiveUserId) && !isAdmin(req)) {
            return res.status(403).json({ error: 'Accès refusé : vous n\'êtes pas participant de cette conversation.' });
        }

        // Filtrer les messages non supprimés par l'utilisateur
        let matchCondition = {
            conversationId,
            estSupprime: false
        };

        if (effectiveUserId) {
            matchCondition['supprimePar.utilisateur'] = { $ne: new mongoose.Types.ObjectId(effectiveUserId) };
        }

        let messages = await messageModel.find(matchCondition)
            .populate('expediteur', 'nom prenom photoProfil')
            .populate('destinataire', 'nom prenom photoProfil')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        // Auto-réparation : anciennes conversations créées avec l'id du document Prestataire
        if (messages.length === 0 && conversationId.startsWith('conv_')) {
            const altConversationIds = await resolveConversationIds(conversationId);
            const fallbackCondition = {
                conversationId: { $in: altConversationIds },
                estSupprime: false,
            };
            if (effectiveUserId) {
                fallbackCondition['supprimePar.utilisateur'] = {
                    $ne: new mongoose.Types.ObjectId(effectiveUserId),
                };
            }

            messages = await messageModel.find(fallbackCondition)
                .populate('expediteur', 'nom prenom photoProfil')
                .populate('destinataire', 'nom prenom photoProfil')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();

            if (messages.length > 0) {
                const rawMessages = await messageModel
                    .find({ _id: { $in: messages.map((m) => m._id) } })
                    .select('expediteur destinataire')
                    .lean();

                for (const raw of rawMessages) {
                    const fixedExp = await resolveParticipantUserId(raw.expediteur);
                    const fixedDest = await resolveParticipantUserId(raw.destinataire);

                    await messageModel.updateOne(
                        { _id: raw._id },
                        {
                            $set: {
                                conversationId,
                                ...(fixedExp && { expediteur: fixedExp }),
                                ...(fixedDest && { destinataire: fixedDest }),
                            },
                        },
                    );
                }

                messages = await messageModel
                    .find({ _id: { $in: messages.map((m) => m._id) } })
                    .populate('expediteur', 'nom prenom photoProfil')
                    .populate('destinataire', 'nom prenom photoProfil')
                    .sort({ createdAt: -1 })
                    .exec();
            }
        }

        messages = await enrichAndRepairMessages(messages);

        const total = await messageModel.countDocuments({
            conversationId,
            estSupprime: false,
            ...(effectiveUserId && {
                'supprimePar.utilisateur': { $ne: new mongoose.Types.ObjectId(effectiveUserId) },
            }),
        });

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

        if (!assertOwnerOrAdmin(req, res, userId)) return;
        if (!conversationIncludesUser(conversationId, userId) && !isAdmin(req)) {
            return res.status(403).json({ error: 'Accès refusé à cette conversation.' });
        }

        const result = await messageModel.updateMany(
            {
                conversationId,
                destinataire: new mongoose.Types.ObjectId(userId),
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

        const actorId = userId ?? req.utilisateur?._id?.toString();
        if (!assertOwnerOrAdmin(req, res, actorId)) return;

        const message = await messageModel.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ error: 'Message non trouvé' });
        }

        await message.supprimerPourUtilisateur(actorId);

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

        if (!assertOwnerOrAdmin(req, res, userId)) return;

        const safeQuery = escapeRegex(query);
        const searchCondition = {
            $or: [
                { expediteur: new mongoose.Types.ObjectId(userId) },
                { destinataire: new mongoose.Types.ObjectId(userId) }
            ],
            contenu: { $regex: safeQuery, $options: 'i' },
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
        const userId = isAdmin(req) && req.query.userId
            ? req.query.userId
            : req.utilisateur._id.toString();

        let matchCondition = { estSupprime: false };
        
        matchCondition = {
            ...matchCondition,
            $or: [
                { expediteur: new mongoose.Types.ObjectId(userId) },
                { destinataire: new mongoose.Types.ObjectId(userId) }
            ]
        };

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

        if (!assertOwnerOrAdmin(req, res, userId)) return;

        const messages = await messageModel.find({
            destinataire: new mongoose.Types.ObjectId(userId),
            statut: { $ne: 'LU' },
            estSupprime: false
        })
        .populate('expediteur', 'nom prenom photoProfil')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

        const total = await messageModel.countDocuments({
            destinataire: new mongoose.Types.ObjectId(userId),
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

