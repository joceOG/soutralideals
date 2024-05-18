const express = require('express');
const router = express.Router();
const Prestataire = require('../models/prestataireModel');

//Functions 

async function createPrestataire(idutilisateur, idservice, nomservice, prixmoyen, localisation, localisation, note, cni, selfie, verifier) {
    try {
        const newPrestataire = new ({ idutilisateur, idservice, nomservice, prixmoyen, localisation, note, cni, selfie, verifier });
        await newPrestataire.save();
        return newPrestataire;
    } catch (err) {
        throw new Error('Error creating User');
    }
}

async function getPrestataire() {
    try {
        const prestataires = await Prestataire.find();
        return prestataires;
    } catch (err) {
        throw new Error('Error fetching Users');
    }
}



// Create a new Groupe
router.post('/prestataire', async(req, res) => {
    try {
        console.log(req.body)
        const { idutilisateur, idservice, nomservice, prixmoyen, localisation, note, cni, selfie, verifier } = req.body;
        const prestataire = await createUtilisateur(idutilisateur, idservice, nomservice, prixmoyen, localisation, note, cni, selfie, verifier);
        res.json(prestataire);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Groupes
router.get('/prestataire', async(req, res) => {
    try {
        const prestataire = await getPrestataire();
        res.json(prestataire);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;