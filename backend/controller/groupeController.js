import groupeModel from "../models/groupeModel.js";

// Créer un nouveau groupe
export const createGroupe = async (req, res) => {
    try {
        const { nomgroupe } = req.body;

        if (!nomgroupe) {
            return res.status(400).json({ error: "Nom du groupe est requis" });
        }

        const newGroupe = new groupeModel({ nomgroupe });
        await newGroupe.save();

        console.log("Groupe créé avec succès.");
        res.status(201).json(newGroupe);
    } catch (err) {
        console.error("Erreur:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Obtenir tous les groupes
export const getAllGroupes = async (req, res) => {
    try {
        const groupes = await groupeModel.find({});
        res.status(200).json(groupes);
        
    } catch (err) {

        console.error("Erreur:", err.message);
        res.status(500).json({ error: err.message });

    }
};

// Obtenir un groupe par ID
export const getGroupeById = async (req, res) => {
    try {
        const groupe = await groupeModel.findById(req.params.id).populate('categories');

        if (!groupe) {
            return res.status(404).json({ error: "Groupe non trouvé" });
        }

        res.status(200).json(groupe.categories);
    } catch (err) {
        console.error("Erreur:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Mettre à jour un groupe par ID
export const updateGroupe = async (req, res) => {
    try {
        const { nomgroupe } = req.body;
        const groupe = await groupeModel.findByIdAndUpdate(
            req.params.id,
            { nomgroupe },
            { new: true }
        );

        if (!groupe) {
            return res.status(404).json({ error: "Groupe non trouvé" });
        }

        res.status(200).json(groupe);
    } catch (err) {
        console.error("Erreur:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Supprimer un groupe par ID
export const deleteGroupe = async (req, res) => {
    try {
        const groupe = await groupeModel.findByIdAndDelete(req.params.id);

        if (!groupe) {
            return res.status(404).json({ error: "Groupe non trouvé" });
        }

        res.status(200).json({ message: "Groupe supprimé avec succès" });
    } catch (err) {
        console.error("Erreur:", err.message);
        res.status(500).json({ error: err.message });
    }
};
