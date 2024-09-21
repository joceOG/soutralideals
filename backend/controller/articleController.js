const express = require('express');
const router = express.Router();
const Article = require('../models/articleModel');
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
// PUT /api/article/:id - Update an article with optional image upload
router.put('/article/:id', upload.single('photoArticle'), async (req, res) => {
    try {
        const { nomArticle, prixArticle, quantiteArticle, categorie } = req.body;
        let updatedFields = {
            nomArticle,
            prixArticle,
            quantiteArticle,
            categorie
        };

        // Check if a new image file is uploaded
        if (req.file) {
            // Upload the new image to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'articles',  // Optional: specify a folder in Cloudinary
            });

            // Remove the file from the server after upload
            fs.unlinkSync(req.file.path);

            // Add the new image URL to the updated fields
            updatedFields.photoArticle = result.secure_url;

         
            const articleToUpdate = await Article.findById(req.params.id);
            if (articleToUpdate && articleToUpdate.photoArticle) {
        
                const publicId = articleToUpdate.photoArticle.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId)
                    .then(result => {
                        console.log('Old image deleted:', result);
                    })
                    .catch(err => {
                        console.error('Error deleting old image:', err);
                    });
            }
        }

        // Find and update the article
        const updatedArticle = await Article.findByIdAndUpdate(
            req.params.id,
            updatedFields,
            { new: true }
        ).populate('categorie'); // Populate the category field

        if (!updatedArticle) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        res.status(200).json(updatedArticle);
    } catch (err) {
        console.error('Error updating article:', err);
        res.status(500).json({ error: err.message });
    }
});
// Create a new article with image upload
router.post('/article', upload.single('photoArticle'), async (req, res) => {
    try {
        const { nomArticle, prixArticle, quantiteArticle, categorie } = req.body;

        // Ensure a file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        // Upload the image to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'articles',  // Optionally specify a folder in Cloudinary
        });

        // Remove the file from the server after upload
        fs.unlinkSync(req.file.path);

        // Create a new article with the Cloudinary image URL
        const newArticle = new Article({
            nomArticle,
            prixArticle,
            quantiteArticle,
            photoArticle: result.secure_url,  // Use the Cloudinary image URL
            categorie,
        });

        // Save the new article to the database
        await newArticle.save();

        res.status(201).json(newArticle);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
 
// Obtenir tous les articles
router.get('/articles', async (req, res) => {
    try {
        const articles = await Article.find().populate('categorie'); // Populer la catégorie si nécessaire
        res.status(200).json(articles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir un article par ID
router.get('/article/:id', async (req, res) => {
    try {
        const article = await Article.findById(req.params.id).populate('categorie'); // Populer la catégorie si nécessaire
        if (!article) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        res.status(200).json(article);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Supprimer un article par ID
router.delete('/article/:id', async (req, res) => {
    try {
        const article = await Article.findByIdAndDelete(req.params.id);
        if (!article) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        res.status(200).json({ message: 'Article supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
