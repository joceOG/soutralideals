const express = require('express');
const router = express.Router();
const Typeutilisateur = require('../models/typeutilisateurModel');

//Functions 

async function createTypeutilisateur(LibelleType, type_prestataire, type_client) {
    try {
        const newTypeutilisateur = new ({ LibelleType, type_prestataire, type_client });
        await newTypeutilisateur.save();
        return newTypeutilisateur;
    } catch (err) {
        throw new Error('Error creating UserType');
    }
}
 
async function getTypeutilisateur() {
    try {
        const typeutilisateurs = await Typeutilisateur.find();
        return typeutilisateurs;
    } catch (err) {
        throw new Error('Error fetching UserType');
    }
}



// Create a new Groupe
router.post('/typeutilisateur', async(req, res) => {
    try {
        console.log(req.body)
        const { LibelleType, type_prestataire, type_client } = req.body;
        const typeutilisateur = await createTypeutilisateur(LibelleType, type_prestataire, type_client);
        res.json(typeutilisateur);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Groupes
router.get('/typeutilisateur', async(req, res) => {
    try {
        const typeutilisateur = await getTypeutilisateur();
        res.json(typeutilisateur);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router