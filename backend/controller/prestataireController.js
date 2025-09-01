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
    } = req.body;

    const uploads = {};

    for (const field of ["cni1", "cni2", "selfie"]) {
      if (req.files?.[field]?.[0]) {
        const result = await cloudinary.v2.uploader.upload(req.files[field][0].path, {
          folder: "prestataires",
        });
        uploads[field] = result.secure_url;
        fs.unlinkSync(req.files[field][0].path);
      }
    }

    const newPrestataire = new prestataireModel({
      utilisateur,
      service,
      prixprestataire,
      localisation,
      note,
      verifier: verifier === "true" || verifier === true,
      ...uploads,
    });

    await newPrestataire.save();
    res.status(201).json(newPrestataire);
  } catch (err) {
    console.error("Erreur création prestataire:", err.message);
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

// ✅ Mettre à jour un prestataire
export const updatePrestataire = async (req, res) => {
  try {
    const {
      utilisateur,
      service,
      prixprestataire,
      localisation,
      note,
      verifier
    } = req.body;

    const updates = {
      ...(utilisateur && { utilisateur: mongoose.Types.ObjectId(utilisateur) }),
      ...(service && { service: mongoose.Types.ObjectId(service) }),
      ...(prixprestataire && { prixprestataire }),
      ...(localisation && { localisation }),
      ...(note && { note }),
      ...(typeof verifier !== "undefined" && { verifier: verifier === "true" || verifier === true }),
    };

    for (const field of ["cni1", "cni2", "selfie"]) {
      if (req.files?.[field]?.[0]) {
        const result = await cloudinary.v2.uploader.upload(req.files[field][0].path, {
          folder: "prestataires",
        });
        updates[field] = result.secure_url;
        fs.unlinkSync(req.files[field][0].path);
      }
    }

    const prestataire = await prestataireModel.findByIdAndUpdate(req.params.id, updates, {
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

    if (!prestataire) return res.status(404).json({ error: "Prestataire non trouvé" });

    res.status(200).json(prestataire);
  } catch (err) {
    console.error("Erreur mise à jour prestataire:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Supprimer
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
