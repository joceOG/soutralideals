const express = require('express');
const router = express.Router();
const Typeutilisayeur = require('../models/typeutilisayeurModel');

//Functions 

async function createTypeutilisayeur(nom) {
    try {
        const newTypeutilisayeur = new ({ nom});
        await newTypeutilisayeur.save();
        return newTypeutilisayeur;
    } catch (err) {
        throw new Error('Error creating UserType');
    }
}

async function getTypeutilisayeur() {
    try {
        const typeutilisayeurs = await Typeutilisayeur.find();
        return typeutilisayeurs;
    } catch (err) {
        throw new Error('Error fetching UserType');
    }
}



// Create a new Groupe
router.post('/typeutilisayeur', async(req, res) => {
    try {
        console.log(req.body)
        const { nom} = req.body;
        const typeutilisayeur = await createTypeutilisayeur(nom);
        res.json(typeutilisayeur);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Groupes
router.get('/typeutilisayeur', async(req, res) => {
    try {
        const typeutilisayeur = await getTypeutilisayeur();
        res.json(typeutilisayeur);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router