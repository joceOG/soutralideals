const express = require('express');
const router = express.Router();
const Categorie = require('../models/categorieModel');
const multer = require('multer');
const cloudinary = require("cloudinary").v2;
const fs = require('fs');
const mongoose = require('mongoose');

// Configure Cloudinary
cloudinary.config({
    cloud_name: "dm0c8st6k",
    api_key: "541481188898557",
    api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
});

// Configure Multer
const upload = multer({ dest: 'uploads/' });


// Mettre à jour une catégorie par ID
router.put('/categorie/:id', upload.single('imagecategorie'), async (req, res) => {
    try {
        const { nomcategorie, groupe } = req.body;
        const { path: filePath } = req.file || {};

        // Find the category to update
        const categorie = await Categorie.findById(req.params.id);

        if (!categorie) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        // If a new image is uploaded
        if (filePath) {
            // Upload new image to Cloudinary
            const result = await cloudinary.uploader.upload(filePath);

            // Remove the uploaded file from the server
            fs.unlinkSync(filePath);

            // If there was an old image, delete it from Cloudinary
            if (categorie.imagecategorie) {
                const publicId = categorie.imagecategorie.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }

            // Update category with new image URL
            categorie.imagecategorie = result.secure_url;
        }

        // Update other fields
        categorie.nomcategorie = nomcategorie || categorie.nomcategorie;
        categorie.groupe = mongoose.Types.ObjectId(groupe) || categorie.groupe;

        // Save updated category
        const updatedCategorie = await categorie.save();
        res.status(200).json(updatedCategorie);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Your POST route to create a new category
router.post('/categorie', upload.single('imagecategorie'), async (req, res) => {
    try {
        const { nomcategorie, groupe } = req.body;
        
        // Convert groupe to ObjectId
        const groupeId = mongoose.Types.ObjectId(groupe);
        
        // Upload image to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path);
        
        // Remove the uploaded file from the server
        fs.unlinkSync(req.file.path);
        
        // Create a new category
        const newCategorie = new Categorie({
            nomcategorie,
            imagecategorie: result.secure_url, // Cloudinary URL
            groupe: groupeId
        });
        
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
