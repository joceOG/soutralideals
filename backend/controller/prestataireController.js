import prestataireModel from "../models/prestataireModel.js";
import mongoose from "mongoose";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { getServiceIdsUnderServicesGenerauxCategories } from "../utils/catalogFilters.js";
<<<<<<< HEAD
import { isAdmin } from "../middleware/entityAccess.js";
<<<<<<< HEAD
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
import { getServiceIdsUnderServicesGenerauxCategories } from "../utils/catalogFilters.js";
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
<<<<<<< HEAD
<<<<<<< HEAD
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
=======
=======
import { getServiceIdsUnderServicesGenerauxCategories } from "../utils/catalogFilters.js";
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
<<<<<<< HEAD
  cloud_name: "dm0c8st6k",
  api_key: "541481188898557",
  api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
  cloud_name: "dm0c8st6k",
  api_key: "541481188898557",
  api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    // ✅ GESTION INSCRIPTION SIMPLIFIÉE
    let finalService = service;
    const serviceMissing =
      !service ||
      service === "" ||
      (typeof service === "string" && !mongoose.Types.ObjectId.isValid(service));
    if (serviceMissing && category) {
=======
    // ✅ GESTION INSCRIPTION SIMPLIFIÉE
    let finalService = service;
    if (!service && category) {
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
    // ✅ GESTION INSCRIPTION SIMPLIFIÉE
    let finalService = service;
    if (!service && category) {
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    // ✅ GESTION INSCRIPTION SIMPLIFIÉE
    let finalService = service;
=======
    // ✅ GESTION INSCRIPTION SIMPLIFIÉE
    let finalService = service;
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
    // ✅ GESTION INSCRIPTION SIMPLIFIÉE
    let finalService = service;
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
    const serviceMissing =
      !service ||
      service === "" ||
      (typeof service === "string" && !mongoose.Types.ObjectId.isValid(service));
    if (serviceMissing && category) {
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
    // ✅ GESTION INSCRIPTION SIMPLIFIÉE
    let finalService = service;
    if (!service && category) {
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
    // ✅ GESTION INSCRIPTION SIMPLIFIÉE
    let finalService = service;
    if (!service && category) {
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    } else if (serviceMissing) {
      return res.status(400).json({ error: "service ou category requis" });
=======
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    } else if (serviceMissing) {
      return res.status(400).json({ error: "service ou category requis" });
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
    } else if (serviceMissing) {
      return res.status(400).json({ error: "service ou category requis" });
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
    } else if (serviceMissing) {
      return res.status(400).json({ error: "service ou category requis" });
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    // Création prestataire — status/verifier contrôlés côté serveur
    const isAdminUser = isAdmin(req);
=======
    // Création prestataire
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
    // Création prestataire — status/verifier contrôlés côté serveur
    const isAdminUser = isAdmin(req);
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    const newPrestataire = new prestataireModel({
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      utilisateur: new mongoose.Types.ObjectId(utilisateur),
      service: new mongoose.Types.ObjectId(finalService),
      prixprestataire: parseNumber(prixprestataire, 0),
=======
      utilisateur: mongoose.Types.ObjectId(utilisateur),
      service: mongoose.Types.ObjectId(finalService), // ✅ Utiliser le service trouvé
      prixprestataire,
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
      utilisateur: mongoose.Types.ObjectId(utilisateur),
      service: mongoose.Types.ObjectId(finalService), // ✅ Utiliser le service trouvé
      prixprestataire,
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
      utilisateur: new mongoose.Types.ObjectId(utilisateur),
      service: new mongoose.Types.ObjectId(finalService),
      prixprestataire: parseNumber(prixprestataire, 0),
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
      nbMission: parseNumber(nbMission, 0),
      nbAvis: parseNumber(req.body.nbAvis, 0),
      revenus: parseNumber(revenus, 0),
      clients: clientsIds,
<<<<<<< HEAD
=======
    // Création prestataire
=======
    // Création prestataire — status/verifier contrôlés côté serveur
    const isAdminUser = isAdmin(req);
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    const newPrestataire = new prestataireModel({
      utilisateur: new mongoose.Types.ObjectId(utilisateur),
      service: new mongoose.Types.ObjectId(finalService),
      prixprestataire: parseNumber(prixprestataire, 0),
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
<<<<<<< HEAD
      nbMission,
      revenus,
      clients: Array.isArray(clients) ? clients.map(id => mongoose.Types.ObjectId(id)) : [],
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
      nbMission: parseNumber(nbMission, 0),
      nbAvis: parseNumber(req.body.nbAvis, 0),
      revenus: parseNumber(revenus, 0),
      clients: clientsIds,
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
      nbMission,
      revenus,
      clients: Array.isArray(clients) ? clients.map(id => mongoose.Types.ObjectId(id)) : [],
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
      diplomeCertificat,
      ...uploads,
    });

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    // Traçabilité (source autorisée ; status ignoré du client)
=======
    // 🆕 OPTION C - Traçabilité (ajout conditionnel pour éviter erreurs)
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
    // Traçabilité (source autorisée ; status ignoré du client)
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    if (req.body.source) {
      newPrestataire.source = Array.isArray(req.body.source)
        ? req.body.source[0]
        : req.body.source;
    }
    if (req.body.recenseur && mongoose.Types.ObjectId.isValid(req.body.recenseur)) {
<<<<<<< HEAD
<<<<<<< HEAD
      newPrestataire.recenseur = new mongoose.Types.ObjectId(req.body.recenseur);
=======
    // 🆕 OPTION C - Traçabilité (ajout conditionnel pour éviter erreurs)
=======
    // Traçabilité (source autorisée ; status ignoré du client)
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    if (req.body.source) {
      newPrestataire.source = Array.isArray(req.body.source)
        ? req.body.source[0]
        : req.body.source;
    }
    if (req.body.recenseur && mongoose.Types.ObjectId.isValid(req.body.recenseur)) {
<<<<<<< HEAD
      newPrestataire.recenseur = mongoose.Types.ObjectId(req.body.recenseur);
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
      newPrestataire.recenseur = new mongoose.Types.ObjectId(req.body.recenseur);
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
      newPrestataire.recenseur = mongoose.Types.ObjectId(req.body.recenseur);
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
      newPrestataire.recenseur = new mongoose.Types.ObjectId(req.body.recenseur);
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
    }
    if (req.body.dateRecensement) {
      newPrestataire.dateRecensement = new Date(req.body.dateRecensement);
    }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    newPrestataire.syncFinalizationFromDocuments();
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    newPrestataire.syncFinalizationFromDocuments();
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
    newPrestataire.syncFinalizationFromDocuments();
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
    const parseNumber = (value) => {
      if (value === null || typeof value === "undefined" || value === "") {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      ...(utilisateur && { utilisateur: new mongoose.Types.ObjectId(utilisateur) }),
      ...(service && { service: new mongoose.Types.ObjectId(service) }),
      ...(typeof parseNumber(prixprestataire) !== "undefined" && { prixprestataire: parseNumber(prixprestataire) }),
      ...(localisation && { localisation }),
      ...(typeof parseNumber(note) !== "undefined" && { note: parseNumber(note) }),
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
      ...(utilisateur && { utilisateur: mongoose.Types.ObjectId(utilisateur) }),
      ...(service && { service: mongoose.Types.ObjectId(service) }),
      ...(prixprestataire && { prixprestataire }),
=======
      ...(utilisateur && { utilisateur: new mongoose.Types.ObjectId(utilisateur) }),
      ...(service && { service: new mongoose.Types.ObjectId(service) }),
      ...(typeof parseNumber(prixprestataire) !== "undefined" && { prixprestataire: parseNumber(prixprestataire) }),
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
      ...(localisation && { localisation }),
      ...(typeof parseNumber(note) !== "undefined" && { note: parseNumber(note) }),
      ...(typeof verifier !== "undefined" && { verifier: verifier === "true" || verifier === true }),
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
      ...(typeof verifier !== "undefined" && { verifier: verifier === "true" || verifier === true }),
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
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

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    const isAdminUser = isAdmin(req);
    if (isAdminUser && typeof verifier !== "undefined") {
      updates.verifier = verifier === "true" || verifier === true;
    }
    if (isAdminUser && req.body.status) {
      updates.status = req.body.status;
    }

<<<<<<< HEAD
=======
      ...(utilisateur && { utilisateur: mongoose.Types.ObjectId(utilisateur) }),
      ...(service && { service: mongoose.Types.ObjectId(service) }),
      ...(prixprestataire && { prixprestataire }),
=======
      ...(utilisateur && { utilisateur: new mongoose.Types.ObjectId(utilisateur) }),
      ...(service && { service: new mongoose.Types.ObjectId(service) }),
      ...(typeof parseNumber(prixprestataire) !== "undefined" && { prixprestataire: parseNumber(prixprestataire) }),
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
      ...(localisation && { localisation }),
      ...(typeof parseNumber(note) !== "undefined" && { note: parseNumber(note) }),
      ...(typeof verifier !== "undefined" && { verifier: verifier === "true" || verifier === true }),
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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

<<<<<<< HEAD
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    const isAdminUser = isAdmin(req);
    if (isAdminUser && typeof verifier !== "undefined") {
      updates.verifier = verifier === "true" || verifier === true;
    }
    if (isAdminUser && req.body.status) {
      updates.status = req.body.status;
    }

>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

    if (!isAdminUser) {
      prestataire.syncFinalizationFromDocuments();
      await prestataire.save();
    }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    res.status(200).json(prestataire);

  } catch (err) {
    console.error("Erreur mise à jour prestataire:", err.message);
    res.status(500).json({ error: err.message });
  }
};

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
// ✅ Lire tous les prestataires (avec filtres optionnels)
export const getAllPrestataires = async (req, res) => {
  try {
<<<<<<< HEAD
    const { service, categorie, ville, status, utilisateur, verifier, limit = 50, page = 1 } = req.query;
<<<<<<< HEAD

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
=======
// ✅ Lire tous les prestataires
export const getAllPrestataires = async (req, res) => {
  try {
    const prestataires = await prestataireModel.find()
      .populate("utilisateur")
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
      .populate({
        path: "service",
        populate: {
          path: "categorie",
          populate: { path: "groupe" }
        }
      });
=======
// ✅ Lire tous les prestataires (avec filtres optionnels)
export const getAllPrestataires = async (req, res) => {
  try {
<<<<<<< HEAD
    const { service, categorie, ville, status, utilisateur, limit = 50, page = 1 } = req.query;
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
    const { service, categorie, ville, status, utilisateur, verifier, limit = 50, page = 1 } = req.query;
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
    const { service, categorie, ville, status, utilisateur, limit = 50, page = 1 } = req.query;
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)

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
<<<<<<< HEAD
<<<<<<< HEAD
    console.error('Erreur récupération prestataires:', err.message);
=======
// ✅ Lire tous les prestataires
=======
// ✅ Lire tous les prestataires (avec filtres optionnels)
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
export const getAllPrestataires = async (req, res) => {
  try {
    const { service, categorie, ville, status, utilisateur, limit = 50, page = 1 } = req.query;
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

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
<<<<<<< HEAD
    console.error("Erreur récupération prestataires:", err.message);
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    console.error('Erreur récupération prestataires:', err.message);
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
    console.error("Erreur récupération prestataires:", err.message);
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
    console.error('Erreur récupération prestataires:', err.message);
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
// 🆕 OPTION C - Récupérer les prestataires en attente (toutes sources)
=======
// 🆕 OPTION C - Récupérer les prestataires en attente
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
export const getPendingPrestataires = async (req, res) => {
  try {
<<<<<<< HEAD
    const prestataires = await prestataireModel.find({ status: "pending" })
=======
=======
// 🆕 OPTION C - Récupérer les prestataires en attente
export const getPendingPrestataires = async (req, res) => {
  try {
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    const prestataires = await prestataireModel.find({ 
      status: { $in: ['pending', 'incomplete'] },
      source: { $in: ['sdealsidentification', 'sdealsmobile'] }
    })
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
// 🆕 OPTION C - Récupérer les prestataires en attente (toutes sources)
export const getPendingPrestataires = async (req, res) => {
  try {
<<<<<<< HEAD
    const prestataires = await prestataireModel.find({ status: "pending" })
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
    const prestataires = await prestataireModel.find({ 
      status: { $in: ['pending', 'incomplete'] },
      source: { $in: ['sdealsidentification', 'sdealsmobile'] }
    })
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
// 🆕 OPTION C - Récupérer les prestataires en attente (toutes sources)
export const getPendingPrestataires = async (req, res) => {
  try {
<<<<<<< HEAD
    const prestataires = await prestataireModel.find({ status: "pending" })
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
    const prestataires = await prestataireModel.find({ 
      status: { $in: ['pending', 'incomplete'] },
      source: { $in: ['sdealsidentification', 'sdealsmobile'] }
    })
>>>>>>> da08acd (Dashboard Complet and Merge)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    const adminId = req.user._id;
=======
    const adminId = req.body.adminId || req.user?._id;
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    const adminId = req.user._id;
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
    const adminId = req.body.adminId || req.user?._id;
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
    const adminId = req.user._id;
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    const adminId = req.user._id;
=======
    const adminId = req.body.adminId || req.user?._id;
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    const adminId = req.user._id;
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
    const adminId = req.body.adminId || req.user?._id;
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
    const adminId = req.user._id;
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

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
