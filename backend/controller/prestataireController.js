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

    // 🔹 Parsing sécurisé de localisationmaps
    let parsedLocalisation = { latitude: 0, longitude: 0 };
    if (localisationmaps) {
      if (typeof localisationmaps === "string") {
        try {
          const parsed = JSON.parse(localisationmaps);
          if (parsed?.latitude !== undefined && parsed?.longitude !== undefined) {
            parsedLocalisation = parsed;
          }
        } catch (err) {
          console.warn("Impossible de parser localisationmaps, valeurs par défaut utilisées", err);
        }
      } else if (typeof localisationmaps === "object" && localisationmaps.latitude !== undefined && localisationmaps.longitude !== undefined) {
        parsedLocalisation = localisationmaps;
      }
    }

    // 🔹 Upload fichiers simples
    const uploads = {};
    for (const field of ["cni1", "cni2", "selfie", "attestationAssurance"]) {
      if (req.files?.[field]?.[0]) {
        const result = await cloudinary.v2.uploader.upload(req.files[field][0].path, { folder: "prestataires" });
        uploads[field] = result.secure_url;
        fs.unlinkSync(req.files[field][0].path);
      }
    }

    // 🔹 Diplômes / certificats
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

    // 🔹 Création prestataire
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
      localisationmaps: parsedLocalisation,  // ✅ Toujours un objet valide
      tarifHoraireMin,
      tarifHoraireMax,
      numeroCNI,
      numeroRCCM,
      numeroAssurance,
      nbMission,
      revenus,
      clients : Array.isArray(clients) ? req.body.clients : [],
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

    // 🔹 Parsing sécurisé de localisationmaps
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
      ...(parsedLocalisation && { localisationmaps: parsedLocalisation }),
      ...(tarifHoraireMin && { tarifHoraireMin }),
      ...(tarifHoraireMax && { tarifHoraireMax }),
      ...(numeroCNI && { numeroCNI }),
      ...(numeroRCCM && { numeroRCCM }),
      ...(numeroAssurance && { numeroAssurance }),
      ...(nbMission && { nbMission }),
      ...(revenus && { revenus }),
      ...(clients && { clients: clients.map(id => mongoose.Types.ObjectId(id)) }),
    };

    // 🔹 Upload fichiers simples
    for (const field of ["cni1", "cni2", "selfie", "attestationAssurance"]) {
      if (req.files?.[field]?.[0]) {
        const result = await cloudinary.v2.uploader.upload(req.files[field][0].path, { folder: "prestataires" });
        updates[field] = result.secure_url;
        fs.unlinkSync(req.files[field][0].path);
      }
    }

    // 🔹 Diplômes avec métadonnées
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

    // 🔹 Update dans MongoDB
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



// ✅ Lire tous les prestataires
export const getAllPrestataires = async (req, res) => {
  try {
    const prestataires = await prestataireModel.find()
      .populate("utilisateur")
      .populate({
        path: "service",
        populate: {
          path: "categorie",
          populate: { path: "groupe" }
        }
      });

    res.status(200).json(prestataires);
  } catch (err) {
    console.error("Erreur récupération prestataires:", err.message);
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