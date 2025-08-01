import mongoose from "mongoose";
import fs from "fs";
import cloudinary from "cloudinary";
import freelanceModel from "../models/freelanceModel.js";

// Config Cloudinary
cloudinary.v2.config({
  cloud_name: "dm0c8st6k",
  api_key: "541481188898557",
  api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
});

// ✅ Créer un freelance
export const createFreelance = async (req, res) => {
  try {
    const {
      utilisateur,
      service,
      prixfreelance,
      localisation,
      note,
      verifier,
      titreprofessionnel,
      categorieprincipale,
      niveauxexperience,
      competences,
      statut,
      horaire,
    } = req.body;

    const uploads = {};
    for (const field of ["cni1", "cni2", "selfie"]) {
      if (req.files?.[field]?.[0]) {
        const result = await cloudinary.v2.uploader.upload(req.files[field][0].path, {
          folder: "freelances",
        });
        uploads[field] = result.secure_url;
        fs.unlinkSync(req.files[field][0].path);
      }
    }

    const newFreelance = new freelanceModel({
      utilisateur,
      service,
      prixfreelance,
      localisation,
      note,
      verifier: verifier === "true" || verifier === true,
      titreprofessionnel,
      categorieprincipale,
      niveauxexperience,
      competences: competences ? JSON.parse(competences) : undefined,
      statut,
      horaire,
      ...uploads,
    });

    await newFreelance.save();
    res.status(201).json(newFreelance);
  } catch (err) {
    console.error("Erreur création freelance:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Lire tous les freelances
export const getAllFreelances = async (req, res) => {
  try {
    const freelances = await freelanceModel.find()
      .populate("utilisateur")
      .populate({
        path: "service",
        populate: {
          path: "categorie",
          populate: { path: "groupe" }
        }
      });

    res.status(200).json(freelances);
  } catch (err) {
    console.error("Erreur récupération freelances:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Lire freelance par ID
export const getFreelanceById = async (req, res) => {
  try {
    const freelance = await freelanceModel.findById(req.params.id)
      .populate("utilisateur")
      .populate({
        path: "service",
        populate: {
          path: "categorie",
          populate: { path: "groupe" }
        }
      });

    if (!freelance) return res.status(404).json({ error: "Freelance non trouvé" });

    res.status(200).json(freelance);
  } catch (err) {
    console.error("Erreur lecture freelance:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Mettre à jour un freelance
export const updateFreelance = async (req, res) => {
  try {
    const {
      utilisateur,
      service,
      prixfreelance,
      localisation,
      note,
      verifier,
      titreprofessionnel,
      categorieprincipale,
      niveauxexperience,
      competences,
      statut,
      horaire
    } = req.body;

    const updates = {
      ...(utilisateur && { utilisateur: mongoose.Types.ObjectId(utilisateur) }),
      ...(service && { service: mongoose.Types.ObjectId(service) }),
      ...(prixfreelance && { prixfreelance }),
      ...(localisation && { localisation }),
      ...(note && { note }),
      ...(typeof verifier !== "undefined" && { verifier: verifier === "true" || verifier === true }),
      ...(titreprofessionnel && { titreprofessionnel }),
      ...(categorieprincipale && { categorieprincipale }),
      ...(niveauxexperience && { niveauxexperience }),
      ...(competences && { competences: JSON.parse(competences) }),
      ...(statut && { statut }),
      ...(horaire && { horaire }),
    };

    for (const field of ["cni1", "cni2", "selfie"]) {
      if (req.files?.[field]?.[0]) {
        const result = await cloudinary.v2.uploader.upload(req.files[field][0].path, {
          folder: "freelances",
        });
        updates[field] = result.secure_url;
        fs.unlinkSync(req.files[field][0].path);
      }
    }

    const freelance = await freelanceModel.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    })
      .populate("utilisateur")
      .populate({
        path: "service",
        populate: {
          path: "categorie",
          populate: { path: "groupe" }
        }
      });

    if (!freelance) return res.status(404).json({ error: "Freelance non trouvé" });

    res.status(200).json(freelance);
  } catch (err) {
    console.error("Erreur mise à jour freelance:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Supprimer un freelance
export const deleteFreelance = async (req, res) => {
  try {
    const freelance = await freelanceModel.findByIdAndDelete(req.params.id);
    if (!freelance) return res.status(404).json({ error: "Freelance non trouvé" });

    res.status(200).json({ message: "Freelance supprimé avec succès" });
  } catch (err) {
    console.error("Erreur suppression freelance:", err.message);
    res.status(500).json({ error: err.message });
  }
};
