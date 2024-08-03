const express = require('express');
const router = express.Router();
const Article = require('../models/articleModel');

// Créer un nouvel article
router.post('/article', async (req, res) => {
    try {
        const { nomArticle, prixArticle, quantiteArticle, photoArticle, categorie } = req.body;
        const newArticle = new Article({
            nomArticle,
            prixArticle,
            quantiteArticle,
            photoArticle,
            categorie
        });
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

// Mettre à jour un article par ID
router.put('/article/:id', async (req, res) => {
    try {
        const { nomArticle, prixArticle, quantiteArticle, photoArticle, categorie } = req.body;
        const article = await Article.findByIdAndUpdate(req.params.id, {
            nomArticle,
            prixArticle,
            quantiteArticle,
            photoArticle,
            categorie
        }, { new: true }).populate('categorie'); // Populer la catégorie si nécessaire

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
