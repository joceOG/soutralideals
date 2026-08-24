import prestataireModel from "../models/prestataireModel.js";
import mongoose from "mongoose";
import { getServiceIdsUnderServicesGenerauxCategories } from "../utils/catalogFilters.js";
import { isAdmin } from "../middleware/entityAccess.js";
import { pickFields } from '../utils/pickFields.js';
import { buildRecensementCreateFields, isRecensementRequest, assertRecensementAgent } from '../utils/recensementPolicy.js';
import { uploadKycToCloudinary, redactKycDocument, canAccessKyc, resolveKycFieldsForAuthorizedViewer } from '../utils/kycAccess.js';
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔹 Upload Cloudinary — KYC = authenticated (pas d'URL publique)
const uploadToCloudinary = async (filePath, folder, { kyc = false } = {}) => {
  try {
    if (kyc) {
      const { ref } = await uploadKycToCloudinary(filePath, folder);
      fs.unlinkSync(filePath);
      return { secure_url: ref, kyc: true };
    }
    const result = await cloudinary.uploader.upload(filePath, { folder });
    fs.unlinkSync(filePath);
    return result;
  } catch (err) {
    console.error("Erreur upload Cloudinary:", err.message);
    throw err;
  }
};

const PRESTATAIRE_OWNER_FIELDS = [
  'service', 'prixprestataire', 'localisation', 'specialite', 'anneeExperience',
  'description', 'rayonIntervention', 'zoneIntervention', 'localisationmaps',
  'tarifHoraireMin', 'tarifHoraireMax', 'numeroCNI', 'numeroRCCM', 'numeroAssurance',
  'clients', 'disponible', 'creneaux',
];

const PRESTATAIRE_ADMIN_FIELDS = ['note', 'nbAvis', 'nbMission', 'revenus', 'verifier', 'status', 'utilisateur'];

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

    /** multipart/form-data : specialite, zoneIntervention, clients souvent en JSON string (dashboard + mobile). */
    const parseStringArrayField = (v) => {
      if (v == null || v === "") return [];
      if (Array.isArray(v)) return v.map((x) => String(x));
      if (typeof v === "string") {
        try {
          const p = JSON.parse(v);
          return Array.isArray(p) ? p.map((x) => String(x)) : [String(p)];
        } catch {
          return [v];
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

    // ✅ GESTION INSCRIPTION SIMPLIFIÉE
    let finalService = service;
    const serviceMissing =
      !service ||
      service === "" ||
      (typeof service === "string" && !mongoose.Types.ObjectId.isValid(service));
    if (serviceMissing && category) {
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
      uploads.cni1 = (await uploadToCloudinary(req.files.cni1[0].path, "prestataires/cni", { kyc: true })).secure_url;
    }
    if (req.files?.cni2) {
      uploads.cni2 = (await uploadToCloudinary(req.files.cni2[0].path, "prestataires/cni", { kyc: true })).secure_url;
    }
    if (req.files?.selfie) {
      uploads.selfie = (await uploadToCloudinary(req.files.selfie[0].path, "prestataires/selfies", { kyc: true })).secure_url;
    }
    if (req.files?.attestationAssurance) {
      uploads.attestationAssurance = (await uploadToCloudinary(req.files.attestationAssurance[0].path, "prestataires/assurance", { kyc: true })).secure_url;
    }

    // STAB-11b : permission agent avant création terrain
    const denied = assertRecensementAgent(req);
    if (denied) {
      return res.status(denied.status).json({ error: denied.error });
    }

    // Création prestataire — status/verifier/recenseur contrôlés côté serveur (STAB-11)
    const isAdminUser = isAdmin(req);
    const isTerrain = isRecensementRequest(req);
    const ownerId =
      (isAdminUser || isTerrain) && utilisateur
        ? utilisateur
        : req.utilisateur._id.toString();

    const recensement = buildRecensementCreateFields(req, {
      defaultStatus: 'incomplete',
    });

    const newPrestataire = new prestataireModel({
      utilisateur: new mongoose.Types.ObjectId(ownerId),
      service: new mongoose.Types.ObjectId(finalService),
      prixprestataire: parseNumber(prixprestataire, 0),
      localisation,
      note: isAdminUser ? parseNumber(note, 0) : 0,
      verifier: isAdminUser && (verifier === "true" || verifier === true),
      status: recensement.status || "incomplete",
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
      nbMission: isAdminUser ? parseNumber(nbMission, 0) : 0,
      nbAvis: isAdminUser ? parseNumber(req.body.nbAvis, 0) : 0,
      revenus: isAdminUser ? parseNumber(revenus, 0) : 0,
      clients: clientsIds,
      diplomeCertificat,
      ...uploads,
    });

    if (recensement.source) newPrestataire.source = recensement.source;
    if (recensement.recenseur) newPrestataire.recenseur = recensement.recenseur;
    if (recensement.dateRecensement) {
      newPrestataire.dateRecensement = recensement.dateRecensement;
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
    const isAdminUser = isAdmin(req);
    const allowedFields = isAdminUser
      ? [...PRESTATAIRE_OWNER_FIELDS, ...PRESTATAIRE_ADMIN_FIELDS]
      : PRESTATAIRE_OWNER_FIELDS;
    const body = pickFields(req.body, allowedFields);

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
      clients,
      status,
      disponible,
      creneaux,
    } = body;

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
      ...(isAdminUser && utilisateur && { utilisateur: new mongoose.Types.ObjectId(utilisateur) }),
      ...(service && { service: new mongoose.Types.ObjectId(service) }),
      ...(typeof parseNumber(prixprestataire) !== "undefined" && { prixprestataire: parseNumber(prixprestataire) }),
      ...(localisation && { localisation }),
      ...(isAdminUser && typeof parseNumber(note) !== "undefined" && { note: parseNumber(note) }),
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
      ...(isAdminUser && typeof parseNumber(nbMission) !== "undefined" && { nbMission: parseNumber(nbMission) }),
      ...(isAdminUser && typeof parseNumber(body.nbAvis) !== "undefined" && { nbAvis: parseNumber(body.nbAvis) }),
      ...(isAdminUser && typeof parseNumber(revenus) !== "undefined" && { revenus: parseNumber(revenus) }),
      ...(clients && { clients: clients.map(id => new mongoose.Types.ObjectId(id)) }),
      ...(typeof disponible !== 'undefined' && {
        disponible: disponible === true || disponible === 'true',
      }),
      ...(Array.isArray(creneaux) && {
        creneaux: creneaux
          .filter((c) => c && typeof c.jour !== 'undefined' && c.heureDebut && c.heureFin)
          .map((c) => ({
            jour: Number(c.jour),
            heureDebut: String(c.heureDebut),
            heureFin: String(c.heureFin),
            actif: c.actif !== false && c.actif !== 'false',
          })),
      }),
    };

    if (isAdminUser && typeof verifier !== "undefined") {
      updates.verifier = verifier === "true" || verifier === true;
      // Cocher « Vérifié » dans le dashboard = approbation réelle
      if (updates.verifier === true && !status) {
        updates.status = "active";
        updates.dateValidation = new Date();
        if (req.utilisateur?._id) updates.validePar = req.utilisateur._id;
      }
    }
    if (isAdminUser && status) {
      updates.status = status;
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

    // STAB-11b : jamais exposer URLs KYC en liste (même JWT)
    const safe = result.map((p) => {
      const plain = typeof p.toObject === 'function' ? p.toObject() : p;
      const ownerId = plain.utilisateur?._id ?? plain.utilisateur;
      const allowed = canAccessKyc({
        req,
        ownerUserId: ownerId,
        recenseurId: plain.recenseur,
      });
      return allowed
        ? resolveKycFieldsForAuthorizedViewer(plain)
        : redactKycDocument(plain);
    });

    res.status(200).json(safe);
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

    if (!isPubliclyVisible && !adminUser && !isOwner) {
      return res.status(404).json({ error: "Prestataire non trouvé" });
    }

    const plain = prestataire.toObject();
    const allowed = canAccessKyc({
      req,
      ownerUserId: prestataire.utilisateur?._id ?? prestataire.utilisateur,
      recenseurId: prestataire.recenseur,
    });
    res.status(200).json(
      allowed
        ? resolveKycFieldsForAuthorizedViewer(plain)
        : redactKycDocument(plain),
    );
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
    const prestataires = await prestataireModel.find({
      status: { $in: ["pending", "incomplete"] },
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
      .sort({ dateRecensement: -1, createdAt: -1 });

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

    if (prestataire.status !== 'pending' && prestataire.status !== 'incomplete') {
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

    if (prestataire.status !== 'pending' && prestataire.status !== 'incomplete') {
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

/** Self-service : suspendre son activité prestataire */
export const deactivatePrestataire = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }
    const prestataire = await prestataireModel.findById(id);
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire non trouvé' });
    }
    const ownerId = prestataire.utilisateur?.toString?.() || String(prestataire.utilisateur);
    const requesterId = req.utilisateur?._id?.toString?.();
    if (!isAdmin(req) && ownerId !== requesterId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    prestataire.status = 'suspended';
    prestataire.disponible = false;
    await prestataire.save();
    res.status(200).json({
      message: 'Espace Métiers désactivé',
      prestataire,
    });
  } catch (err) {
    console.error('Erreur deactivatePrestataire:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/** Self-service : réactiver (repasse en pending si pas encore active) */
export const reactivatePrestataire = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }
    const prestataire = await prestataireModel.findById(id);
    if (!prestataire) {
      return res.status(404).json({ error: 'Prestataire non trouvé' });
    }
    const ownerId = prestataire.utilisateur?.toString?.() || String(prestataire.utilisateur);
    const requesterId = req.utilisateur?._id?.toString?.();
    if (!isAdmin(req) && ownerId !== requesterId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    if (prestataire.status === 'rejected') {
      return res.status(400).json({
        error: 'Profil rejeté — contactez le support pour une nouvelle validation',
      });
    }
    prestataire.status = prestataire.verifier ? 'active' : 'pending';
    prestataire.disponible = true;
    await prestataire.save();
    res.status(200).json({
      message: 'Espace Métiers réactivé',
      prestataire,
    });
  } catch (err) {
    console.error('Erreur reactivatePrestataire:', err.message);
    res.status(500).json({ error: err.message });
  }
};
