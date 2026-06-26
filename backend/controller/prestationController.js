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

// 🔹 Fonction utilitaire upload Cloudinary
const uploadToCloudinary = async (filePath, folder) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, { folder });
    fs.unlinkSync(filePath); // supprimer le fichier local
    return result;
  } catch (err) {
    console.error("Erreur upload Cloudinary:", err.message);
    throw err;
  }
};

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

    const parseNumber = (value, fallback = 0) => {
      if (value === null || typeof value === "undefined" || value === "") {
        return fallback;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

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
      }
      return [String(v)];
    };

    const specialiteArr = parseStringArrayField(specialite);
    const zoneInterventionArr = parseStringArrayField(zoneIntervention);
    const clientsRaw = parseStringArrayField(clients);
    const clientsIds = clientsRaw
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

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
      }
      
      if (!finalService) {
        console.warn(`⚠️ Aucun service trouvé pour la catégorie: ${category}`);
        // Utiliser un service par défaut ou créer une erreur
        return res.status(400).json({ 
          error: `Aucun service trouvé pour la catégorie: ${category}` 
        });
      }
    } else if (serviceMissing) {
      return res.status(400).json({ error: "service ou category requis" });
    }

    // Parsing localisationmaps
    let parsedLocalisation = null;
    if (localisationmaps) {
      if (typeof localisationmaps === "string") {
        try {
          parsedLocalisation = JSON.parse(localisationmaps);
        } catch (err) {
          console.warn("Impossible de parser localisationmaps:", err);
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

    // Upload diplômes
    let diplomeCertificat = [];
    if (req.files?.diplomeCertificat) {
      for (const file of req.files.diplomeCertificat) {
        const uploaded = await uploadToCloudinary(file.path, "prestataires/diplomes");
        diplomeCertificat.push(uploaded.secure_url);
      }
    }

    // Upload fichiers simples
    let uploads = {};
    if (req.files?.cni1) {
      uploads.cni1 = (await uploadToCloudinary(req.files.cni1[0].path, "prestataires/cni")).secure_url;
    }
    if (req.files?.cni2) {
      uploads.cni2 = (await uploadToCloudinary(req.files.cni2[0].path, "prestataires/cni")).secure_url;
    }
    if (req.files?.selfie) {
      uploads.selfie = (await uploadToCloudinary(req.files.selfie[0].path, "prestataires/selfies")).secure_url;
    }
    if (req.files?.attestationAssurance) {
      uploads.attestationAssurance = (await uploadToCloudinary(req.files.attestationAssurance[0].path, "prestataires/assurance")).secure_url;
    }

    // Création prestataire — status/verifier contrôlés côté serveur
    const isAdminUser = isAdmin(req);
    const newPrestataire = new prestataireModel({
      utilisateur: new mongoose.Types.ObjectId(utilisateur),
      service: new mongoose.Types.ObjectId(finalService),
      prixprestataire: parseNumber(prixprestataire, 0),
      localisation,
      note: parseNumber(note, 0),
      verifier: isAdminUser && (verifier === "true" || verifier === true),
      status: "incomplete",
      specialite: specialiteArr,
      anneeExperience,
      description,
      rayonIntervention: parseNumber(rayonIntervention, 10),
      zoneIntervention: zoneInterventionArr,
      localisationmaps: parsedLocalisation,
      tarifHoraireMin: parseNumber(tarifHoraireMin, 0),
      tarifHoraireMax: parseNumber(tarifHoraireMax, 0),
      numeroCNI,
      numeroRCCM,
      numeroAssurance,
      nbMission: parseNumber(nbMission, 0),
      nbAvis: parseNumber(req.body.nbAvis, 0),
      revenus: parseNumber(revenus, 0),
      clients: clientsIds,
      diplomeCertificat,
      ...uploads,
    });

    // Traçabilité (source autorisée ; status ignoré du client)
    if (req.body.source) {
      newPrestataire.source = Array.isArray(req.body.source)
        ? req.body.source[0]
        : req.body.source;
    }
    if (req.body.recenseur && mongoose.Types.ObjectId.isValid(req.body.recenseur)) {
      newPrestataire.recenseur = new mongoose.Types.ObjectId(req.body.recenseur);
    }
    if (req.body.dateRecensement) {
      newPrestataire.dateRecensement = new Date(req.body.dateRecensement);
    }

    newPrestataire.syncFinalizationFromDocuments();
    await newPrestataire.save();

    const populatedPrestataire = await prestataireModel
      .findById(newPrestataire._id)
      .populate("utilisateur")
      .populate("service")
      .populate("clients");

    res.status(201).json(populatedPrestataire);
  } catch (err) {
    console.error("Erreur création prestataire:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Mettre à jour un prestataire
export const updatePrestataire = async (req, res) => {
  try {
    const {
      utilisateur,
      service,
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
      clients
    } = req.body;

    const parseNumber = (value) => {
      if (value === null || typeof value === "undefined" || value === "") {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    // Parsing localisationmaps
    let parsedLocalisation = null;
    if (localisationmaps) {
      if (typeof localisationmaps === "string") {
        try {
          parsedLocalisation = JSON.parse(localisationmaps);
        } catch (err) {
          console.warn("Impossible de parser localisationmaps, on ignore", err);
        }
      } else if (typeof localisationmaps === "object" && localisationmaps.latitude && localisationmaps.longitude) {
        parsedLocalisation = localisationmaps;
      }
    }

        const filters = { prestataire: new mongoose.Types.ObjectId(prestataireId) };
        if (statut) filters.statut = statut;

    const isAdminUser = isAdmin(req);
    if (isAdminUser && typeof verifier !== "undefined") {
      updates.verifier = verifier === "true" || verifier === true;
    }
    if (isAdminUser && req.body.status) {
      updates.status = req.body.status;
    }

    // Upload fichiers simples
    for (const field of ["cni1", "cni2", "selfie", "attestationAssurance"]) {
      if (req.files?.[field]?.[0]) {
        const result = await uploadToCloudinary(req.files[field][0].path, `prestataires/${field}`);
        updates[field] = result.secure_url;
      }
    }

    // Diplômes
    if (req.files?.diplomeCertificat) {
      updates.diplomeCertificat = [];
      for (const file of req.files.diplomeCertificat) {
        const result = await uploadToCloudinary(file.path, "prestataires/diplomes");
        updates.diplomeCertificat.push({
          filename: file.originalname,
          url: result.secure_url,
          type: file.mimetype.includes("pdf") ? "pdf" : "image",
          uploadedAt: new Date()
        });
      }
    }

    const prestataire = await prestataireModel.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate("utilisateur")
      .populate({ path: "service", populate: { path: "categorie", populate: { path: "groupe" } } })
      .populate("clients");

    if (!prestataire) return res.status(404).json({ error: "Prestataire non trouvé" });

    if (!isAdminUser) {
      prestataire.syncFinalizationFromDocuments();
      await prestataire.save();
    }

    res.status(200).json(prestataire);

  } catch (err) {
    console.error("Erreur mise à jour prestataire:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Lire tous les prestataires (avec filtres optionnels)
export const getAllPrestataires = async (req, res) => {
  try {
    const { service, categorie, ville, status, utilisateur, verifier, limit = 50, page = 1 } = req.query;

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

    if (!isPubliclyVisible && !adminUser && !isOwner) {
      return res.status(404).json({ error: "Prestataire non trouvé" });
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

// 🆕 OPTION C - Récupérer les prestataires en attente (toutes sources)
export const getPendingPrestataires = async (req, res) => {
  try {
    const prestataires = await prestataireModel.find({ status: "pending" })
      .populate("utilisateur")
      .populate("recenseur", "nom prenom telephone")
      .populate({
        path: "service",
        populate: {
          path: "categorie",
          populate: { path: "groupe" }
        }
      })
      .sort({ dateRecensement: -1 });

    res.status(200).json(prestataires);
  } catch (err) {
    console.error("Erreur récupération prestataires pending:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 🆕 OPTION C - Valider un prestataire
export const validatePrestataire = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const prestataire = await prestataireModel.findById(id);
    
    if (!prestataire) {
      return res.status(404).json({ error: "Prestataire non trouvé" });
    }

    if (prestataire.status !== 'pending') {
      return res.status(400).json({ error: "Prestataire déjà traité" });
    }

    prestataire.status = 'active';
    prestataire.verifier = true;
    prestataire.validePar = adminId;
    prestataire.dateValidation = new Date();

    await prestataire.save();

    const populatedPrestataire = await prestataireModel.findById(id)
      .populate("utilisateur")
      .populate("recenseur", "nom prenom")
      .populate("service");

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

// 🆕 OPTION C - Rejeter un prestataire
export const rejectPrestataire = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;
    const adminId = req.user._id;

    const prestataire = await prestataireModel.findById(id);
    
    if (!prestataire) {
      return res.status(404).json({ error: "Prestataire non trouvé" });
    }

    if (prestataire.status !== 'pending') {
      return res.status(400).json({ error: "Prestataire déjà traité" });
    }

    prestataire.status = 'rejected';
    prestataire.motifRejet = motif || 'Non spécifié';
    prestataire.validePar = adminId;
    prestataire.dateValidation = new Date();

    await prestataire.save();

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