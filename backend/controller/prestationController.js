import prestationModel from '../models/prestationModel.js';
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import prestataireModel from '../models/prestataireModel.js';
=======
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
import prestataireModel from '../models/prestataireModel.js';
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
import prestataireModel from '../models/prestataireModel.js';
>>>>>>> 455ed65 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
import mongoose from 'mongoose';
import cloudinary from 'cloudinary';
import fs from 'fs';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ CRÉER UNE NOUVELLE PRESTATION
export const createPrestation = async (req, res) => {
    try {
        const {
            utilisateur,
            prestataire,
            service,
            datePrestation,
            heureDebut,
            heureFin,
            dureeEstimee,
            adresse,
            ville,
            codePostal,
            localisation,
            tarifHoraire,
            montantTotal,
            fraisDeplacements,
            moyenPaiement,
            description,
            notesClient,
            telephoneUrgence,
            estRecurrente,
            frequenceRecurrence
        } = req.body;

        // Validation des données requises (adaptée pour système gratuit)
        if (!utilisateur || !adresse || !ville) {
            return res.status(400).json({ 
                error: 'Utilisateur, adresse et ville requis' 
            });
        }

        // Upload de photos avant si présentes
        const photosAvant = [];
        if (req.files?.photosAvant) {
            for (const file of req.files.photosAvant) {
                const result = await cloudinary.v2.uploader.upload(file.path, {
                    folder: 'prestations/avant',
                });
                photosAvant.push(result.secure_url);
                fs.unlinkSync(file.path);
            }
        }

        const newPrestation = new prestationModel({
            utilisateur: new mongoose.Types.ObjectId(utilisateur),
            prestataire: prestataire ? new mongoose.Types.ObjectId(prestataire) : null,
            service: service ? new mongoose.Types.ObjectId(service) : null,
            datePrestation: datePrestation ? new Date(datePrestation) : new Date(),
            heureDebut: heureDebut || '09:00',
            heureFin,
            dureeEstimee,
            adresse,
            ville,
            codePostal,
            localisation,
            tarifHoraire: tarifHoraire || 0,
            montantTotal: 0, // 💰 Toujours gratuit
            fraisDeplacements: fraisDeplacements || 0,
            moyenPaiement: moyenPaiement || 'GRATUIT',
            description: description || 'Service demandé',
            notesClient,
            telephoneUrgence,
            estRecurrente: estRecurrente || false,
            frequenceRecurrence,
            photosAvant,
            statut: 'EN_ATTENTE',
            statutPaiement: 'GRATUIT' // 💰 Statut gratuit
        });

        await newPrestation.save();

        // Population pour la réponse
        const populatedPrestation = await prestationModel
            .findById(newPrestation._id)
            .populate('utilisateur', 'nom prenom email telephone photoProfil')
            .populate('prestataire', 'utilisateur localisation')
            .populate('service', 'nomservice categorie');

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 455ed65 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
        // 🔔 CRÉER UNE NOTIFICATION + MESSAGE POUR LE PRESTATAIRE (compte utilisateur)
        try {
            const notificationModel = (await import('../models/notificationModel.js')).default;
            const messageModel = (await import('../models/messageModel.js')).default;

            if (prestataire) {
                const prestataireDoc = await prestataireModel
                    .findById(prestataire)
                    .select('utilisateur');

                const prestataireUserId = prestataireDoc?.utilisateur;

                if (prestataireUserId) {
                    const notification = new notificationModel({
                        destinataire: prestataireUserId,
                        expediteur: utilisateur,
                        type: 'NOUVELLE_MISSION',
                        titre: 'Nouvelle mission disponible !',
                        contenu: `Une nouvelle mission vous a été assignée. Consultez vos missions pour plus de détails.`,
                        prestation: newPrestation._id,
                        priorite: 'HAUTE',
                        donnees: {
                            prestationId: newPrestation._id,
                            service: populatedPrestation.service?.nomservice,
                            adresse: adresse,
                            ville: ville
                        }
                    });

                    await notification.save();
                    console.log(`🔔 Notification nouvelle mission créée pour prestataire: ${prestataireUserId}`);

                    const conversationId = messageModel.genererConversationId(
                        utilisateur,
                        prestataireUserId.toString()
                    );

                    const demandeMessage = new messageModel({
                        expediteur: new mongoose.Types.ObjectId(utilisateur),
                        destinataire: prestataireUserId,
                        contenu: `Bonjour, j'ai une demande de prestation${notesClient ? ` : ${notesClient}` : '.'} Adresse : ${adresse}, ${ville}.`,
                        typeMessage: 'PRESTATION',
                        referenceId: newPrestation._id,
                        referenceType: 'Prestation',
                        conversationId,
                        statut: 'ENVOYE'
                    });

                    await demandeMessage.save();
                    console.log(`💬 Message de demande créé pour prestation: ${newPrestation._id}`);
                } else {
                    console.warn(`⚠️ Prestataire ${prestataire} sans utilisateur lié — notification ignorée`);
                }
<<<<<<< HEAD
=======
        // 🔔 CRÉER UNE NOTIFICATION POUR LE PRESTATAIRE
=======
        // 🔔 CRÉER UNE NOTIFICATION + MESSAGE POUR LE PRESTATAIRE (compte utilisateur)
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
        try {
            const notificationModel = (await import('../models/notificationModel.js')).default;
            const messageModel = (await import('../models/messageModel.js')).default;

            if (prestataire) {
<<<<<<< HEAD
                const notification = new notificationModel({
                    destinataire: prestataire,
                    expediteur: utilisateur,
                    type: 'NOUVELLE_MISSION',
                    titre: 'Nouvelle mission disponible !',
                    contenu: `Une nouvelle mission vous a été assignée. Consultez vos missions pour plus de détails.`,
                    prestation: newPrestation._id,
                    priorite: 'HAUTE',
                    donnees: {
                        prestationId: newPrestation._id,
                        service: populatedPrestation.service?.nomservice,
                        adresse: adresse,
                        ville: ville
                    }
                });
                
                await notification.save();
                console.log(`🔔 Notification nouvelle mission créée pour prestataire: ${prestataire}`);
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
                const prestataireDoc = await prestataireModel
                    .findById(prestataire)
                    .select('utilisateur');

                const prestataireUserId = prestataireDoc?.utilisateur;

                if (prestataireUserId) {
                    const notification = new notificationModel({
                        destinataire: prestataireUserId,
                        expediteur: utilisateur,
                        type: 'NOUVELLE_MISSION',
                        titre: 'Nouvelle mission disponible !',
                        contenu: `Une nouvelle mission vous a été assignée. Consultez vos missions pour plus de détails.`,
                        prestation: newPrestation._id,
                        priorite: 'HAUTE',
                        donnees: {
                            prestationId: newPrestation._id,
                            service: populatedPrestation.service?.nomservice,
                            adresse: adresse,
                            ville: ville
                        }
                    });

                    await notification.save();
                    console.log(`🔔 Notification nouvelle mission créée pour prestataire: ${prestataireUserId}`);

                    const conversationId = messageModel.genererConversationId(
                        utilisateur,
                        prestataireUserId.toString()
                    );

                    const demandeMessage = new messageModel({
                        expediteur: new mongoose.Types.ObjectId(utilisateur),
                        destinataire: prestataireUserId,
                        contenu: `Bonjour, j'ai une demande de prestation${notesClient ? ` : ${notesClient}` : '.'} Adresse : ${adresse}, ${ville}.`,
                        typeMessage: 'PRESTATION',
                        referenceId: newPrestation._id,
                        referenceType: 'Prestation',
                        conversationId,
                        statut: 'ENVOYE'
                    });

                    await demandeMessage.save();
                    console.log(`💬 Message de demande créé pour prestation: ${newPrestation._id}`);
                } else {
                    console.warn(`⚠️ Prestataire ${prestataire} sans utilisateur lié — notification ignorée`);
                }
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 455ed65 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
            }
        } catch (notificationError) {
            console.error('Erreur création notification nouvelle mission:', notificationError.message);
            // Ne pas faire échouer la requête principale
        }

        res.status(201).json(populatedPrestation);
    } catch (err) {
        console.error('Erreur création prestation:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR TOUTES LES PRESTATIONS (avec filtres)
export const getAllPrestations = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            statut, 
            statutPaiement,
            prestataire,
            utilisateur,
            service,
            ville,
            dateDebut,
            dateFin
        } = req.query;

        // Construction des filtres
        const filters = {};
        if (statut) filters.statut = statut;
        if (statutPaiement) filters.statutPaiement = statutPaiement;
        if (prestataire) filters.prestataire = new mongoose.Types.ObjectId(prestataire);
        if (utilisateur) filters.utilisateur = new mongoose.Types.ObjectId(utilisateur);
        if (service) filters.service = new mongoose.Types.ObjectId(service);
        if (ville) filters.ville = { $regex: ville, $options: 'i' };
        
        if (dateDebut && dateFin) {
            filters.datePrestation = {
                $gte: new Date(dateDebut),
                $lte: new Date(dateFin)
            };
        }

        const prestations = await prestationModel.find(filters)
            .populate('utilisateur', 'nom prenom email telephone photoProfil')
            .populate({
                path: 'prestataire',
                populate: {
                    path: 'utilisateur',
                    select: 'nom prenom telephone'
                }
            })
            .populate({
                path: 'service',
                populate: {
                    path: 'categorie',
                    select: 'nomcategorie'
                }
            })
            .sort({ datePrestation: -1, createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await prestationModel.countDocuments(filters);

        res.status(200).json({
            prestations,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error('Erreur récupération prestations:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR UNE PRESTATION PAR ID
export const getPrestationById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de prestation invalide' });
        }

        const prestation = await prestationModel.findById(id)
            .populate('utilisateur', 'nom prenom email telephone photoProfil')
            .populate({
                path: 'prestataire',
                populate: {
                    path: 'utilisateur',
                    select: 'nom prenom telephone'
                }
            })
            .populate({
                path: 'service',
                populate: {
                    path: 'categorie',
                    populate: {
                        path: 'groupe',
                        select: 'nomgroupe'
                    }
                }
            });

        if (!prestation) {
            return res.status(404).json({ error: 'Prestation non trouvée' });
        }

        res.status(200).json(prestation);
    } catch (err) {
        console.error('Erreur récupération prestation:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ METTRE À JOUR UNE PRESTATION
export const updatePrestation = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de prestation invalide' });
        }

        // Upload de photos après si présentes
        if (req.files?.photosApres) {
            const photosApres = [];
            for (const file of req.files.photosApres) {
                const result = await cloudinary.v2.uploader.upload(file.path, {
                    folder: 'prestations/apres',
                });
                photosApres.push(result.secure_url);
                fs.unlinkSync(file.path);
            }
            updates.photosApres = photosApres;
        }

        const prestation = await prestationModel.findByIdAndUpdate(
            id,
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true }
        )
        .populate('utilisateur', 'nom prenom email telephone')
        .populate('prestataire', 'utilisateur')
        .populate('service', 'nomservice');

        if (!prestation) {
            return res.status(404).json({ error: 'Prestation non trouvée' });
        }

        res.status(200).json(prestation);
    } catch (err) {
        console.error('Erreur mise à jour prestation:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ CHANGER LE STATUT D'UNE PRESTATION
export const changerStatutPrestation = async (req, res) => {
    try {
        const { id } = req.params;
        const { statut, nouveauStatut, commentaire } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de prestation invalide' });
        }

        // Support des deux formats de paramètres
        const newStatus = statut || nouveauStatut;
        
        const statutsValides = ['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'EN_COURS', 'TERMINEE', 'ANNULEE', 'LITIGE'];
        if (!statutsValides.includes(newStatus)) {
            return res.status(400).json({ error: 'Statut invalide' });
        }

        const prestation = await prestationModel.findById(id);
        if (!prestation) {
            return res.status(404).json({ error: 'Prestation non trouvée' });
        }

        await prestation.changerStatut(newStatus, commentaire || '');

        // 🔔 CRÉER UNE NOTIFICATION AUTOMATIQUE
        try {
            const notificationModel = (await import('../models/notificationModel.js')).default;
            
            let notificationData = {
                destinataire: prestation.utilisateur,
                prestation: prestation._id,
                donnees: {
                    prestationId: prestation._id,
                    ancienStatut: prestation.statut,
                    nouveauStatut: newStatus
                }
            };

            switch (newStatus) {
                case 'ACCEPTEE':
                    notificationData.type = 'MISSION_ACCEPTEE';
                    notificationData.titre = 'Mission acceptée !';
                    notificationData.contenu = `Votre mission a été acceptée par le prestataire. Il va bientôt commencer.`;
                    notificationData.priorite = 'HAUTE';
                    break;
                case 'REFUSEE':
                    notificationData.type = 'MISSION_REFUSEE';
                    notificationData.titre = 'Mission refusée';
                    notificationData.contenu = `Votre mission a été refusée par le prestataire.`;
                    notificationData.priorite = 'NORMALE';
                    break;
                case 'EN_COURS':
                    notificationData.type = 'MISSION_DEMARREE';
                    notificationData.titre = 'Mission démarrée !';
                    notificationData.contenu = `Le prestataire a commencé votre mission.`;
                    notificationData.priorite = 'HAUTE';
                    break;
                case 'TERMINEE':
                    notificationData.type = 'MISSION_TERMINEE';
                    notificationData.titre = 'Mission terminée !';
                    notificationData.contenu = `Votre mission a été terminée par le prestataire.`;
                    notificationData.priorite = 'HAUTE';
                    break;
            }

            if (notificationData.type) {
                const notification = new notificationModel(notificationData);
                await notification.save();
                console.log(`🔔 Notification créée: ${notificationData.type}`);
            }
        } catch (notificationError) {
            console.error('Erreur création notification:', notificationError.message);
            // Ne pas faire échouer la requête principale
        }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 455ed65 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
        // 💬 CRÉER / CORRIGER LA CONVERSATION AUTOMATIQUE POUR LES PRESTATIONS ACCEPTÉES
        if (newStatus === 'ACCEPTEE') {
            try {
                const messageModel = (await import('../models/messageModel.js')).default;

                const prestataireDoc = await prestataireModel
                    .findById(prestation.prestataire)
                    .select('utilisateur');

                if (!prestataireDoc?.utilisateur) {
                    console.warn(`⚠️ Prestataire ${prestation.prestataire} sans utilisateur — conversation ignorée`);
                } else {
                    const prestataireUserId = prestataireDoc.utilisateur.toString();
                    const conversationId = messageModel.genererConversationId(
                        prestation.utilisateur.toString(),
                        prestataireUserId
                    );

                    const welcomeContent =
                        `Bonjour ! J'ai accepté votre mission. Je vais commencer bientôt. N'hésitez pas à me contacter si vous avez des questions.`;

                    const existingForPrestation = await messageModel.findOne({
                        referenceId: prestation._id,
                        contenu: { $regex: /accepté votre mission/i },
                    });

                    if (existingForPrestation) {
                        existingForPrestation.expediteur = prestataireDoc.utilisateur;
                        existingForPrestation.destinataire = prestation.utilisateur;
                        existingForPrestation.conversationId = conversationId;
                        await existingForPrestation.save();
                        console.log(`💬 Message prestation corrigé pour: ${prestation._id}`);
                    } else {
                        const welcomeMessage = new messageModel({
                            expediteur: prestataireDoc.utilisateur,
                            destinataire: prestation.utilisateur,
                            contenu: welcomeContent,
                            typeMessage: 'PRESTATION',
                            referenceId: prestation._id,
                            referenceType: 'Prestation',
                            conversationId,
                            statut: 'ENVOYE'
                        });

                        await welcomeMessage.save();
                        console.log(`💬 Conversation créée automatiquement pour prestation: ${prestation._id}`);
                    }
<<<<<<< HEAD
=======
        // 💬 CRÉER UNE CONVERSATION AUTOMATIQUE POUR LES PRESTATIONS ACCEPTÉES
=======
        // 💬 CRÉER / CORRIGER LA CONVERSATION AUTOMATIQUE POUR LES PRESTATIONS ACCEPTÉES
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
        if (newStatus === 'ACCEPTEE') {
            try {
                const messageModel = (await import('../models/messageModel.js')).default;

                const prestataireDoc = await prestataireModel
                    .findById(prestation.prestataire)
                    .select('utilisateur');

                if (!prestataireDoc?.utilisateur) {
                    console.warn(`⚠️ Prestataire ${prestation.prestataire} sans utilisateur — conversation ignorée`);
                } else {
                    const prestataireUserId = prestataireDoc.utilisateur.toString();
                    const conversationId = messageModel.genererConversationId(
                        prestation.utilisateur.toString(),
                        prestataireUserId
                    );

                    const welcomeContent =
                        `Bonjour ! J'ai accepté votre mission. Je vais commencer bientôt. N'hésitez pas à me contacter si vous avez des questions.`;

                    const existingForPrestation = await messageModel.findOne({
                        referenceId: prestation._id,
                        contenu: { $regex: /accepté votre mission/i },
                    });

<<<<<<< HEAD
                    await welcomeMessage.save();
                    console.log(`💬 Conversation créée automatiquement pour prestation: ${prestation._id}`);
                } else {
                    console.log(`💬 Conversation existante trouvée pour prestation: ${prestation._id}`);
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
                    if (existingForPrestation) {
                        existingForPrestation.expediteur = prestataireDoc.utilisateur;
                        existingForPrestation.destinataire = prestation.utilisateur;
                        existingForPrestation.conversationId = conversationId;
                        await existingForPrestation.save();
                        console.log(`💬 Message prestation corrigé pour: ${prestation._id}`);
                    } else {
                        const welcomeMessage = new messageModel({
                            expediteur: prestataireDoc.utilisateur,
                            destinataire: prestation.utilisateur,
                            contenu: welcomeContent,
                            typeMessage: 'PRESTATION',
                            referenceId: prestation._id,
                            referenceType: 'Prestation',
                            conversationId,
                            statut: 'ENVOYE'
                        });

                        await welcomeMessage.save();
                        console.log(`💬 Conversation créée automatiquement pour prestation: ${prestation._id}`);
                    }
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 455ed65 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
                }
            } catch (conversationError) {
                console.error('Erreur création conversation:', conversationError.message);
                // Ne pas faire échouer la requête principale
            }
        }

        res.status(200).json({
            message: 'Statut mis à jour avec succès',
            prestation
        });
    } catch (err) {
        console.error('Erreur changement statut prestation:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ SUPPRIMER UNE PRESTATION
export const deletePrestation = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de prestation invalide' });
        }

        const prestation = await prestationModel.findByIdAndDelete(id);
        
        if (!prestation) {
            return res.status(404).json({ error: 'Prestation non trouvée' });
        }
        
        res.status(200).json({ message: 'Prestation supprimée avec succès' });
    } catch (err) {
        console.error('Erreur suppression prestation:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR LES PRESTATIONS D'UN PRESTATAIRE
export const getPrestationsPrestataire = async (req, res) => {
    try {
        const { prestataireId } = req.params;
        const { page = 1, limit = 20, statut } = req.query;

        if (!mongoose.Types.ObjectId.isValid(prestataireId)) {
            return res.status(400).json({ error: 'ID prestataire invalide' });
        }

        const filters = { prestataire: new mongoose.Types.ObjectId(prestataireId) };
        if (statut) filters.statut = statut;

        const prestations = await prestationModel.find(filters)
            .populate('utilisateur', 'nom prenom email telephone')
            .populate('service', 'nomservice')
            .sort({ datePrestation: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await prestationModel.countDocuments(filters);

        res.status(200).json({
            prestations,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error('Erreur récupération prestations prestataire:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR LES PRESTATIONS D'UN UTILISATEUR
export const getPrestationsUtilisateur = async (req, res) => {
    try {
        const { utilisateurId } = req.params;
        const { page = 1, limit = 20, statut } = req.query;

        if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        const filters = { utilisateur: new mongoose.Types.ObjectId(utilisateurId) };
        if (statut) filters.statut = statut;

        const prestations = await prestationModel.find(filters)
            .populate('prestataire', 'utilisateur')
            .populate('service', 'nomservice')
            .sort({ datePrestation: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await prestationModel.countDocuments(filters);

        res.status(200).json({
            prestations,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error('Erreur récupération prestations utilisateur:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR LES STATISTIQUES DES PRESTATIONS
export const getPrestationStats = async (req, res) => {
    try {
        const { prestataireId, utilisateurId, dateDebut, dateFin } = req.query;

        let matchCondition = {};
        
        // Filtres optionnels
        if (prestataireId) {
            matchCondition.prestataire = new mongoose.Types.ObjectId(prestataireId);
        }
        if (utilisateurId) {
            matchCondition.utilisateur = new mongoose.Types.ObjectId(utilisateurId);
        }
        if (dateDebut && dateFin) {
            matchCondition.datePrestation = {
                $gte: new Date(dateDebut),
                $lte: new Date(dateFin)
            };
        }

        // Stats par statut
        const statsParStatut = await prestationModel.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: '$statut',
                    count: { $sum: 1 },
                    totalRevenu: { $sum: '$montantTotal' }
                }
            }
        ]);

        // Stats par ville
        const statsParVille = await prestationModel.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: '$ville',
                    count: { $sum: 1 },
                    totalRevenu: { $sum: '$montantTotal' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Évolution par mois
        const prestationsParMois = await prestationModel.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: {
                        year: { $year: '$datePrestation' },
                        month: { $month: '$datePrestation' }
                    },
                    count: { $sum: 1 },
                    totalRevenu: { $sum: '$montantTotal' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
        ]);

        const totalPrestations = await prestationModel.countDocuments(matchCondition);
        const revenueTotal = await prestationModel.aggregate([
            { $match: matchCondition },
            { $group: { _id: null, total: { $sum: '$montantTotal' } } }
        ]);

        res.status(200).json({
            statsParStatut,
            statsParVille,
            prestationsParMois,
            totalPrestations,
            revenueTotal: revenueTotal[0]?.total || 0
        });
    } catch (err) {
        console.error('Erreur statistiques prestations:', err.message);
        res.status(500).json({ error: err.message });
    }
};