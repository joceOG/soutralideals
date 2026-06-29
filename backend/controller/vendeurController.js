import mongoose from 'mongoose';
import vendeurModel from "../models/vendeurModel.js";
import cloudinary from 'cloudinary';
import fs from 'fs';
<<<<<<< HEAD
<<<<<<< HEAD
import { applyProPublicFilter, canAccessProProfile } from "../utils/proPublicFilter.js";
=======
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
import { applyProPublicFilter, canAccessProProfile } from "../utils/proPublicFilter.js";
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ CRÉER UN NOUVEAU VENDEUR (sdealsapp standard)
export const createVendeur = async (req, res) => {
    try {
        const {
            utilisateur,
            // 🏪 Informations boutique
            shopName,
            shopDescription,
            businessType,
            businessCategories,
            // 🚚 Livraison
            deliveryZones,
            shippingMethods,
            // 💳 Paiements
            paymentMethods,
            commissionRate,
            payoutFrequency,
            // 🏢 Informations légales
            businessRegistrationNumber,
            businessAddress,
            businessPhone,
            businessEmail,
            // 📊 Politiques
            returnPolicy,
            warrantyInfo,
            minimumOrderAmount,
            maxOrdersPerDay,
            // 🌐 Réseaux sociaux
            socialMedia,
            preferredContactMethod,
            tags,
            notes,
            // Backwards compatibility
            localisation,
            zonedelivraison
        } = req.body;

        // ✅ VALIDATION OBLIGATOIRE
        if (!utilisateur || !shopName || !shopDescription || !businessType) {
            return res.status(400).json({ 
                error: 'Utilisateur, nom boutique, description et type business requis' 
            });
        }

        // ✅ UPLOAD FICHIERS CLOUDINARY
        const uploads = {};
        
        // Upload logo boutique
        if (req.files?.shopLogo?.[0]) {
            const result = await cloudinary.v2.uploader.upload(req.files.shopLogo[0].path, {
                folder: 'vendeurs/logos',
            });
            uploads.shopLogo = result.secure_url;
            fs.unlinkSync(req.files.shopLogo[0].path);
        }

        // Upload documents de vérification
        const verificationDocs = {};
        const docFields = ['cni1', 'cni2', 'selfie', 'businessLicense', 'taxDocument'];
        
        for (const field of docFields) {
            if (req.files?.[field]?.[0]) {
                const result = await cloudinary.v2.uploader.upload(req.files[field][0].path, {
                    folder: `vendeurs/verification`,
                });
                verificationDocs[field] = result.secure_url;
                fs.unlinkSync(req.files[field][0].path);
            }
        }

        // ✅ CRÉER VENDEUR AVEC MODÈLE MODERNE
        const newVendeur = new vendeurModel({
            // Référence utilisateur
            utilisateur: new mongoose.Types.ObjectId(utilisateur),
            
            // 🏪 Informations boutique
            shopName,
            shopDescription,
            shopLogo: uploads.shopLogo,
            businessType,
            businessCategories: businessCategories ? JSON.parse(businessCategories) : [],
            
            // ⭐ Système de notation (initialisé)
            rating: 0,
            completedOrders: 0,
            isTopRated: false,
            isFeatured: false,
            isNew: true,
            responseTime: 24,
            
            // 💰 Statistiques business (initialisées)
            totalEarnings: 0,
            totalSales: 0,
            currentOrders: 0,
            customerSatisfaction: 0,
            returnRate: 0,
            
            // 🚚 Livraison & logistique
            deliveryZones: deliveryZones ? JSON.parse(deliveryZones) : [localisation || businessAddress?.city || ''],
            shippingMethods: shippingMethods ? JSON.parse(shippingMethods) : ['Standard'],
            deliveryTimes: {
                standard: '3-5 jours',
                express: '1-2 jours'
            },
            
            // 💳 Paiements
            paymentMethods: paymentMethods ? JSON.parse(paymentMethods) : ['Mobile Money'],
            commissionRate: parseFloat(commissionRate) || 5,
            payoutFrequency: payoutFrequency || 'Mensuelle',
            
            // 📦 Produits (initialisés)
            productCategories: businessCategories ? JSON.parse(businessCategories) : [],
            totalProducts: 0,
            activeProducts: 0,
            averageProductPrice: 0,
            
            // 🏢 Informations légales
            businessRegistrationNumber,
            businessAddress: businessAddress ? JSON.parse(businessAddress) : {
                city: localisation || '',
                country: 'Cameroun'
            },
            businessPhone,
            businessEmail,
            
            // 📊 Politiques
            returnPolicy: returnPolicy || 'Retour accepté sous 14 jours',
            warrantyInfo,
            minimumOrderAmount: parseFloat(minimumOrderAmount) || 0,
            maxOrdersPerDay: parseInt(maxOrdersPerDay) || 50,
            
            // 🔐 Vérification
            verificationLevel: 'Basic',
            verificationDocuments: {
                ...verificationDocs,
                isVerified: false
            },
            identityVerified: false,
            businessVerified: false,
            
            // 📈 Activité
            lastActive: new Date(),
            joinedDate: new Date(),
            profileViews: 0,
            conversionRate: 0,
            
            // ⚙️ Statut compte
            accountStatus: 'Pending',
            subscriptionType: 'Free',
            premiumFeatures: [],
            
            // 🌐 Réseaux sociaux
            socialMedia: socialMedia ? JSON.parse(socialMedia) : {},
            promotionalOffers: [],
            preferredContactMethod: preferredContactMethod || 'Email',
            
            // 🏷️ Métadonnées
            tags: tags ? JSON.parse(tags) : [],
            notes,
            
            // 🔄 Historique
            statusHistory: [{
                status: 'Pending',
                date: new Date(),
                reason: 'Inscription initiale'
<<<<<<< HEAD
<<<<<<< HEAD
            }],
            status: 'pending',
            source: req.body.source || 'web',
=======
            }]
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
            }],
            status: 'pending',
            source: req.body.source || 'web',
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
        });

        await newVendeur.save();
        
        // ✅ POPULER POUR LA RÉPONSE
        const populatedVendeur = await vendeurModel.findById(newVendeur._id)
            .populate('utilisateur', 'nom prenom email telephone photoProfil');
        
        res.status(201).json(populatedVendeur);
    } catch (err) {
        console.error("Erreur création vendeur:", err.message);
        res.status(500).json({ error: err.message });
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
<<<<<<< HEAD
<<<<<<< HEAD
        const filters = applyProPublicFilter(req, {});
=======
        const filters = {};
        if (accountStatus) filters.accountStatus = accountStatus;
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        const filters = applyProPublicFilter(req, {});
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
        if (businessType) filters.businessType = businessType;
        if (category) filters.businessCategories = { $in: [category] };
        if (city) filters['businessAddress.city'] = { $regex: city, $options: 'i' };
        if (rating) filters.rating = { $gte: parseFloat(rating) };
        
        if (search) {
            filters.$or = [
                { shopName: { $regex: search, $options: 'i' } },
                { shopDescription: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
<<<<<<< HEAD
<<<<<<< HEAD
=======
        if (req.query.utilisateur) {
            filters.utilisateur = req.query.utilisateur;
        }
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

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

        // ✅ S'assurer que l'encodage est UTF-8 au niveau de la réponse
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(200).json({
            vendeurs,
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

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
        if (!canAccessProProfile(req, vendeur)) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

<<<<<<< HEAD
=======
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
        // Incrémenter les vues de profil
        vendeur.profileViews += 1;
        await vendeur.save();

        res.status(200).json(vendeur);
    } catch (err) {
        console.error("Erreur récupération vendeur:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ METTRE À JOUR VENDEUR (moderne)
export const updateVendeur = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID vendeur invalide' });
        }

        // ✅ UPLOAD NOUVEAU LOGO SI PRÉSENT
        if (req.files?.shopLogo?.[0]) {
            const result = await cloudinary.v2.uploader.upload(req.files.shopLogo[0].path, {
                folder: 'vendeurs/logos',
            });
            updates.shopLogo = result.secure_url;
            fs.unlinkSync(req.files.shopLogo[0].path);
        }

        // ✅ UPLOAD NOUVEAUX DOCUMENTS
        const verificationUpdates = {};
        const docFields = ['cni1', 'cni2', 'selfie', 'businessLicense', 'taxDocument'];
        
        for (const field of docFields) {
            if (req.files?.[field]?.[0]) {
                const result = await cloudinary.v2.uploader.upload(req.files[field][0].path, {
                    folder: 'vendeurs/verification',
                });
                verificationUpdates[`verificationDocuments.${field}`] = result.secure_url;
                fs.unlinkSync(req.files[field][0].path);
            }
        }

        // Traitement des champs JSON
        const fieldsToParseJSON = ['businessCategories', 'deliveryZones', 'shippingMethods', 'paymentMethods', 'businessAddress', 'socialMedia', 'tags'];
        fieldsToParseJSON.forEach(field => {
            if (updates[field] && typeof updates[field] === 'string') {
                try {
                    updates[field] = JSON.parse(updates[field]);
                } catch (e) {
                    console.warn(`Erreur parsing ${field}:`, e.message);
                }
            }
        });

        // Fusionner les updates de vérification
        Object.assign(updates, verificationUpdates);
        updates.lastActive = new Date();

        const vendeur = await vendeurModel.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
        }).populate('utilisateur', 'nom prenom email telephone');

        if (!vendeur) {
            return res.status(404).json({ error: "Vendeur non trouvé" });
        }

        res.status(200).json(vendeur);
    } catch (err) {
        console.error("Erreur mise à jour vendeur:", err.message);
        res.status(500).json({ error: err.message });
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

// Mettre à jour la note d'un vendeur
export const updateVendeurRating = async (req, res) => {
    try {
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
        
        res.status(200).json(vendeurs.slice(0, parseInt(limit)));
    } catch (err) {
        console.error("Erreur récupération par catégorie:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Recherche avancée de vendeurs
export const searchVendeurs = async (req, res) => {
    try {
        const { query, category, city, minRating, businessType } = req.query;

<<<<<<< HEAD
<<<<<<< HEAD
        let searchCriteria = applyProPublicFilter(req, {});
=======
        let searchCriteria = { accountStatus: 'Active' };
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        let searchCriteria = applyProPublicFilter(req, {});
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

        if (query) {
            searchCriteria.$or = [
                { shopName: { $regex: query, $options: 'i' } },
                { shopDescription: { $regex: query, $options: 'i' } },
                { tags: { $in: [new RegExp(query, 'i')] } }
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
        res.status(200).json(vendeurs);
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
        res.status(200).json(topVendeurs);
    } catch (err) {
        console.error("Erreur récupération top vendeurs:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// Obtenir statistiques vendeur
export const getVendeurStats = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID vendeur invalide' });
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
<<<<<<< HEAD
<<<<<<< HEAD
        const vendeurs = await vendeurModel.find({ status: "pending" })
=======
        const vendeurs = await vendeurModel.find({ 
            status: 'pending',
            source: 'sdealsidentification'
        })
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        const vendeurs = await vendeurModel.find({ status: "pending" })
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
            .populate("utilisateur")
            .populate("recenseur", "nom prenom telephone")
            .sort({ dateRecensement: -1 });

        res.status(200).json(vendeurs);
    } catch (err) {
        console.error("Erreur récupération vendeurs pending:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// 🆕 OPTION C - Valider un vendeur
export const validateVendeur = async (req, res) => {
    try {
        const { id } = req.params;
<<<<<<< HEAD
<<<<<<< HEAD
        const adminId = req.user._id;
=======
        const adminId = req.body.adminId || req.user?._id;
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        const adminId = req.user._id;
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

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
<<<<<<< HEAD
<<<<<<< HEAD
        const adminId = req.user._id;
=======
        const adminId = req.body.adminId || req.user?._id;
>>>>>>> 9f1908c (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        const adminId = req.user._id;
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

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
