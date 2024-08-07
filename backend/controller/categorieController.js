const express = require('express');
const router = express.Router();
const Categorie = require('../models/categorieModel');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



// Créer une nouvelle catégorie
router.post('/categorie', upload.single('imagecategorie'), async (req, res) => {
    try {
        console.log("Categorie Post") ;       
        const nomcategorie = req.body.nomcategorie;
        const groupe = req.body.groupe;
        const imagecategorie =  req.file.buffer; 
        //const { nomcategorie, imagecategorie, groupe } = req.body;
        console.log(  nomcategorie ) ;
        console.log(  groupe ) ;
        const newCategorie = new Categorie({ nomcategorie, imagecategorie, groupe });
        await newCategorie.save();
        res.status(201).json(newCategorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir toutes les catégories
router.get('/categorie', async (req, res) => {
    try {
        const categories = await Categorie.find().populate('groupe'); // Populer le groupe si nécessaire
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir une catégorie par ID
router.get('/categorie/:id', async (req, res) => {
    try {
        const categorie = await Categorie.findById(req.params.id).populate('groupe'); // Populer le groupe si nécessaire
        if (!categorie) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }
        res.status(200).json(categorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mettre à jour une catégorie par ID
router.put('/categorie/:id', async (req, res) => {
    try {
        const { nomcategorie, imagecategorie, groupe } = req.body;
        const categorie = await Categorie.findByIdAndUpdate(req.params.id, {
            nomcategorie,
            imagecategorie,
            groupe
        }, { new: true }).populate('categorie'); // Populer le groupe si nécessaire

        if (!categorie) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }
        res.status(200).json(categorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Supprimer une catégorie par ID
router.delete('/categorie/:id', async (req, res) => {
    try {
        const categorie = await Categorie.findByIdAndDelete(req.params.id);
        if (!categorie) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }
        res.status(200).json({ message: 'Catégorie supprimée avec succès' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
