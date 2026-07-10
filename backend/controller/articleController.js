import fs from 'fs';
import cloudinary from 'cloudinary';
import articleModel from '../models/articleModel.js';
import vendeurModel from '../models/vendeurModel.js';
import mongoose from 'mongoose';
import { isAdmin } from '../utils/accessControl.js';
import { pickFields } from '../utils/pickFields.js';
import { escapeRegex } from '../utils/escapeRegex.js';

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
            const safeQuery = escapeRegex(query);
            searchCriteria.$or = [
                { nomArticle: { $regex: safeQuery, $options: 'i' } },
                { tags: { $in: [new RegExp(safeQuery, 'i')] } }
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

const parseNumber = (value, fallback) => {
    if (value === null || typeof value === 'undefined' || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const ARTICLE_OWNER_FIELDS = [
    'nomArticle', 'prixArticle', 'ancienPrixArticle', 'discountPercent',
    'isPromo', 'quantiteArticle', 'tags', 'categorie',
];

const ARTICLE_ADMIN_FIELDS = ['rating', 'salesCount', 'vendeur'];

async function loadArticleWithOwner(articleId) {
    return articleModel.findById(articleId).populate({
        path: 'vendeur',
        select: 'utilisateur',
    });
}

async function assertArticleOwnerOrAdmin(req, res, articleId) {
    const article = await loadArticleWithOwner(articleId);
    if (!article) {
        res.status(404).json({ error: 'Article non trouvé' });
        return null;
    }
    if (isAdmin(req)) return article;
    const ownerId = article.vendeur?.utilisateur?.toString();
    if (ownerId !== req.utilisateur._id.toString()) {
        res.status(403).json({ error: 'Accès refusé : vous ne pouvez modifier que vos propres articles.' });
        return null;
    }
    return article;
}

async function assertVendeurOwnership(req, res, vendeurId) {
    if (!mongoose.Types.ObjectId.isValid(vendeurId)) {
        res.status(400).json({ error: 'ID vendeur invalide' });
        return false;
    }
    if (isAdmin(req)) return true;
    const vendeurDoc = await vendeurModel.findById(vendeurId).select('utilisateur');
    if (!vendeurDoc) {
        res.status(404).json({ error: 'Vendeur non trouvé' });
        return false;
    }
    if (vendeurDoc.utilisateur.toString() !== req.utilisateur._id.toString()) {
        res.status(403).json({ error: 'Vous ne pouvez créer des articles que pour votre boutique.' });
        return false;
    }
    return true;
}

// ✅ Met à jour un article (avec upload d'image)
export const updateArticleById = async (req, res) => {
    try {
        const article = await assertArticleOwnerOrAdmin(req, res, req.params.id);
        if (!article) return;

        const allowedFields = isAdmin(req)
            ? [...ARTICLE_OWNER_FIELDS, ...ARTICLE_ADMIN_FIELDS]
            : ARTICLE_OWNER_FIELDS;
        const body = pickFields(req.body, allowedFields);

        let updatedFields = {};
        if (body.nomArticle !== undefined) updatedFields.nomArticle = body.nomArticle;
        if (body.quantiteArticle !== undefined) updatedFields.quantiteArticle = body.quantiteArticle;
        if (body.prixArticle !== undefined) updatedFields.prixArticle = parseNumber(body.prixArticle, article.prixArticle);
        if (body.ancienPrixArticle !== undefined) updatedFields.ancienPrixArticle = parseNumber(body.ancienPrixArticle, null);
        if (body.discountPercent !== undefined) updatedFields.discountPercent = parseNumber(body.discountPercent, 0);
        if (body.isPromo !== undefined) updatedFields.isPromo = body.isPromo === true || body.isPromo === 'true';
        if (isAdmin(req) && body.rating !== undefined) updatedFields.rating = parseNumber(body.rating, 0);
        if (isAdmin(req) && body.salesCount !== undefined) updatedFields.salesCount = parseNumber(body.salesCount, 0);

        if (body.tags) {
            updatedFields.tags = parseTags(body.tags);
        }

        if (isAdmin(req) && body.vendeur) {
            updatedFields.vendeur = new mongoose.Types.ObjectId(body.vendeur);
        }

        if (body.categorie) {
            updatedFields.categorie = new mongoose.Types.ObjectId(body.categorie);
        }

        if (req.file) {
            // Upload nouvelle image
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'articles',
            });

            // Supprimer l'image temporaire
            fs.unlinkSync(req.file.path);

            // Supprimer l'ancienne image dans Cloudinary si elle existe
            if (article.photoArticle) {
                const publicId = article.photoArticle.split('/').slice(-2).join('/').split('.')[0];
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
            quantiteArticle,
            vendeur,
            categorie,
            tags
        } = req.body;

        if (!vendeur || !categorie) {
            return res.status(400).json({ error: 'Vendeur et catégorie requis' });
        }

        if (!(await assertVendeurOwnership(req, res, vendeur))) return;

        const categorieId = new mongoose.Types.ObjectId(categorie);
        const vendeurId = new mongoose.Types.ObjectId(vendeur);

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
            rating: 0,
            salesCount: 0,
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
        const article = await assertArticleOwnerOrAdmin(req, res, req.params.id);
        if (!article) return;

        await articleModel.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Article supprimé avec succès' });
    } catch (err) {
        console.error('Erreur lors de la suppression de l\'article:', err.message);
        res.status(500).json({ error: err.message });
    }
};
