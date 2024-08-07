const express = require('express');
const router = express.Router();
const Prestataire = require('../models/prestataire');

// Créer un nouveau prestataire
router.post('/prestataire', async (req, res) => {
    try {
        const { idUtilisateur, cni, selfie, verifier, idservice, nomservice, prixmoyen, localisation, note } = req.body;
        const newPrestataire = new Prestataire({
            idUtilisateur,
            cni: Buffer.from(cni, 'base64'),  // Assuming cni and selfie are base64 encoded strings
            selfie: Buffer.from(selfie, 'base64'),
            verifier,
            idservice,
            nomservice,
            prixmoyen,
            localisation,
            note
        });
        await newPrestataire.save();
        res.status(201).json(newPrestataire);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir tous les prestataires
router.get('/prestataire', async (req, res) => {
    try {
        const prestataires = await Prestataire.find();
        res.status(200).json(prestataires);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir un prestataire par ID
router.get('/prestataire/:id', async (req, res) => {
    try {
        const prestataire = await Prestataire.findById(req.params.id);
        if (!prestataire) {
            return res.status(404).json({ error: 'Prestataire non trouvé' });
        }
        res.status(200).json(prestataire);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mettre à jour un prestataire par ID
router.put('/prestataire/:id', async (req, res) => {
    try {
        const { idUtilisateur, cni, selfie, verifier, idservice, nomservice, prixmoyen, localisation, note } = req.body;
        const prestataire = await Prestataire.findByIdAndUpdate(req.params.id, {
            idUtilisateur,
            cni: cni ? Buffer.from(cni, 'base64') : undefined,
            selfie: selfie ? Buffer.from(selfie, 'base64') : undefined,
            verifier,
            idservice,
            nomservice,
            prixmoyen,
            localisation,
            note
        }, { new: true });

        if (!prestataire) {
            return res.status(404).json({ error: 'Prestataire non trouvé' });
        }
        res.status(200).json(prestataire);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Supprimer un prestataire par ID
router.delete('/prestataire/:id', async (req, res) => {
    try {
        const prestataire = await Prestataire.findByIdAndDelete(req.params.id);
        if (!prestataire) {
            return res.status(404).json({ error: 'Prestataire non trouvé' });
        }
        res.status(200).json({ message: 'Prestataire supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
 
module.exports = router;
