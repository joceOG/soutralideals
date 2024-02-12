const express = require('express');
const router = express.Router();
const Categorie = require('../models/categorieModel');

//Functions 

async function createCategorie(nomcategorie, idgroupe) {
    try {
        const newCategorie = new Categorie({ nomcategorie, idgroupe });
        await newCategorie.save();
        return newCategorie;
    } catch (err) {
        throw new Error('Error creating Catégorie');
    }
}

async function getCategorie() {
    try {
        const categories = await Categorie.find();
        return categories;
    } catch (err) {
        throw new Error('Error fetching Catégorie');
    }
}



// Create a new Groupe
router.post('/categorie', async(req, res) => {
    try {
        console.log(req.body)
        const { nomcategorie, idgroupe } = req.body;
        const categorie = await createCategorie(nomcategorie, idgroupe);
        res.json(categorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Groupes
router.get('/categorie', async(req, res) => {
    try {
        const categorie = await getCategorie();
        res.json(categorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;