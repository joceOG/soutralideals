const express = require('express');
const router = express.Router();
const Commande = require('../models/Commande');

// Créer une nouvelle commande
router.post('/commande', async (req, res) => {
    try {
        const { DateCommande, DetailsCommande, article, utilisateur } = req.body;
        const newCommande = new Commande({
            DateCommande,
            DetailsCommande,
            article,
            utilisateur
        });
        await newCommande.save();
        res.status(201).json(newCommande);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir toutes les commandes
router.get('/commandes', async (req, res) => {
    try {
        const commandes = await Commande.find()
            .populate('article')
            .populate('utilisateur'); // Populer l'article et l'utilisateur si nécessaire
        res.status(200).json(commandes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir une commande par ID
router.get('/commande/:id', async (req, res) => {
    try {
        const commande = await Commande.findById(req.params.id)
            .populate('article')
            .populate('utilisateur'); // Populer l'article et l'utilisateur si nécessaire
        if (!commande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        res.status(200).json(commande);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mettre à jour une commande par ID
router.put('/commande/:id', async (req, res) => {
    try {
        const { DateCommande, DetailsCommande, article, utilisateur } = req.body;
        const commande = await Commande.findByIdAndUpdate(req.params.id, {
            DateCommande,
            DetailsCommande,
            article,
            utilisateur
        }, { new: true })
            .populate('article')
            .populate('utilisateur'); // Populer l'article et l'utilisateur si nécessaire

        if (!commande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        res.status(200).json(commande);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Supprimer une commande par ID
router.delete('/commande/:id', async (req, res) => {
    try {
        const commande = await Commande.findByIdAndDelete(req.params.id);
        if (!commande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        res.status(200).json({ message: 'Commande supprimée avec succès' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
