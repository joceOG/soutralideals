const express = require('express');
const router = express.Router();
const Categorie = require('../models/categorieModel');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const cloudinary = require("cloudinary").v2;
const bcrypt = require('bcrypt');

cloudinary.config({
    cloud_name: "dm0c8st6k",
    api_key: "541481188898557",
    api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
});


// Créer une nouvelle catégorie
router.post('/categorie', upload.single('imagecategorie'), async (req, res) => {
    try {
        console.log("Categorie Post") ;       
        const nomcategorie = req.body.nomcategorie;
        const groupe = req.body.groupe;

        let imagecategorie = '';

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'categories',
            });
            imagecategorie = result.secure_url;
        }

        const newCategorie = new Categorie({ nomcategorie, imagecategorie : imagecategorie, groupe });
        await newCategorie.save();
        res.status(201).json(newCategorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
        console.log("Erreur") ;
        console.log(err.message) ;
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
        const { nomcategorie, groupe } = req.body;
        let imagecategorie = '';
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'categorie',
            });
            imagecategorie = result.secure_url;
        }
        const categorie = await Categorie.findByIdAndUpdate(req.params.id, {
            nomcategorie,
            imagecategorie,
            groupe
        }, { new: true }) ; // Populer le groupe si nécessaire

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
