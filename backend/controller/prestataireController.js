import prestataireModel from "../models/prestataireModel.js";

// Créer un nouveau prestataire
export const createPrestataire = async (req, res) => {
    try {
        const {
            idUtilisateur,
            cni,
            selfie,
            verifier,
            idservice,
            nomservice,
            prixmoyen,
            localisation,
            note,
        } = req.body;

        const newPrestataire = new prestataireModel({
            idUtilisateur,
            cni: cni ? Buffer.from(cni, "base64") : undefined, // Convert base64 to buffer
            selfie: selfie ? Buffer.from(selfie, "base64") : undefined,
            verifier,
            idservice,
            nomservice,
            prixmoyen,
            localisation,
            note,
        });

        await newPrestataire.save();
        res.status(201).json(newPrestataire);
    } catch (err) {
        console.error("Erreur lors de la création du prestataire:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Obtenir tous les prestataires
export const getAllPrestataires = async (req, res) => {
    try {
        const prestataires = await prestataireModel.find();
        res.status(200).json(prestataires);
    } catch (err) {
        console.error("Erreur lors de la récupération des prestataires:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Obtenir un prestataire par ID
export const getPrestataireById = async (req, res) => {
    try {
        const prestataire = await prestataireModel.findById(req.params.id);

        if (!prestataire) {
            return res.status(404).json({ error: "Prestataire non trouvé" });
        }

        res.status(200).json(prestataire);
    } catch (err) {
        console.error("Erreur lors de la récupération du prestataire:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Mettre à jour un prestataire par ID
export const updatePrestataire = async (req, res) => {
    try {
        const {
            idUtilisateur,
            cni,
            selfie,
            verifier,
            idservice,
            nomservice,
            prixmoyen,
            localisation,
            note,
        } = req.body;

        const updates = {
            idUtilisateur,
            verifier,
            idservice,
            nomservice,
            prixmoyen,
            localisation,
            note,
        };

        if (cni) updates.cni = Buffer.from(cni, "base64");
        if (selfie) updates.selfie = Buffer.from(selfie, "base64");

        const prestataire = await prestataireModel.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        );

        if (!prestataire) {
            return res.status(404).json({ error: "Prestataire non trouvé" });
        }

        res.status(200).json(prestataire);
    } catch (err) {
        console.error("Erreur lors de la mise à jour du prestataire:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Supprimer un prestataire par ID
export const deletePrestataire = async (req, res) => {
    try {
        const prestataire = await prestataireModel.findByIdAndDelete(req.params.id);

        if (!prestataire) {
            return res.status(404).json({ error: "Prestataire non trouvé" });
        }

        res.status(200).json({ message: "Prestataire supprimé avec succès" });
    } catch (err) {
        console.error("Erreur lors de la suppression du prestataire:", err.message);
        res.status(500).json({ error: err.message });
    }
};