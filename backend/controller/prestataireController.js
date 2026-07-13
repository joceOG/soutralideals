import prestataireModel from "../models/prestataireModel.js";
import mongoose from "mongoose";
import { getServiceIdsUnderServicesGenerauxCategories } from "../utils/catalogFilters.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
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

    // ✅ GESTION INSCRIPTION SIMPLIFIÉE
    let finalService = service;
    if (!service && category) {
      // Si pas de service fourni mais une catégorie, trouver le service correspondant
      const Service = (await import("../models/serviceModel.js")).default;
      const Categorie = (await import("../models/categorieModel.js")).default;
      
      // Trouver la catégorie par nom
      const categorieDoc = await Categorie.findOne({ 
        nomcategorie: { $regex: new RegExp(category, 'i') } 
      });
      
      if (categorieDoc) {
        // Trouver le premier service de cette catégorie
        const serviceDoc = await Service.findOne({ categorie: categorieDoc._id });
        if (serviceDoc) {
          finalService = serviceDoc._id;
          console.log(`✅ Service trouvé pour catégorie ${category}: ${serviceDoc._id}`);
        }
      }
      
      if (!finalService) {
        console.warn(`⚠️ Aucun service trouvé pour la catégorie: ${category}`);
        // Utiliser un service par défaut ou créer une erreur
        return res.status(400).json({ 
          error: `Aucun service trouvé pour la catégorie: ${category}` 
        });
      }
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
      } else if (typeof localisationmaps === "object" && localisationmaps.latitude && localisationmaps.longitude) {
        parsedLocalisation = localisationmaps;
      }
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

    // Création prestataire
    const newPrestataire = new prestataireModel({
      utilisateur: mongoose.Types.ObjectId(utilisateur),
      service: mongoose.Types.ObjectId(finalService), // ✅ Utiliser le service trouvé
      prixprestataire,
      localisation,
      note: parseNumber(note, 0),
      verifier: verifier === "true" || verifier === true,
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

    // 🆕 OPTION C - Traçabilité (ajout conditionnel pour éviter erreurs)
    if (req.body.source) {
      newPrestataire.source = req.body.source;
    }
    if (req.body.status) {
      newPrestataire.status = req.body.status;
    }
    if (req.body.recenseur && mongoose.Types.ObjectId.isValid(req.body.recenseur)) {
      newPrestataire.recenseur = new mongoose.Types.ObjectId(req.body.recenseur);
    }
    if (req.body.dateRecensement) {
      newPrestataire.dateRecensement = new Date(req.body.dateRecensement);
    }

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

    const updates = {
      ...(utilisateur && { utilisateur: new mongoose.Types.ObjectId(utilisateur) }),
      ...(service && { service: new mongoose.Types.ObjectId(service) }),
      ...(typeof parseNumber(prixprestataire) !== "undefined" && { prixprestataire: parseNumber(prixprestataire) }),
      ...(localisation && { localisation }),
      ...(typeof parseNumber(note) !== "undefined" && { note: parseNumber(note) }),
      ...(typeof verifier !== "undefined" && { verifier: verifier === "true" || verifier === true }),
      ...(specialite && { specialite: Array.isArray(specialite) ? specialite : [specialite] }),
      ...(anneeExperience && { anneeExperience }),
      ...(description && { description }),
      ...(typeof parseNumber(rayonIntervention) !== "undefined" && { rayonIntervention: parseNumber(rayonIntervention) }),
      ...(zoneIntervention && { zoneIntervention: Array.isArray(zoneIntervention) ? zoneIntervention : [zoneIntervention] }),
      ...(parsedLocalisation && { localisationmaps: parsedLocalisation }),
      ...(typeof parseNumber(tarifHoraireMin) !== "undefined" && { tarifHoraireMin: parseNumber(tarifHoraireMin) }),
      ...(typeof parseNumber(tarifHoraireMax) !== "undefined" && { tarifHoraireMax: parseNumber(tarifHoraireMax) }),
      ...(numeroCNI && { numeroCNI }),
      ...(numeroRCCM && { numeroRCCM }),
      ...(numeroAssurance && { numeroAssurance }),
      ...(typeof parseNumber(nbMission) !== "undefined" && { nbMission: parseNumber(nbMission) }),
      ...(typeof parseNumber(req.body.nbAvis) !== "undefined" && { nbAvis: parseNumber(req.body.nbAvis) }),
      ...(typeof parseNumber(revenus) !== "undefined" && { revenus: parseNumber(revenus) }),
      ...(clients && { clients: clients.map(id => new mongoose.Types.ObjectId(id)) }),
    };

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
    res.status(200).json(prestataire);

  } catch (err) {
    console.error("Erreur mise à jour prestataire:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Lire tous les prestataires (avec filtres optionnels)
export const getAllPrestataires = async (req, res) => {
  try {
    const { service, categorie, ville, status, utilisateur, limit = 50, page = 1 } = req.query;

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
    if (status) filter.status = status;
    if (utilisateur) filter.utilisateur = utilisateur;
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

// 🆕 OPTION C - Récupérer les prestataires en attente
export const getPendingPrestataires = async (req, res) => {
  try {
    const prestataires = await prestataireModel.find({ 
      status: { $in: ['pending', 'incomplete'] },
      source: { $in: ['sdealsidentification', 'sdealsmobile'] }
    })
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
    const adminId = req.body.adminId || req.user?._id;

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
    const adminId = req.body.adminId || req.user?._id;

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