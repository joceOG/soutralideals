import fs from 'fs';
import cloudinary from 'cloudinary';
import articleModel from '../models/articleModel.js';

// Configuration de Cloudinary
cloudinary.v2.config({
    cloud_name: "dm0c8st6k",
    api_key: "541481188898557",
    api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
});

// Met à jour un article (avec upload d'image)
export const updateArticle = async (req, res) => {
    try {
        const { nomArticle, prixArticle, quantiteArticle, categorie } = req.body;

        let updatedFields = {
            nomArticle,
            prixArticle,
            quantiteArticle,
            categorie
        };

        if (req.file) {
            // Upload nouvelle image
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'articles',
            });

            // Supprimer l'image temporaire
            fs.unlinkSync(req.file.path);

            // Ajouter l'URL de l'image au champ mis à jour
            updatedFields.photoArticle = result.secure_url;

            // Supprimer l'ancienne image dans Cloudinary si elle existe
            const articleToUpdate = await articleModel.findById(req.params.id);
            if (articleToUpdate?.photoArticle) {
                const publicId = articleToUpdate.photoArticle.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.v2.uploader.destroy(publicId);
            }
        }

        const updatedArticle = await articleModel.findByIdAndUpdate(
            req.params.id,
            updatedFields,
            { new: true }
        )

        if (!updatedArticle) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        res.status(200).json(updatedArticle);
    } catch (err) {
        // console.error('Erreur lors de la mise à jour de l\'article:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// Crée un nouvel article avec upload d'image
export const createArticle = async (req, res) => {
    try {
        const { nomArticle, prixArticle, quantiteArticle, categorie } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier image téléchargé' });
        }

        const result = await cloudinary.v2.uploader.upload(req.file.path, {
            folder: 'articles',
        });

        fs.unlinkSync(req.file.path);

        const newArticle = new articleModel({
            nomArticle,
            prixArticle,
            quantiteArticle,
            photoArticle: result.secure_url,
            categorie,
        });

        await newArticle.save();
        res.status(201).json(newArticle);
    } catch (err) {
        console.error('Erreur lors de la création de l\'article:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// Récupère tous les articles
export const getAllArticles = async (req, res) => {
    try {
        const articles = await articleModel.find({}).populate('categorie');
        
        res.status(200).json(articles);
    } catch (err) {
        // console.error('Erreur lors de la récupération des articles:', err.message);
        res.status(500).json( 'Impossible de récupérer les articles' );
    }
};

// Récupère un article par ID
export const getArticleById = async (req, res) => {
    try {
        const article = await articleModel.findById(req.params.id).populate('categorie');
        if (!article) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }
        res.status(200).json(article);
    } catch (err) {
        console.error('Erreur lors de la récupération de l\'article:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// Supprime un article par ID
export const deleteArticle = async (req, res) => {
    try {
        const article = await articleModel.findByIdAndDelete(req.params.id);

        if (!article) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        res.status(200).json({ message: 'Article supprimé avec succès' });
    } catch (err) {
        console.error('Erreur lors de la suppression de l\'article:', err.message);
        res.status(500).json({ error: err.message });
    }
};
