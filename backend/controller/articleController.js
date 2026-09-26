import fs from 'fs';
import cloudinary from 'cloudinary';
import articleModel from '../models/articleModel.js';
import vendeurModel from '../models/vendeurModel.js';
import mongoose from 'mongoose';
import { isAdmin } from '../utils/accessControl.js';
import { pickFields } from '../utils/pickFields.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import {
  findPublicVendeurIds,
  isProPubliclyVisible,
} from '../utils/proPublicFilter.js';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Recherche d'articles (vendeurs publics uniquement)
export const searchArticles = async (req, res) => {
    try {
        const { query } = req.query;
        const limit = 20;

        let searchCriteria = {
            vendeur: { $in: await findPublicVendeurIds(vendeurModel) },
        };

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

const ARTICLE_ADMIN_FIELDS = ['rating', 'salesCount'];

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
    const vendeurDoc = await vendeurModel.findById(vendeurId).select('utilisateur');
    if (!vendeurDoc) {
        res.status(404).json({ error: 'Vendeur non trouvé' });
        return false;
    }
    if (isAdmin(req)) return true;
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

        if (body.categorie) {
            updatedFields.categorie = new mongoose.Types.ObjectId(body.categorie);
        }

        // Le vendeur propriétaire n'est pas modifiable via UPDATE (DASH-8C.2).

        let pendingUpload = null;
        if (req.file) {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'articles',
            });
            fs.unlinkSync(req.file.path);
            pendingUpload = {
                secure_url: result.secure_url,
                public_id: result.public_id || result.secure_url?.split('/').slice(-2).join('/').split('.')[0],
            };
            updatedFields.photoArticle = pendingUpload.secure_url;
        }

        let updatedArticle;
        try {
            updatedArticle = await articleModel.findByIdAndUpdate(
                req.params.id,
                updatedFields,
                { new: true }
            )
                .populate('categorie')
                .populate({
                    path: 'vendeur',
                    populate: {
                        path: 'utilisateur',
                        model: 'Utilisateur',
                        select: 'nom prenom',
                    }
                });
        } catch (updateErr) {
            if (pendingUpload?.public_id) {
                try {
                    await cloudinary.v2.uploader.destroy(pendingUpload.public_id);
                } catch {
                    /* best-effort */
                }
            }
            throw updateErr;
        }

        if (!updatedArticle) {
            if (pendingUpload?.public_id) {
                try {
                    await cloudinary.v2.uploader.destroy(pendingUpload.public_id);
                } catch {
                    /* best-effort */
                }
            }
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        if (pendingUpload && article.photoArticle) {
            const oldPublicId = article.photoArticle.split('/').slice(-2).join('/').split('.')[0];
            try {
                await cloudinary.v2.uploader.destroy(oldPublicId);
            } catch {
                /* best-effort */
            }
        }

        res.status(200).json(updatedArticle);
    } catch (err) {
        await unlinkReqFile(req);
        console.error('Erreur lors de la mise à jour de l\'article:', err.message);
        res.status(500).json({ error: 'Erreur interne' });
    }
};

