import {
  assertPrestataireRouteId,
  applyOwnerDeactivate,
  applyOwnerReactivate,
  canOwnerDeactivate,
  canOwnerReactivate,
  PrestatairePauseTransitionError,
} from '../services/prestataireOwnerPauseService.js';
import {
  presentPrestatairePendingListItem,
} from '../utils/prestatairePendingPresenter.js';
import prestataireModel from "../models/prestataireModel.js";
import FieldRecensement from '../models/fieldRecensementModel.js';
import mongoose from "mongoose";
import { isAdmin } from "../middleware/entityAccess.js";
import {
  buildPrestataireListFilter,
  prestataireListPagination,
} from '../utils/prestataireListQuery.js';
import { pickFields } from '../utils/pickFields.js';
import { buildRecensementCreateFields, isRecensementRequest, assertRecensementAgent } from '../utils/recensementPolicy.js';
import {
  validatePrestataireCreateBody,
  mongooseValidationTo400,
} from '../utils/prestataireValidation.js';
import {
  uploadKycToCloudinary,
  prepareKycReplacement,
  stripInjectedKycFromBody,
  presentProDocForViewer,
  redactKycFromPlain,
  KYC_FIELD_NAMES,
  CLD_AUTH_PREFIX,
} from '../utils/kycAccess.js';
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

/**
 * STAB-13B1 — Contrat unique CREATE/UPDATE pour listes multipart.
 * Accepte : tableau, JSON string '["a","b"]', ou string simple.
 */
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

async function destroyKycRef(ref) {
  if (typeof ref !== 'string' || !ref.startsWith(CLD_AUTH_PREFIX)) return;
  const publicId = ref.slice(CLD_AUTH_PREFIX.length);
  try {
    await cloudinary.uploader.destroy(publicId, { type: 'authenticated', invalidate: true });
  } catch {
    /* best-effort */
  }
}

async function destroyUploadedKycMap(uploads) {
  for (const ref of Object.values(uploads || {})) {
    await destroyKycRef(ref);
  }
}

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

    /** multipart/form-data : specialite, zoneIntervention, clients → parseStringArrayField (module). */
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

    const isAdminUser = isAdmin(req);
    const isTerrain = isRecensementRequest(req);

    const preValidate = validatePrestataireCreateBody({
      body: req.body,
      isAdminUser,
      requesterId: req.utilisateur._id.toString(),
      finalServiceId: finalService,
    });
    if (!preValidate.ok) {
      return res.status(400).json({ error: preValidate.errors.join(' ; ') });
    }

    if (isAdminUser && preValidate.ownerId) {
      const Utilisateur = (await import('../models/utilisateurModel.js')).default;
      const userExists = await Utilisateur.exists({ _id: preValidate.ownerId });
      if (!userExists) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
    }

    const serviceExists = await (await import('../models/serviceModel.js')).default.exists({
      _id: finalService,
    });
    if (!serviceExists) {
      return res.status(404).json({ error: 'Service introuvable' });
    }

    // Parsing localisationmaps
    let parsedLocalisation = preValidate.parsedLocalisation;
    if (!parsedLocalisation && localisationmaps) {
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
      await destroyUploadedKycMap(uploads);
      return res.status(denied.status).json({ error: denied.error });
    }

    // Création prestataire — status/verifier/recenseur contrôlés côté serveur (STAB-11)
    const ownerId =
      isAdminUser && utilisateur
        ? utilisateur
        : isTerrain && utilisateur
          ? utilisateur
          : req.utilisateur._id.toString();

    const recensement = buildRecensementCreateFields(req, {
      defaultStatus: 'incomplete',
    });

    const newPrestataire = new prestataireModel({
      utilisateur: new mongoose.Types.ObjectId(ownerId),
      service: new mongoose.Types.ObjectId(finalService),
      prixprestataire: preValidate.prixprestataire,
      localisation: preValidate.localisation,
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
    try {
      await newPrestataire.save();
    } catch (saveErr) {
      await destroyUploadedKycMap(uploads);
      const mapped = mongooseValidationTo400(saveErr);
      if (mapped) return res.status(mapped.status).json({ error: mapped.error });
      throw saveErr;
    }

    const populatedPrestataire = await prestataireModel
      .findById(newPrestataire._id)
      .populate("utilisateur")
      .populate("service")
      .populate("clients");

    res.status(201).json(populatedPrestataire);
  } catch (err) {
    const mapped = mongooseValidationTo400(err);
    if (mapped) {
      return res.status(mapped.status).json({ error: mapped.error });
    }
    console.error("Erreur création prestataire:", err.message);
    res.status(500).json({ error: 'Erreur interne' });
  }
};

