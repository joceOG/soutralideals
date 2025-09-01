import mongoose from 'mongoose';
import vendeurModel from "../models/vendeurModel.js";

// Créer un nouveau vendeur
export const createVendeur = async (req, res) => {
    try {
            const {
                utilisateur,
                localisation,
                zonedelivraison,
                note,
                verifier,
            } = req.body;

            const files = req.files;
            const cni1 = files?.cni1?.[0]?.path;
            const cni2 = files?.cni2?.[0]?.path;
            const selfie = files?.selfie?.[0]?.path;

        const newVendeur = new vendeurModel({
            utilisateur,
            localisation,
            zonedelivraison,
            note,
            cni1,
            cni2,
            selfie,
            verifier,
        });

        await newVendeur.save();
        res.status(201).json(newVendeur);
    } catch (err) {
        console.error("Erreur lors de la création du vendeur:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Obtenir tous les vendeurs
export const getAllVendeurs = async (req, res) => {
    try {
        const vendeurs = await vendeurModel.find().populate("utilisateur");
        res.status(200).json(vendeurs);
    } catch (err) {
        console.error("Erreur lors de la récupération des vendeurs:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Obtenir un vendeur par ID
export const getVendeurById = async (req, res) => {
    try {
        const vendeur = await vendeurModel.findById(req.params.id).populate("utilisateur");

        if (!vendeur) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        res.status(200).json(vendeur);
    } catch (err) {
        console.error("Erreur lors de la récupération du vendeur:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Mettre à jour un vendeur par ID
export const updateVendeur = async (req, res) => {
    try {
        const {
            utilisateur,
            localisation,
            note,
            verifier,
            zonedelivraison
        } = req.body;

        const files = req.files;


        const updates = {
            utilisateur,
            localisation,
            note,
            verifier,
            zonedelivraison,
        };

        if (files?.cni1?.[0]?.path) updates.cni1 = files.cni1[0].path;
        if (files?.cni2?.[0]?.path) updates.cni2 = files.cni2[0].path;
        if (files?.selfie?.[0]?.path) updates.selfie = files.selfie[0].path;

        const vendeur = await vendeurModel.findByIdAndUpdate(req.params.id, updates, { new: true });

        if (!vendeur) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        res.status(200).json(vendeur);
    } catch (err) {
        console.error("Erreur lors de la mise à jour du vendeur:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Supprimer un vendeur par ID
export const deleteVendeur = async (req, res) => {
    try {
        const vendeur = await vendeurModel.findByIdAndDelete(req.params.id);

        if (!vendeur) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        res.status(200).json({ message: "Vendeur supprimé avec succès" });
    } catch (err) {
        console.error("Erreur lors de la suppression du vendeur:", err.message);
        res.status(500).json({ error: err.message });
    }
};
