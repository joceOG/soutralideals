import prestataireModel from "../models/prestataireModel.js";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import fs from "fs";

// Config Cloudinary
cloudinary.v2.config({
  cloud_name: "dm0c8st6k",
  api_key: "541481188898557",
  api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
});

// ✅ Créer prestataire
export const createPrestataire = async (req, res) => {
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

    const uploads = {};
    for (const field of ["cni1", "cni2", "selfie", "attestationAssurance"]) {
      if (req.files?.[field]?.[0]) {
        const result = await cloudinary.v2.uploader.upload(req.files[field][0].path, { folder: "prestataires" });
        uploads[field] = result.secure_url;
        fs.unlinkSync(req.files[field][0].path);
      }
    }

    // ✅ Diplômes avec métadonnées
    const diplomeCertificat = [];
    if (req.files?.diplomeCertificat) {
      for (const file of req.files.diplomeCertificat) {
        const result = await cloudinary.v2.uploader.upload(file.path, { folder: "prestataires/diplomes" });
        diplomeCertificat.push({
          filename: file.originalname,
          url: result.secure_url,
          type: file.mimetype.includes("pdf") ? "pdf" : "image",
          uploadedAt: new Date()
        });
        fs.unlinkSync(file.path);
      }
    }

    const newPrestataire = new prestataireModel({
      utilisateur,
      service,
      prixprestataire,
      localisation,
      note,
      verifier: verifier === "true" || verifier === true,
      specialite: specialite ? (Array.isArray(specialite) ? specialite : [specialite]) : [],
      anneeExperience,
      description,
      rayonIntervention,
      zoneIntervention: zoneIntervention ? (Array.isArray(zoneIntervention) ? zoneIntervention : [zoneIntervention]) : [],
      localisationmaps,
      tarifHoraireMin,
      tarifHoraireMax,
      numeroCNI,
      numeroRCCM,
      numeroAssurance,
      nbMission,
      revenus,
      clients: clients ? clients.map(id => mongoose.Types.ObjectId(id)) : [],
      diplomeCertificat,
      ...uploads,
    });

    await newPrestataire.save();
    res.status(201).json(newPrestataire);
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

    const updates = {
      ...(utilisateur && { utilisateur: mongoose.Types.ObjectId(utilisateur) }),
      ...(service && { service: mongoose.Types.ObjectId(service) }),
      ...(prixprestataire && { prixprestataire }),
      ...(localisation && { localisation }),
      ...(note && { note }),
      ...(typeof verifier !== "undefined" && { verifier: verifier === "true" || verifier === true }),
      ...(specialite && { specialite: Array.isArray(specialite) ? specialite : [specialite] }),
      ...(anneeExperience && { anneeExperience }),
      ...(description && { description }),
      ...(rayonIntervention && { rayonIntervention }),
      ...(zoneIntervention && { zoneIntervention: Array.isArray(zoneIntervention) ? zoneIntervention : [zoneIntervention] }),
      ...(localisationmaps && { localisationmaps }),
      ...(tarifHoraireMin && { tarifHoraireMin }),
      ...(tarifHoraireMax && { tarifHoraireMax }),
      ...(numeroCNI && { numeroCNI }),
      ...(numeroRCCM && { numeroRCCM }),
      ...(numeroAssurance && { numeroAssurance }),
      ...(nbMission && { nbMission }),
      ...(revenus && { revenus }),
      ...(clients && { clients: clients.map(id => mongoose.Types.ObjectId(id)) }),
    };

    // ✅ Upload fichiers
    for (const field of ["cni1", "cni2", "selfie", "attestationAssurance"]) {
      if (req.files?.[field]?.[0]) {
        const result = await cloudinary.v2.uploader.upload(req.files[field][0].path, { folder: "prestataires" });
        updates[field] = result.secure_url;
        fs.unlinkSync(req.files[field][0].path);
      }
    }

    // ✅ Diplômes avec métadonnées (remplace tout)
    if (req.files?.diplomeCertificat) {
      updates.diplomeCertificat = [];
      for (const file of req.files.diplomeCertificat) {
        const result = await cloudinary.v2.uploader.upload(file.path, { folder: "prestataires/diplomes" });
        updates.diplomeCertificat.push({
          filename: file.originalname,
          url: result.secure_url,
          type: file.mimetype.includes("pdf") ? "pdf" : "image",
          uploadedAt: new Date()
        });
        fs.unlinkSync(file.path);
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
