import promotionModel from '../models/promotionModel.js';
import mongoose from 'mongoose';

// ✅ CRÉER UNE NOUVELLE PROMOTION
export const createPromotion = async (req, res) => {
    try {
        const {
            titre,
            description,
            typeCiblage,
            cibles,
            cibleModel,
            typeOffre,
            valeurOffre,
            montantMinimum,
            dateDebut,
            dateFin,
            image,
            couleur,
            createur
        } = req.body;

        // Validation des données requises
        if (!titre || !description || !typeOffre || !valeurOffre || !dateDebut || !dateFin) {
            return res.status(400).json({ 
                error: 'Titre, description, type d\'offre, valeur, date début et fin sont requis' 
            });
        }

        // Validation des dates
        if (new Date(dateDebut) >= new Date(dateFin)) {
            return res.status(400).json({ 
                error: 'La date de début doit être antérieure à la date de fin' 
            });
        }

        const nouvellePromotion = new promotionModel({
            titre,
            description,
            typeCiblage: typeCiblage || 'TOUS',
            cibles: cibles || [],
            cibleModel,
            typeOffre,
            valeurOffre,
            montantMinimum: montantMinimum || 0,
            dateDebut: new Date(dateDebut),
            dateFin: new Date(dateFin),
            image,
            couleur: couleur || '#FF6B6B',
            createur: mongoose.Types.ObjectId(createur)
        });

        await nouvellePromotion.save();

        res.status(201).json(nouvellePromotion);
    } catch (err) {
        console.error('Erreur création promotion:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR TOUTES LES PROMOTIONS
export const getAllPromotions = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            statut, 
            typeCiblage,
            dateDebut,
            dateFin,
            createur
        } = req.query;

        // Construction des filtres
        const filters = {};
        if (statut) filters.statut = statut;
        if (typeCiblage) filters.typeCiblage = typeCiblage;
        if (createur) filters.createur = mongoose.Types.ObjectId(createur);
        
        if (dateDebut && dateFin) {
            filters.dateDebut = {
                $gte: new Date(dateDebut),
                $lte: new Date(dateFin)
            };
        }

        const promotions = await promotionModel.find(filters)
            .populate('createur', 'nom prenom email')
            .populate('cibles')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await promotionModel.countDocuments(filters);

        res.status(200).json({
            promotions,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error('Erreur récupération promotions:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR LES PROMOTIONS ACTIVES
export const getPromotionsActives = async (req, res) => {
    try {
        const promotions = await promotionModel.getPromotionsActives();
        res.status(200).json(promotions);
    } catch (err) {
        console.error('Erreur récupération promotions actives:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR UNE PROMOTION PAR ID
export const getPromotionById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de promotion invalide' });
        }

        const promotion = await promotionModel.findById(id)
            .populate('createur', 'nom prenom email')
            .populate('cibles');
        
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion non trouvée' });
        }
        
        res.status(200).json(promotion);
    } catch (err) {
        console.error('Erreur récupération promotion:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ METTRE À JOUR UNE PROMOTION
export const updatePromotion = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de promotion invalide' });
        }

        // Ajouter l'historique des modifications
        const promotion = await promotionModel.findById(id);
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion non trouvée' });
        }

        // Enregistrer l'ancienne valeur
        const ancienneValeur = { ...promotion.toObject() };

        // Mise à jour
        const promotionMiseAJour = await promotionModel.findByIdAndUpdate(
            id, 
            { 
                ...updates, 
                $push: {
                    historiqueModifications: {
                        date: new Date(),
                        utilisateur: req.user?.id || null,
                        action: 'MODIFICATION',
                        ancienneValeur,
                        nouvelleValeur: updates
                    }
                }
            },
            { new: true, runValidators: true }
        );

        res.status(200).json(promotionMiseAJour);
    } catch (err) {
        console.error('Erreur mise à jour promotion:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ SUPPRIMER UNE PROMOTION
export const deletePromotion = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de promotion invalide' });
        }

        const promotion = await promotionModel.findByIdAndDelete(id);
        
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion non trouvée' });
        }
        
        res.status(200).json({ message: 'Promotion supprimée avec succès' });
    } catch (err) {
        console.error('Erreur suppression promotion:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ STATISTIQUES PROMOTIONS
export const getPromotionStats = async (req, res) => {
    try {
        const { dateDebut, dateFin } = req.query;
        
        const stats = await promotionModel.getStatsPromotions(dateDebut, dateFin);
        
        const totalPromotions = await promotionModel.countDocuments();
        const promotionsActives = await promotionModel.countDocuments({ statut: 'ACTIVE' });
        
        res.status(200).json({
            statsParStatut: stats,
            totalPromotions,
            promotionsActives
        });
    } catch (err) {
        console.error('Erreur statistiques promotions:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ INCRÉMENTER LES VUES
export const incrementerVues = async (req, res) => {
    try {
        const { id } = req.params;
        
        const promotion = await promotionModel.findById(id);
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion non trouvée' });
        }
        
        await promotion.incrementerVues();
        res.status(200).json({ message: 'Vue incrémentée' });
    } catch (err) {
        console.error('Erreur incrémentation vues:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ INCRÉMENTER LES CLICS
export const incrementerClics = async (req, res) => {
    try {
        const { id } = req.params;
        
        const promotion = await promotionModel.findById(id);
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion non trouvée' });
        }
        
        await promotion.incrementerClics();
        res.status(200).json({ message: 'Clic incrémenté' });
    } catch (err) {
        console.error('Erreur incrémentation clics:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ INCRÉMENTER LES CONVERSIONS
export const incrementerConversions = async (req, res) => {
    try {
        const { id } = req.params;
        
        const promotion = await promotionModel.findById(id);
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion non trouvée' });
        }
        
        await promotion.incrementerConversions();
        res.status(200).json({ message: 'Conversion incrémentée' });
    } catch (err) {
        console.error('Erreur incrémentation conversions:', err.message);
        res.status(500).json({ error: err.message });
    }
};