async function unlinkReqFile(req) {
    if (req.file?.path) {
        try {
            fs.unlinkSync(req.file.path);
        } catch {
            /* ignore */
        }
    }
}

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

        if (!vendeur || !String(vendeur).trim()) {
            await unlinkReqFile(req);
            return res.status(400).json({ error: 'Vendeur requis' });
        }
        if (!categorie || !String(categorie).trim()) {
            await unlinkReqFile(req);
            return res.status(400).json({ error: 'Catégorie requise' });
        }
        if (!mongoose.Types.ObjectId.isValid(String(vendeur))
            || String(new mongoose.Types.ObjectId(String(vendeur))) !== String(vendeur)) {
            await unlinkReqFile(req);
            return res.status(400).json({ error: 'Identifiant vendeur invalide' });
        }
        if (!mongoose.Types.ObjectId.isValid(String(categorie))
            || String(new mongoose.Types.ObjectId(String(categorie))) !== String(categorie)) {
            await unlinkReqFile(req);
            return res.status(400).json({ error: 'Identifiant catégorie invalide' });
        }

        if (!(await assertVendeurOwnership(req, res, vendeur))) {
            await unlinkReqFile(req);
            return;
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Photo de l\'article requise' });
        }

        const categorieId = new mongoose.Types.ObjectId(categorie);
        const vendeurId = new mongoose.Types.ObjectId(vendeur);

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
            tags: parseTags(tags)
        });

        let savedArticle;
        try {
            savedArticle = await newArticle.save();
        } catch (saveErr) {
            try {
                const publicId = result.public_id || result.secure_url?.split('/').slice(-2).join('/').split('.')[0];
                if (publicId) await cloudinary.v2.uploader.destroy(publicId);
            } catch {
                /* best-effort */
            }
            throw saveErr;
        }

        const populatedArticle = await savedArticle.populate([
            { path: 'categorie' },
            {
                path: 'vendeur',
                populate: {
                    path: 'utilisateur',
                    model: 'Utilisateur',
                    select: 'nom prenom',
                }
            }
        ]);

        res.status(201).json(populatedArticle);
    } catch (err) {
        await unlinkReqFile(req);
        console.error('Erreur lors de la création de l\'article:', err.message);
        res.status(500).json({ error: 'Erreur interne' });
    }
};

// ✅ Récupère tous les articles (vendeurs publics uniquement, ou filtre boutique admin)
export const getAllArticles = async (req, res) => {
    try {
        const vendeurParam = req.query.vendeur;

        if (vendeurParam !== undefined && vendeurParam !== '') {
            if (!req.utilisateur) {
                return res.status(401).json({ error: 'Authentification requise pour filtrer par boutique.' });
            }
            if (!mongoose.Types.ObjectId.isValid(String(vendeurParam))
                || String(new mongoose.Types.ObjectId(String(vendeurParam))) !== String(vendeurParam)) {
                return res.status(400).json({ error: 'Identifiant vendeur invalide' });
            }

            const vendeurOid = new mongoose.Types.ObjectId(String(vendeurParam));
            const vendeurDoc = await vendeurModel.findById(vendeurOid).select('utilisateur shopName shopLogo');
            if (!vendeurDoc) {
                return res.status(404).json({ error: 'Vendeur non trouvé' });
            }

            if (!isAdmin(req)) {
                if (vendeurDoc.utilisateur.toString() !== req.utilisateur._id.toString()) {
                    return res.status(403).json({ error: 'Accès refusé : boutique non autorisée.' });
                }
            }

            const filter = { vendeur: vendeurOid };
            const searchQ = req.query.search || req.query.query;
            if (searchQ && String(searchQ).trim()) {
                const safe = escapeRegex(String(searchQ).trim());
                filter.$or = [
                    { nomArticle: { $regex: safe, $options: 'i' } },
                    { tags: { $in: [new RegExp(safe, 'i')] } },
                ];
            }

            const categorieParam = req.query.categorie;
            if (categorieParam) {
                if (!mongoose.Types.ObjectId.isValid(String(categorieParam))) {
                    return res.status(400).json({ error: 'Identifiant catégorie invalide' });
                }
                filter.categorie = new mongoose.Types.ObjectId(String(categorieParam));
            }

            const pageNum = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
            const limitNum = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));
            const skip = (pageNum - 1) * limitNum;

            const total = await articleModel.countDocuments(filter);
            const items = await articleModel.find(filter)
                .populate('categorie', 'nomcategorie')
                .populate('vendeur', 'shopName shopLogo')
                .sort({ _id: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean();

            return res.status(200).json({
                items,
                total,
                page: pageNum,
                limit: limitNum,
                boutique: {
                    shopName: vendeurDoc.shopName,
                    shopLogo: vendeurDoc.shopLogo || null,
                },
            });
        }

        const publicVendeurIds = await findPublicVendeurIds(vendeurModel);
        const articles = await articleModel.find({ vendeur: { $in: publicVendeurIds } })
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
        res.status(500).json({ error: 'Erreur interne' });
    }
};

// ✅ Récupère un article par ID (404 si vendeur non public)
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

        const vendeurDoc = article.vendeur;
        if (!vendeurDoc || !isProPubliclyVisible(vendeurDoc)) {
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
