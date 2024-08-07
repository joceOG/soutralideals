const express = require('express');
const router = express.Router();
const Prestation = require('../models/prestation');

// Créer une nouvelle prestation
router.post('/prestation', async (req, res) => {
    try {
        const { dateDebut, dateFin, status, utilisateur } = req.body;
        const newPrestation = new Prestation({
            dateDebut,
            dateFin,
            status,
            utilisateur
        });
        await newPrestation.save();
        res.status(201).json(newPrestation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir toutes les prestations
router.get('/prestations', async (req, res) => {
    try {
        const prestations = await Prestation.find().populate('utilisateur');
        res.status(200).json(prestations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir une prestation par ID
router.get('/prestation/:id', async (req, res) => {
    try {
        const prestation = await Prestation.findById(req.params.id).populate('utilisateur');
        if (!prestation) {
            return res.status(404).json({ error: 'Prestation non trouvée' });
        }
        res.status(200).json(prestation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mettre à jour une prestation par ID
router.put('/prestation/:id', async (req, res) => {
    try {
        const { dateDebut, dateFin, status, utilisateur } = req.body;
        const prestation = await Prestation.findByIdAndUpdate(req.params.id, {
            dateDebut,
            dateFin,
            status,
            utilisateur
        }, { new: true }).populate('utilisateur');

        if (!prestation) {
            return res.status(404).json({ error: 'Prestation non trouvée' });
        }
        res.status(200).json(prestation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Supprimer une prestation par ID
router.delete('/prestation/:id', async (req, res) => {
    try {
        const prestation = await Prestation.findByIdAndDelete(req.params.id);
        if (!prestation) {
            return res.status(404).json({ error: 'Prestation non trouvée' });
        }
        res.status(200).json({ message: 'Prestation supprimée avec succès' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
