import fs from 'fs';
import cloudinary from 'cloudinary';
import articleModel from '../models/articleModel.js';
import mongoose from 'mongoose';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Recherche d'articles
export const searchArticles = async (req, res) => {
    try {
        const { query } = req.query;
        const limit = 20;

        let searchCriteria = {};

        if (query) {
            searchCriteria.$or = [
                { nomArticle: { $regex: query, $options: 'i' } },
                { tags: { $in: [new RegExp(query, 'i')] } }
            ];
        }

        const articles = await articleModel.find(searchCriteria)
            .populate('categorie')
            .limit(limit);

        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Helper pour parser les tags
const parseTags = (tags) => {
    if (!tags) return [];
    try {
        return typeof tags === 'string' ? JSON.parse(tags) : tags;
    } catch (e) {
        return [tags];
    }
};

// ✅ Met à jour un article (avec upload d'image)
export const updateArticleById = async (req, res) => {
    try {
        const {
            nomArticle,
            prixArticle,
            ancienPrixArticle,
            discountPercent,
            isPromo,
            rating,
            salesCount,
            quantiteArticle,
            vendeur,
            categorie,
            tags
        } = req.body;
        const { path: filePath } = req.file || {};

        const parseNumber = (value) => {
            if (value === null || typeof value === 'undefined' || value === '') return undefined;
            const n = Number(value);
            return Number.isFinite(n) ? n : undefined;
        };

        let updatedFields = {
            nomArticle,
            quantiteArticle,
            ...(typeof parseNumber(prixArticle) !== 'undefined' && { prixArticle: parseNumber(prixArticle) }),
            ...(typeof parseNumber(ancienPrixArticle) !== 'undefined' && { ancienPrixArticle: parseNumber(ancienPrixArticle) }),
            ...(typeof parseNumber(discountPercent) !== 'undefined' && { discountPercent: parseNumber(discountPercent) }),
            ...(typeof parseNumber(rating) !== 'undefined' && { rating: parseNumber(rating) }),
            ...(typeof parseNumber(salesCount) !== 'undefined' && { salesCount: parseNumber(salesCount) }),
            ...(typeof isPromo !== 'undefined' && { isPromo: isPromo === true || isPromo === 'true' }),
        };

        if (tags) {
            updatedFields.tags = parseTags(tags);
        }

        if (vendeur) {
            updatedFields.vendeur = new mongoose.Types.ObjectId(vendeur);
        }

        if (categorie) {
            updatedFields.categorie = new mongoose.Types.ObjectId(categorie);
        }

        if (req.file) {
            // Upload nouvelle image
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'articles',
            });

            // Supprimer l'image temporaire
            fs.unlinkSync(req.file.path);

            // Supprimer l'ancienne image dans Cloudinary si elle existe
            const articleToUpdate = await articleModel.findById(req.params.id);
            if (articleToUpdate?.photoArticle) {
                const publicId = articleToUpdate.photoArticle.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.v2.uploader.destroy(publicId);
            }

            updatedFields.photoArticle = result.secure_url;
        }

        const updatedArticle = await articleModel.findByIdAndUpdate(
            req.params.id,
            updatedFields,
            { new: true }
        )
            .populate('categorie')
            .populate({
                path: 'vendeur',
                populate: {
                    path: 'utilisateur',
                    model: 'Utilisateur'
                }
            });

        if (!updatedArticle) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        res.status(200).json(updatedArticle);
    } catch (err) {
        console.error('Erreur lors de la mise à jour de l\'article:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ Crée un nouvel article avec upload d'image
export const createArticle = async (req, res) => {
    try {
        const {
            nomArticle,
            prixArticle,
            ancienPrixArticle,
            discountPercent,
            isPromo,
            rating,
            salesCount,
            quantiteArticle,
            vendeur,
            categorie,
            tags
        } = req.body;
        const categorieId = new mongoose.Types.ObjectId(categorie);
        const vendeurId = new mongoose.Types.ObjectId(vendeur);
        const parseNumber = (value, fallback = 0) => {
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
        };

        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier image téléchargé' });
        }

        const result = await cloudinary.v2.uploader.upload(req.file.path, {
            folder: 'articles',
        });

        fs.unlinkSync(req.file.path);

        const newArticle = new articleModel({
            nomArticle,
            prixArticle: parseNumber(prixArticle, 0),
            ancienPrixArticle: ancienPrixArticle ? parseNumber(ancienPrixArticle, 0) : null,
            discountPercent: parseNumber(discountPercent, 0),
            isPromo: isPromo === true || isPromo === 'true',
            rating: parseNumber(rating, 0),
            salesCount: parseNumber(salesCount, 0),
            quantiteArticle,
            photoArticle: result.secure_url,
            vendeur: vendeurId,
            categorie: categorieId,
            tags: parseTags(tags) // ✅ Ajout des tags
        });

        const savedArticle = await newArticle.save();

        // ✅ Correction ici : une seule utilisation de populate avec un tableau
        const populatedArticle = await savedArticle.populate([
            { path: 'categorie' },
            {
                path: 'vendeur',
                populate: {
                    path: 'utilisateur',
                    model: 'Utilisateur'
                }
            }
        ]);

        res.status(201).json(populatedArticle);
    } catch (err) {
        console.error('Erreur lors de la création de l\'article:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ Récupère tous les articles
export const getAllArticles = async (req, res) => {
    try {
        const articles = await articleModel.find()
            .populate('categorie')
            .populate({
                path: 'vendeur',
                populate: {
                    path: 'utilisateur',
                    model: 'Utilisateur'
                }
            });

        res.status(200).json(articles);
    } catch (err) {
        console.error('Erreur lors de la récupération des articles:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ Récupère un article par ID
export const getArticleById = async (req, res) => {
    try {
        const article = await articleModel.findById(req.params.id)
            .populate('categorie')
            .populate({
                path: 'vendeur',
                populate: {
                    path: 'utilisateur',
                    model: 'Utilisateur'
                }
            });

        if (!article) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        res.status(200).json(article);
    } catch (err) {
        console.error('Erreur lors de la récupération de l\'article:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ Supprime un article par ID
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
