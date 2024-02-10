const express = require('express');
const router = express.Router();
const Groupe = require('../models/groupeModel');

//Functions 

async function createGroupe(nomgroupe) {
    try {
        const newGroupe = new Groupe({ nomgroupe });
        await newGroupe.save();
        return newGroupe;
    } catch (err) {
        throw new Error('Error creating groupe');
    }
}

async function getGroupe() {
    try {
        const groupes = await Groupe.find();
        return groupes;
    } catch (err) {
        throw new Error('Error fetching Groupes');
    }
}



// Create a new Groupe
router.post('/groupe', async(req, res) => {
    try {
        console.log(req.body)
        const { nomgroupe } = req.body;
        const groupe = await createGroupe(nomgroupe);
        res.json(groupe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Groupes
router.get('/groupe', async(req, res) => {
    try {
        const groupe = await getGroupe();
        res.json(groupe);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;