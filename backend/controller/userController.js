const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/utilisateurModel');

// Créer un nouvel utilisateur
router.post('/utilisateur', async (req, res) => {
    try {
        const { nom, prenom, email, motdepasse, telephone, genre, note, photoprofil } = req.body;
        const newUtilisateur = new Utilisateur({
            nom,
            prenom,
            email,
            motdepasse,
            telephone,
            genre,
            note,
            photoprofil: Buffer.from(photoprofil, 'base64') // Si l'image est envoyée en base64
        });
        await newUtilisateur.save();
        res.status(201).json(newUtilisateur);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir tous les utilisateurs
router.get('/utilisateurs', async (req, res) => {
    try {
        const utilisateurs = await Utilisateur.find();
        res.status(200).json(utilisateurs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir un utilisateur par ID
router.get('/utilisateur/:id', async (req, res) => {
    try {
        const utilisateur = await Utilisateur.findById(req.params.id);
        if (!utilisateur) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        res.status(200).json(utilisateur);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mettre à jour un utilisateur par ID
router.put('/utilisateur/:id', async (req, res) => {
    try {
        const { nom, prenom, email, motdepasse, telephone, genre, note, photoprofil } = req.body;
        const updatedData = {
            nom,
            prenom,
            email,
            motdepasse,
            telephone,
            genre,
            note
        };
        if (photoprofil) {
            updatedData.photoprofil = Buffer.from(photoprofil, 'base64');
        }
        const utilisateur = await Utilisateur.findByIdAndUpdate(req.params.id, updatedData, { new: true });
        if (!utilisateur) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        res.status(200).json(utilisateur);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Supprimer un utilisateur par ID
router.delete('/utilisateur/:id', async (req, res) => {
    try {
        const utilisateur = await Utilisateur.findByIdAndDelete(req.params.id);
        if (!utilisateur) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
