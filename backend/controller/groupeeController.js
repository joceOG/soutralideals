const express = require('express');
const router = express.Router();
const Groupe = require('../models/Groupe');

// Créer un nouveau groupe
router.post('/groupe', async (req, res) => {
    try {
        const { nomgroupe } = req.body;
        const newGroupe = new Groupe({ nomgroupe });
        await newGroupe.save();
        res.status(201).json(newGroupe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir tous les groupes
router.get('/groupes', async (req, res) => {
    try {
        const groupes = await Groupe.find();
        res.status(200).json(groupes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir un groupe par ID
router.get('/groupe/:id', async (req, res) => {
    try {
        const groupe = await Groupe.findById(req.params.id);
        if (!groupe) {
            return res.status(404).json({ error: 'Groupe non trouvé' });
        }
        res.status(200).json(groupe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mettre à jour un groupe par ID
router.put('/groupe/:id', async (req, res) => {
    try {
        const { nomgroupe } = req.body;
        const groupe = await Groupe.findByIdAndUpdate(req.params.id, { nomgroupe }, { new: true });
        if (!groupe) {
            return res.status(404).json({ error: 'Groupe non trouvé' });
        }
        res.status(200).json(groupe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Supprimer un groupe par ID
router.delete('/groupe/:id', async (req, res) => {
    try {
        const groupe = await Groupe.findByIdAndDelete(req.params.id);
        if (!groupe) {
            return res.status(404).json({ error: 'Groupe non trouvé' });
        }
        res.status(200).json({ message: 'Groupe supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
