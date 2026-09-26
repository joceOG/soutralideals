import mongoose from 'mongoose';
import vendeurModel from "../models/vendeurModel.js";
import cloudinary from 'cloudinary';
import fs from 'fs';
import { applyProPublicFilter, canAccessProProfile } from "../utils/proPublicFilter.js";
import { isAdmin, assertAdmin } from '../utils/accessControl.js';
import { pickFields } from '../utils/pickFields.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { buildRecensementCreateFields, isRecensementRequest, assertRecensementAgent } from '../utils/recensementPolicy.js';
import { uploadKycToCloudinary, prepareKycReplacement, stripInjectedKycFromBody, presentProDocForViewer, redactKycFromPlain, CLD_AUTH_PREFIX } from '../utils/kycAccess.js';
import {
  validateVendeurCreateBody,
  parseJsonArrayField,
  parseJsonObjectField,
  mongooseValidationTo400,
} from '../utils/vendeurValidation.js';
import { presentVendeurPendingListItem } from '../utils/vendeurPendingPresenter.js';
import { cleanupMulterFiles } from '../middleware/vendeurMultipartGate.js';
import Utilisateur from '../models/utilisateurModel.js';
import articleModel from '../models/articleModel.js';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const VENDEUR_OWNER_FIELDS = [
  'shopName', 'shopDescription', 'businessType', 'businessCategories',
  'deliveryZones', 'shippingMethods', 'paymentMethods',
  'businessRegistrationNumber', 'businessAddress', 'businessPhone', 'businessEmail',
  'returnPolicy', 'warrantyInfo', 'minimumOrderAmount', 'maxOrdersPerDay',
  'socialMedia', 'preferredContactMethod', 'tags', 'notes',
];

const JSON_FIELDS = [
  'businessCategories', 'deliveryZones', 'shippingMethods',
  'paymentMethods', 'businessAddress', 'socialMedia', 'tags',
];

const VENDEUR_ADMIN_FIELDS = [
  'isTopRated', 'isFeatured', 'accountStatus', 'status', 'isVerified',
  'verificationLevel', 'identityVerified', 'businessVerified',
];

async function destroyKycRef(ref) {
  if (typeof ref !== 'string' || !ref.startsWith(CLD_AUTH_PREFIX)) return;
  const publicId = ref.slice(CLD_AUTH_PREFIX.length);
  try {
    await cloudinary.v2.uploader.destroy(publicId, { type: 'authenticated', invalidate: true });
  } catch {
    /* best-effort */
  }
}

function mapVendeurListItem(doc) {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  return redactKycFromPlain(plain);
}