// ✅ Mettre à jour un prestataire
export const updatePrestataire = async (req, res) => {
  try {
    const isAdminUser = isAdmin(req);
    const allowedFields = isAdminUser
      ? [...PRESTATAIRE_OWNER_FIELDS, ...PRESTATAIRE_ADMIN_FIELDS]
      : PRESTATAIRE_OWNER_FIELDS;
    const body = pickFields(stripInjectedKycFromBody(req.body), allowedFields);

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

    // STAB-13B1 : même contrat CREATE/UPDATE (évite ["[\"Bâtiment…\"]"]).
    const specialiteArr =
      specialite != null && specialite !== ""
        ? parseStringArrayField(specialite)
        : null;
    const zoneInterventionArr =
      zoneIntervention != null && zoneIntervention !== ""
        ? parseStringArrayField(zoneIntervention)
        : null;

    const updates = {
      ...(isAdminUser && utilisateur && { utilisateur: new mongoose.Types.ObjectId(utilisateur) }),
      ...(service && { service: new mongoose.Types.ObjectId(service) }),
      ...(typeof parseNumber(prixprestataire) !== "undefined" && { prixprestataire: parseNumber(prixprestataire) }),
      ...(localisation && { localisation }),
      ...(isAdminUser && typeof parseNumber(note) !== "undefined" && { note: parseNumber(note) }),
      ...(specialiteArr && specialiteArr.length > 0 && { specialite: specialiteArr }),
      ...(anneeExperience && { anneeExperience }),
      ...(description && { description }),
      ...(typeof parseNumber(rayonIntervention) !== "undefined" && { rayonIntervention: parseNumber(rayonIntervention) }),
      ...(zoneInterventionArr &&
        zoneInterventionArr.length > 0 && { zoneIntervention: zoneInterventionArr }),
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

    // Upload fichiers KYC (même politique CREATE : authenticated → cld:auth:)
    // Remplacement : upload d’abord ; suppression ancienne ref différée (pas avant succès Mongo).
    for (const field of ["cni1", "cni2", "selfie", "attestationAssurance"]) {
      if (req.files?.[field]?.[0]) {
        const { ref } = await prepareKycReplacement(
          req.files[field][0].path,
          `prestataires/${field}`,
          null,
        );
        updates[field] = ref;
        try {
          fs.unlinkSync(req.files[field][0].path);
        } catch {
          /* temp local */
        }
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
    const mapped = mongooseValidationTo400(err);
    if (mapped) {
      return res.status(mapped.status).json({ error: mapped.error });
    }
    console.error("Erreur mise à jour prestataire:", err.message);
    res.status(500).json({ error: 'Erreur interne' });
  }
};

// ✅ Lire tous les prestataires (avec filtres optionnels)
// ── Helper photo publique partagé ──────────────────────────────────────────
// Injecte utilisateur.photoProfil depuis FieldRecensement quand manquant.
// Aucune écriture en base. Préserve les protections KYC existantes.
// Fonctionne sur un tableau de plain objects (modifie en place).
async function applyRecensementPhotoFallback(plains) {
  const needing = plains.filter(
    (p) =>
      p.source === 'field_recensement_v1' &&
      !p.utilisateur?.photoProfil &&
      p.sourceFieldRecensementId,
  );
  if (!needing.length) return;

  const ids = needing.map((p) => p.sourceFieldRecensementId);
  const recensements = await FieldRecensement.find({ _id: { $in: ids } })
    .select('+media.profilePhoto.promotedPublicUrl +media.profilePhoto.publicRevocationStatus')
    .lean();

  const photoMap = Object.fromEntries(
    recensements
      .filter(
        (r) =>
          r.media?.profilePhoto?.promotedPublicUrl &&
          r.media?.profilePhoto?.publicRevocationStatus !== 'revoked',
      )
      .map((r) => [String(r._id), r.media.profilePhoto.promotedPublicUrl]),
  );

  for (const p of plains) {
    if (
      p.source === 'field_recensement_v1' &&
      !p.utilisateur?.photoProfil &&
      p.sourceFieldRecensementId
    ) {
      const url = photoMap[String(p.sourceFieldRecensementId)];
      if (url) {
        p.utilisateur = { ...(p.utilisateur || {}), photoProfil: url };
      }
    }
  }
}

export const getAllPrestataires = async (req, res) => {
  try {
    const built = await buildPrestataireListFilter(req);
    if (built.error) {
      return res.status(built.status || 400).json({ error: built.error });
    }
    const { page, limit, skip } = prestataireListPagination(req.query);
    if (built.empty) {
      res.setHeader('X-Total-Count', '0');
      return res.status(200).json([]);
    }

    const filter = built.filter;
    const ville = req.query?.ville;
    if (ville) {
      filter.localisation = { $regex: String(ville), $options: 'i' };
    }

    const [total, prestataires] = await Promise.all([
      prestataireModel.countDocuments(filter),
      prestataireModel.find(filter)
        .sort({ _id: 1 })
        .skip(skip)
        .limit(limit)
        .populate('utilisateur', 'nom prenom photoProfil email telephone')
        .populate({
          path: 'service',
          populate: {
            path: 'categorie',
            populate: { path: 'groupe' },
          },
        }),
    ]);

    const safe = prestataires.map((p) => {
      const plain = typeof p.toObject === 'function' ? p.toObject() : { ...p };
      const redacted = redactKycFromPlain(plain);
      for (const f of KYC_FIELD_NAMES) {
        redacted[f] = Boolean(plain[f]);
      }
      return redacted;
    });

    // Fallback photo recensement via helper partagé
    await applyRecensementPhotoFallback(safe);

    res.setHeader('X-Total-Count', String(total));
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

    // Applique le même fallback photo que la liste — résoud photoProfil
    // pour les profils recensement dont la propagation Mongo a échoué.
    const result = presentProDocForViewer(req, prestataire, res);
    await applyRecensementPhotoFallback([result]);
    res.status(200).json(result);
  } catch (err) {
    console.error("Erreur lecture prestataire:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Helper URL photo publique ──────────────────────────────────────────────
// Protocole http/https et hostname présent. Aucun téléchargement.
function isValidPublicPhotoUrl(value) {
  if (typeof value !== 'string' || !value) return false;
  try {
    const u = new URL(value);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname;
  } catch {
    return false;
  }
}

// ✅ Aperçu accueil — uniquement les profils avec photo publique résolue,
// filtrage AVANT la limite de 5. Endpoint dédié pour ne pas altérer
// le catalogue global GET /prestataire.
//
// Parcourt le catalogue par lots de 20 (pagination curseur via _id)
// jusqu'à collecter 5 profils éligibles ou atteindre la fin des résultats.
export const getHomePreview = async (req, res) => {
  try {
    const built = await buildPrestataireListFilter(req);
    if (built.error) {
      return res.status(built.status || 400).json({ error: built.error });
    }
    if (built.empty) {
      return res.status(200).json([]);
    }
    const filter = built.filter;

    const TARGET = 5;
    const BATCH_SIZE = 20;
    // Garde-fou : protège contre une collection très grande ou très peu
    // de profils éligibles. Si déclenché → résultat potentiellement partiel.
    const MAX_BATCHES = 25;

    const collected = [];
    let lastId = null;
    let partial = false;

    for (let i = 0; i < MAX_BATCHES; i++) {
      // Pagination curseur : évite le coût O(n) du skip.
      // _id: 1 donne un ordre stable et cohérent entre lots.
      const batchFilter = lastId
        ? { ...filter, _id: { $gt: lastId } }
        : filter;

      const batch = await prestataireModel
        .find(batchFilter)
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .populate('utilisateur', 'nom prenom photoProfil email telephone')
        .populate({
          path: 'service',
          populate: { path: 'categorie', populate: { path: 'groupe' } },
        });

      if (!batch.length) break; // fin réelle du catalogue

      // KYC redact sur ce lot
      const safeBatch = batch.map((p) => {
        const plain = typeof p.toObject === 'function' ? p.toObject() : { ...p };
        const redacted = redactKycFromPlain(plain);
        for (const f of KYC_FIELD_NAMES) {
          redacted[f] = Boolean(plain[f]);
        }
        return redacted;
      });

      // Fallback photo recensement sur ce lot (même logique que la liste)
      await applyRecensementPhotoFallback(safeBatch);

      // Validation par parseur : protocole http/https + hostname présent.
      // Aucun téléchargement de l'image.
      for (const p of safeBatch) {
        if (isValidPublicPhotoUrl(p.utilisateur?.photoProfil)) {
          collected.push(p);
          if (collected.length >= TARGET) break;
        }
      }

      // Mise à jour du curseur pour le prochain lot
      lastId = batch[batch.length - 1]._id;
      if (batch.length < BATCH_SIZE) break; // dernier lot — catalogue épuisé
      if (collected.length >= TARGET) break;

      // Dernière itération permise atteinte → signal résultat partiel
      if (i === MAX_BATCHES - 1) {
        partial = true;
      }
    }

    // X-Preview-Partial : 1 quand le garde-fou MAX_BATCHES a interrompu
    // la traversée avant d'atteindre la fin du catalogue.
    // Le client peut utiliser ce header pour afficher un accès global alternatif.
    res.setHeader('X-Preview-Partial', partial ? '1' : '0');
    return res.status(200).json(collected);
  } catch (err) {
    console.error('Erreur home preview prestataires:', err.message);
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

    const safe = prestataires.map((p) => presentPrestatairePendingListItem(p));

    res.status(200).json(safe);
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
    assertPrestataireRouteId(id);
    const prestataire = await prestataireModel.findById(id);
    const decision = canOwnerDeactivate(prestataire);
    if (decision.idempotent) {
      return res.status(200).json({
        success: true,
        idempotent: true,
        message: 'Espace Métiers déjà désactivé',
        prestataire,
      });
    }
    applyOwnerDeactivate(prestataire);
    await prestataire.save();
    res.status(200).json({
      success: true,
      message: 'Espace Métiers désactivé',
      prestataire,
    });
  } catch (err) {
    if (err instanceof PrestatairePauseTransitionError) {
      return res.status(err.status).json({
        success: false,
        code: err.code,
        message: err.message,
      });
    }
    console.error('Erreur deactivatePrestataire:', err.message);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Erreur serveur.' });
  }
};

/** Self-service : réactiver après pause volontaire */
export const reactivatePrestataire = async (req, res) => {
  try {
    const { id } = req.params;
    assertPrestataireRouteId(id);
    const prestataire = await prestataireModel.findById(id);
    const decision = canOwnerReactivate(prestataire);
    if (decision.idempotent) {
      return res.status(200).json({
        success: true,
        idempotent: true,
        message: 'Espace Métiers déjà actif',
        prestataire,
      });
    }
    applyOwnerReactivate(prestataire);
    await prestataire.save();
    res.status(200).json({
      success: true,
      message: 'Espace Métiers réactivé',
      prestataire,
    });
  } catch (err) {
    if (err instanceof PrestatairePauseTransitionError) {
      return res.status(err.status).json({
        success: false,
        code: err.code,
        message: err.message,
      });
    }
    console.error('Erreur reactivatePrestataire:', err.message);
    res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Erreur serveur.' });
  }
};
