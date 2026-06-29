import prestationModel from '../models/prestationModel.js';
import prestataireModel from '../models/prestataireModel.js';
import mongoose from 'mongoose';
import cloudinary from 'cloudinary';
import fs from 'fs';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Créer un prestataire
export const createPrestataire = async (req, res) => {
  try {
    const {
      utilisateur,
      service,
      category, // ✅ Nouveau: catégorie pour inscription simplifiée
      prixprestataire,
      localisation,
      note,
      verifier,
      specialite,
      anneeExperience,
      description,
      rayonIntervention,
      zoneIntervention,
      localisationmaps,
      tarifHoraireMin,
      tarifHoraireMax,
      numeroCNI,
      numeroRCCM,
      numeroAssurance,
      nbMission,
      revenus,
      clients,
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
            utilisateur: mongoose.Types.ObjectId(utilisateur),
            prestataire: prestataire ? mongoose.Types.ObjectId(prestataire) : null,
            service: service ? mongoose.Types.ObjectId(service) : null,
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
        if (prestataire) filters.prestataire = mongoose.Types.ObjectId(prestataire);
        if (utilisateur) filters.utilisateur = mongoose.Types.ObjectId(utilisateur);
        if (service) filters.service = mongoose.Types.ObjectId(service);
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

// ✅ Lire tous les prestataires (avec filtres optionnels)
export const getAllPrestataires = async (req, res) => {
  try {
    const { service, categorie, ville, status, utilisateur, verifier, limit = 50, page = 1 } = req.query;

    const excludedSvc = await getServiceIdsUnderServicesGenerauxCategories();
    const filter = {};
    if (service) {
      if (
        excludedSvc.length &&
        excludedSvc.some((id) => String(id) === String(service))
      ) {
        return res.json([]);
      }
      filter.service = service;
    } else if (excludedSvc.length) {
      filter.service = { $nin: excludedSvc };
    }

    const adminUser = isAdmin(req);
    const isOwnProfile =
      utilisateur &&
      req.utilisateur &&
      String(utilisateur) === String(req.utilisateur._id);

    if (adminUser) {
      if (status) filter.status = status;
      if (verifier !== undefined) filter.verifier = verifier === "true" || verifier === true;
    } else if (isOwnProfile) {
      if (status) filter.status = status;
      filter.utilisateur = utilisateur;
    } else {
      // Catalogue public : uniquement profils validés
      filter.status = "active";
      filter.verifier = true;
    }

    if (utilisateur && (adminUser || isOwnProfile)) {
      filter.utilisateur = utilisateur;
    }
    if (ville) filter['localisation.ville'] = { $regex: ville, $options: 'i' };

    const prestataires = await prestataireModel.find(filter)
      .populate('utilisateur', 'nom prenom photoProfil email telephone')
      .populate({
        path: 'service',
        match: categorie ? { categorie } : undefined,
        populate: {
          path: 'categorie',
          populate: { path: 'groupe' }
        }
      })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Si filtre categorie via populate match, retirer les null
    const result = categorie
      ? prestataires.filter(p => p.service !== null)
      : prestataires;

    res.status(200).json(result);
  } catch (err) {
    console.error('Erreur récupération prestataires:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Lire prestataire par ID
export const getPrestataireById = async (req, res) => {
  try {
    const prestataire = await prestataireModel.findById(req.params.id)
      .populate("utilisateur")
      .populate({
        path: "service",
        populate: {
          path: "categorie",
          populate: { path: "groupe" }
        }
      });

    if (!prestataire) return res.status(404).json({ error: "Prestataire non trouvé" });

    const adminUser = isAdmin(req);
    const isOwner =
      req.utilisateur &&
      prestataire.utilisateur &&
      String(prestataire.utilisateur._id ?? prestataire.utilisateur) ===
        String(req.utilisateur._id);

    const isPubliclyVisible =
      prestataire.status === "active" && prestataire.verifier === true;

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

    res.status(200).json(prestataire);
  } catch (err) {
    console.error("Erreur lecture prestataire:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Supprimer un prestataire
export const deletePrestataire = async (req, res) => {
  try {
    const prestataire = await prestataireModel.findByIdAndDelete(req.params.id);
    if (!prestataire) return res.status(404).json({ error: "Prestataire non trouvé" });
    res.status(200).json({ message: "Prestataire supprimé avec succès" });
  } catch (err) {
    console.error("Erreur suppression prestataire:", err.message);
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

        const filters = { prestataire: mongoose.Types.ObjectId(prestataireId) };
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

        const filters = { utilisateur: mongoose.Types.ObjectId(utilisateurId) };
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
      success: true,
      message: "Prestataire validé avec succès",
      prestataire: populatedPrestataire
    });
  } catch (err) {
    console.error("Erreur validation prestataire:", err.message);
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
            matchCondition.prestataire = mongoose.Types.ObjectId(prestataireId);
        }
        if (utilisateurId) {
            matchCondition.utilisateur = mongoose.Types.ObjectId(utilisateurId);
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
      success: true,
      message: "Prestataire rejeté",
      prestataire
    });
  } catch (err) {
    console.error("Erreur rejet prestataire:", err.message);
    res.status(500).json({ error: err.message });
  }
};