async function attachArticleCounts(vendeurDocs) {
  const ids = vendeurDocs.map((v) => v._id);
  if (!ids.length) return [];
  const agg = await articleModel.aggregate([
    { $match: { vendeur: { $in: ids } } },
    { $group: { _id: '$vendeur', articleCount: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(agg.map((r) => [String(r._id), r.articleCount]));
  return vendeurDocs.map((v) => {
    const row = mapVendeurListItem(v);
    row.articleCount = countMap[String(v._id)] ?? 0;
    return row;
  });
}

// ✅ CRÉER UN NOUVEAU VENDEUR (sdealsapp standard)
export const createVendeur = async (req, res) => {
    try {
        const denied = assertRecensementAgent(req);
        if (denied) {
            cleanupMulterFiles(req.files);
            return res.status(denied.status).json({ error: denied.error });
        }

        const pre = validateVendeurCreateBody({
            body: req.body,
            isAdminUser: isAdmin(req),
            requesterId: req.utilisateur._id.toString(),
        });
        if (!pre.ok) {
            cleanupMulterFiles(req.files);
            return res.status(400).json({ error: pre.errors.join(' ; ') });
        }

        if (isAdmin(req)) {
            const exists = await Utilisateur.exists({ _id: pre.ownerId });
            if (!exists) {
                cleanupMulterFiles(req.files);
                return res.status(404).json({ error: 'Utilisateur introuvable' });
            }
        }

        const dup = await vendeurModel.findOne({ utilisateur: pre.ownerId }).select('_id');
        if (dup) {
            cleanupMulterFiles(req.files);
            return res.status(409).json({ error: 'Un profil vendeur existe déjà pour cet utilisateur' });
        }

        const {
            deliveryZones,
            shippingMethods,
            paymentMethods,
            businessRegistrationNumber,
            businessAddress,
            businessPhone,
            businessEmail,
            returnPolicy,
            warrantyInfo,
            minimumOrderAmount,
            maxOrdersPerDay,
            socialMedia,
            preferredContactMethod,
            tags,
            notes,
            localisation,
        } = req.body;

        const ownerId =
            isAdmin(req) && req.body.utilisateur
                ? req.body.utilisateur
                : isRecensementRequest(req) && req.body.utilisateur
                    ? req.body.utilisateur
                    : req.utilisateur._id.toString();

        let shopLogoUrl = '';
        const verificationDocs = {};
        const newKycRefs = [];

        if (req.files?.shopLogo?.[0]) {
            const result = await cloudinary.v2.uploader.upload(req.files.shopLogo[0].path, {
                folder: 'vendeurs/logos',
            });
            shopLogoUrl = result.secure_url;
            fs.unlinkSync(req.files.shopLogo[0].path);
        }

        for (const field of ['cni1', 'cni2', 'selfie', 'businessLicense', 'taxDocument']) {
            if (req.files?.[field]?.[0]) {
                const { ref } = await uploadKycToCloudinary(
                    req.files[field][0].path,
                    'vendeurs/verification',
                );
                verificationDocs[field] = ref;
                newKycRefs.push(ref);
                fs.unlinkSync(req.files[field][0].path);
            }
        }

        const parsedAddress = parseJsonObjectField(businessAddress);
        const addr = parsedAddress || {
            city: localisation || '',
            country: "Côte d'Ivoire",
        };

        const newVendeur = new vendeurModel({
            utilisateur: new mongoose.Types.ObjectId(ownerId),
            shopName: pre.shopName,
            shopDescription: pre.shopDescription,
            shopLogo: shopLogoUrl || undefined,
            businessType: pre.businessType,
            businessCategories: pre.businessCategories,
            rating: 0,
            completedOrders: 0,
            isTopRated: false,
            isFeatured: false,
            isNew: true,
            responseTime: 24,
            totalEarnings: 0,
            totalSales: 0,
            currentOrders: 0,
            customerSatisfaction: 0,
            returnRate: 0,
            deliveryZones: parseJsonArrayField(deliveryZones).length
                ? parseJsonArrayField(deliveryZones)
                : [addr.city || ''].filter(Boolean),
            shippingMethods: parseJsonArrayField(shippingMethods).length
                ? parseJsonArrayField(shippingMethods)
                : ['Standard'],
            deliveryTimes: { standard: '3-5 jours', express: '1-2 jours' },
            paymentMethods: parseJsonArrayField(paymentMethods).length
                ? parseJsonArrayField(paymentMethods)
                : ['Mobile Money'],
            commissionRate: 5,
            payoutFrequency: 'Mensuelle',
            productCategories: pre.businessCategories,
            totalProducts: 0,
            activeProducts: 0,
            averageProductPrice: 0,
            businessRegistrationNumber,
            businessAddress: addr,
            businessPhone,
            businessEmail,
            returnPolicy: returnPolicy || 'Retour accepté sous 14 jours',
            warrantyInfo,
            minimumOrderAmount: parseFloat(minimumOrderAmount) || 0,
            maxOrdersPerDay: parseInt(maxOrdersPerDay, 10) || 50,
            verificationLevel: 'Basic',
            verificationDocuments: { ...verificationDocs, isVerified: false },
            identityVerified: false,
            businessVerified: false,
            lastActive: new Date(),
            joinedDate: new Date(),
            profileViews: 0,
            conversionRate: 0,
            accountStatus: 'Pending',
            subscriptionType: 'Free',
            premiumFeatures: [],
            socialMedia: parseJsonObjectField(socialMedia) || {},
            promotionalOffers: [],
            preferredContactMethod: preferredContactMethod || 'Email',
            tags: parseJsonArrayField(tags),
            notes,
            statusHistory: [{
                status: 'Pending',
                date: new Date(),
                reason: 'Inscription initiale',
            }],
            status: 'pending',
            source: 'web',
        });

        const recensement = buildRecensementCreateFields(req, { defaultStatus: 'pending' });
        if (recensement.source) newVendeur.source = recensement.source;
        else newVendeur.source = req.body.source || 'web';
        if (recensement.status) newVendeur.status = recensement.status;
        if (recensement.recenseur) newVendeur.recenseur = recensement.recenseur;
        if (recensement.dateRecensement) newVendeur.dateRecensement = recensement.dateRecensement;

        try {
            await newVendeur.save();
        } catch (saveErr) {
            for (const ref of newKycRefs) await destroyKycRef(ref);
            const mapped = mongooseValidationTo400(saveErr);
            if (mapped) return res.status(mapped.status).json({ error: mapped.error });
            throw saveErr;
        }

        const populatedVendeur = await vendeurModel.findById(newVendeur._id)
            .populate('utilisateur', 'nom prenom email telephone photoProfil');

        res.status(201).json(presentProDocForViewer(req, populatedVendeur, res));
    } catch (err) {
        const mapped = mongooseValidationTo400(err);
        if (mapped) return res.status(mapped.status).json({ error: mapped.error });
        console.error("Erreur création vendeur:", err.message);
        res.status(500).json({ error: 'Erreur interne' });
    }
};

// ✅ OBTENIR TOUS LES VENDEURS (avec filtres avancés)
export const getAllVendeurs = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            accountStatus, 
            businessType,
            category,
            city,
            rating,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Construction des filtres
        const filters = applyProPublicFilter(req, {});
        if (businessType) filters.businessType = businessType;
        if (category) filters.businessCategories = { $in: [category] };
        if (city) filters['businessAddress.city'] = { $regex: city, $options: 'i' };
        if (rating) filters.rating = { $gte: parseFloat(rating) };
        
        if (search) {
            const safeSearch = escapeRegex(search);
            filters.$or = [
                { shopName: { $regex: safeSearch, $options: 'i' } },
                { shopDescription: { $regex: safeSearch, $options: 'i' } },
                { tags: { $in: [new RegExp(safeSearch, 'i')] } }
            ];
        }

        // Options de tri
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const vendeurs = await vendeurModel.find(filters)
            .populate('utilisateur', 'nom prenom email telephone photoProfil')
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await vendeurModel.countDocuments(filters);

        const listPayload = isAdmin(req)
            ? await attachArticleCounts(vendeurs)
            : vendeurs.map((v) => mapVendeurListItem(v));

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(200).json({
            vendeurs: listPayload,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error("Erreur récupération vendeurs:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR VENDEUR PAR ID (avec statistiques)
export const getVendeurById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID vendeur invalide' });
        }

        const vendeur = await vendeurModel.findById(id)
            .populate('utilisateur', 'nom prenom email telephone photoProfil')
            .populate('articles'); // Virtual populate

        if (!vendeur) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        if (!canAccessProProfile(req, vendeur)) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        // STAB-12C : incrément atomique sans revalidation complète (legacy enums)
        await vendeurModel.updateOne(
            { _id: id },
            { $inc: { profileViews: 1 } },
        );

        const payload = presentProDocForViewer(req, vendeur, res);
        payload.profileViews = (payload.profileViews || 0) + 1;

        res.status(200).json(payload);
    } catch (err) {
        console.error("Erreur récupération vendeur:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ METTRE À JOUR VENDEUR (moderne)
export const updateVendeur = async (req, res) => {
    try {
        const { id } = req.params;

        const allowed = isAdmin(req)
            ? [...VENDEUR_OWNER_FIELDS, ...VENDEUR_ADMIN_FIELDS]
            : VENDEUR_OWNER_FIELDS;
        const updates = pickFields(stripInjectedKycFromBody(req.body), allowed);

        if (req.files?.shopLogo?.[0]) {
            const result = await cloudinary.v2.uploader.upload(req.files.shopLogo[0].path, {
                folder: 'vendeurs/logos',
            });
            updates.shopLogo = result.secure_url;
            fs.unlinkSync(req.files.shopLogo[0].path);
        }

        const verificationUpdates = {};
        const docFields = ['cni1', 'cni2', 'selfie', 'businessLicense', 'taxDocument'];

        for (const field of docFields) {
            if (req.files?.[field]?.[0]) {
                const { ref } = await prepareKycReplacement(
                    req.files[field][0].path,
                    'vendeurs/verification',
                    null,
                );
                verificationUpdates[`verificationDocuments.${field}`] = ref;
                fs.unlinkSync(req.files[field][0].path);
            }
        }

        JSON_FIELDS.forEach(field => {
            if (updates[field] && typeof updates[field] === 'string') {
                try {
                    updates[field] = JSON.parse(updates[field]);
                } catch (e) {
                    console.warn(`Erreur parsing ${field}:`, e.message);
                }
            }
        });

        if (updates.minimumOrderAmount !== undefined) {
            updates.minimumOrderAmount = parseFloat(updates.minimumOrderAmount) || 0;
        }
        if (updates.maxOrdersPerDay !== undefined) {
            updates.maxOrdersPerDay = parseInt(updates.maxOrdersPerDay, 10) || 50;
        }

        if (isAdmin(req)) {
            if (typeof updates.isTopRated !== 'undefined') {
                updates.isTopRated = updates.isTopRated === true || updates.isTopRated === 'true';
            }
            if (typeof updates.isFeatured !== 'undefined') {
                updates.isFeatured = updates.isFeatured === true || updates.isFeatured === 'true';
            }
            if (typeof updates.isVerified !== 'undefined') {
                updates['verificationDocuments.isVerified'] =
                    updates.isVerified === true || updates.isVerified === 'true';
                delete updates.isVerified;
            }
            if (typeof updates.identityVerified !== 'undefined') {
                updates.identityVerified =
                    updates.identityVerified === true || updates.identityVerified === 'true';
            }
            if (typeof updates.businessVerified !== 'undefined') {
                updates.businessVerified =
                    updates.businessVerified === true || updates.businessVerified === 'true';
            }
        }

        Object.assign(updates, verificationUpdates);
        updates.lastActive = new Date();

        const vendeur = await vendeurModel.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        }).populate('utilisateur', 'nom prenom email telephone');

        if (!vendeur) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        res.status(200).json(presentProDocForViewer(req, vendeur, res));
    } catch (err) {
        const mapped = mongooseValidationTo400(err);
        if (mapped) return res.status(mapped.status).json({ error: mapped.error });
        console.error("Erreur mise à jour vendeur:", err.message);
        res.status(500).json({ error: 'Erreur interne' });
    }
};

// ✅ SUPPRIMER VENDEUR
export const deleteVendeur = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID vendeur invalide' });
        }

        const vendeur = await vendeurModel.findByIdAndDelete(id);

        if (!vendeur) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        res.status(200).json({ message: "Vendeur supprimé avec succès" });
    } catch (err) {
        console.error("Erreur suppression vendeur:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ NOUVELLES MÉTHODES SPÉCIALISÉES SDEALSAPP

// Mettre à jour la note d'un vendeur (admin uniquement — les notes publiques viennent des avis)
export const updateVendeurRating = async (req, res) => {
    try {
        if (!assertAdmin(req, res)) return;

        const { id } = req.params;
        const { rating } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID vendeur invalide' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Note doit être entre 1 et 5' });
        }

        const vendeur = await vendeurModel.findById(id);
        if (!vendeur) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        await vendeur.updateRating(parseFloat(rating));

        res.status(200).json({
            message: 'Note mise à jour avec succès',
            newRating: vendeur.rating,
            isTopRated: vendeur.isTopRated
        });
    } catch (err) {
        console.error("Erreur mise à jour note:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Promouvoir un vendeur (top rated, featured)
export const promoteVendeur = async (req, res) => {
    try {
        const { id } = req.params;
        const { isTopRated, isFeatured } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID vendeur invalide' });
        }

        const updates = {};
        if (typeof isTopRated !== "undefined") updates.isTopRated = isTopRated;
        if (typeof isFeatured !== "undefined") updates.isFeatured = isFeatured;

        const vendeur = await vendeurModel.findByIdAndUpdate(id, updates, { new: true })
            .populate('utilisateur', 'nom prenom');

        if (!vendeur) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        res.status(200).json(vendeur);
    } catch (err) {
        console.error("Erreur promotion vendeur:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Obtenir vendeurs par catégorie
export const getVendeursByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 10, sortBy = 'rating' } = req.query;

        const vendeurs = await vendeurModel.getVendeursByCategory(category);
        
        res.status(200).json(vendeurs.slice(0, parseInt(limit)).map((v) => mapVendeurListItem(v)));
    } catch (err) {
        console.error("Erreur récupération par catégorie:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Recherche avancée de vendeurs
export const searchVendeurs = async (req, res) => {
    try {
        const { query, category, city, minRating, businessType } = req.query;

        let searchCriteria = applyProPublicFilter(req, {});

        if (query) {
            const safeQuery = escapeRegex(query);
            searchCriteria.$or = [
                { shopName: { $regex: safeQuery, $options: 'i' } },
                { shopDescription: { $regex: safeQuery, $options: 'i' } },
                { tags: { $in: [new RegExp(safeQuery, 'i')] } }
            ];
        }

        if (category) searchCriteria.businessCategories = { $in: [category] };
        if (city) searchCriteria['businessAddress.city'] = { $regex: city, $options: 'i' };
        if (minRating) searchCriteria.rating = { $gte: parseFloat(minRating) };
        if (businessType) searchCriteria.businessType = businessType;

        const vendeurs = await vendeurModel.find(searchCriteria)
            .populate('utilisateur', 'nom prenom')
            .sort({ rating: -1, completedOrders: -1 });

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(200).json(vendeurs.map((v) => mapVendeurListItem(v)));
    } catch (err) {
        console.error("Erreur recherche vendeurs:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Obtenir top vendeurs
export const getTopVendeurs = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const topVendeurs = await vendeurModel.getTopRatedVendeurs(parseInt(limit));
        
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(200).json(topVendeurs.map((v) => mapVendeurListItem(v)));
    } catch (err) {
        console.error("Erreur récupération top vendeurs:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Obtenir statistiques vendeur (public uniquement si profil catalogue-visible)
export const getVendeurStats = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID vendeur invalide' });
        }

        const vendeur = await vendeurModel.findById(id).lean();
        if (!vendeur || !canAccessProProfile(req, vendeur)) {
            return res.status(404).json({ error: "Statistiques non trouvées" });
        }

        const stats = await vendeurModel.getVendeurStats(id);
        
        if (!stats || stats.length === 0) {
            return res.status(404).json({ error: "Statistiques non trouvées" });
        }

        res.status(200).json(stats[0]);
    } catch (err) {
        console.error("Erreur statistiques vendeur:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Changer statut vendeur
export const changeVendeurStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason, updatedBy } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID vendeur invalide' });
        }

        const validStatuses = ['Active', 'Suspended', 'Pending', 'Banned'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Statut invalide' });
        }

        const vendeur = await vendeurModel.findById(id);
        if (!vendeur) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        await vendeur.changeStatus(status, reason, updatedBy);

        res.status(200).json({
            message: 'Statut mis à jour avec succès',
            vendeur
        });
    } catch (err) {
        console.error("Erreur changement statut:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// 🆕 OPTION C - Récupérer les vendeurs en attente
export const getPendingVendeurs = async (req, res) => {
    try {
        const vendeurs = await vendeurModel.find({ status: "pending" })
            .populate("utilisateur")
            .populate("recenseur", "nom prenom telephone")
            .sort({ dateRecensement: -1 });

        const safe = vendeurs.map((p) => presentVendeurPendingListItem(p));
        res.status(200).json(safe);
    } catch (err) {
        console.error("Erreur récupération vendeurs pending:", err.message);
        res.status(500).json({ error: 'Erreur interne' });
    }
};

// 🆕 OPTION C - Valider un vendeur
export const validateVendeur = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;

        const vendeur = await vendeurModel.findById(id);
        
        if (!vendeur) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        if (vendeur.status !== 'pending') {
            return res.status(400).json({ error: "Vendeur déjà traité" });
        }

        vendeur.status = 'active';
        vendeur.accountStatus = 'Active';
        vendeur.verificationDocuments.isVerified = true;
        vendeur.identityVerified = true;
        vendeur.validePar = adminId;
        vendeur.dateValidation = new Date();

        await vendeur.save();

        const populatedVendeur = await vendeurModel.findById(id)
            .populate("utilisateur")
            .populate("recenseur", "nom prenom");

        res.status(200).json({
            success: true,
            message: "Vendeur validé avec succès",
            vendeur: populatedVendeur
        });
    } catch (err) {
        console.error("Erreur validation vendeur:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// 🆕 OPTION C - Rejeter un vendeur
export const rejectVendeur = async (req, res) => {
    try {
        const { id } = req.params;
        const { motif } = req.body;
        const adminId = req.user._id;

        const vendeur = await vendeurModel.findById(id);
        
        if (!vendeur) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        if (vendeur.status !== 'pending') {
            return res.status(400).json({ error: "Vendeur déjà traité" });
        }

        vendeur.status = 'rejected';
        vendeur.accountStatus = 'Suspended';
        vendeur.motifRejet = motif || 'Non spécifié';
        vendeur.validePar = adminId;
        vendeur.dateValidation = new Date();

        await vendeur.save();

        res.status(200).json({
            success: true,
            message: "Vendeur rejeté",
            vendeur
        });
    } catch (err) {
        console.error("Erreur rejet vendeur:", err.message);
        res.status(500).json({ error: err.message });
    }
};
