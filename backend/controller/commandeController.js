import commandeModel from '../models/commandeModel.js';
import mongoose from 'mongoose';

// ✅ CRÉER UNE NOUVELLE COMMANDE
export const createCommande = async (req, res) => {
    try {
        const {
            infoCommande,
            articles,
            paiementInfo,
            datePaie,
            prixArticles,
            prixLivraison,
            prixTotal,
            statusCommande,
            dateLivraison
        } = req.body;

        // Validation des données
        if (!infoCommande || !articles || articles.length === 0) {
            return res.status(400).json({ error: 'Informations de commande et articles requis' });
        }

        const newCommande = new commandeModel({
            infoCommande,
            articles,
            paiementInfo,
            datePaie,
            prixArticles: prixArticles || 0,
            prixLivraison: prixLivraison || 0,
            prixTotal: prixTotal || (prixArticles + prixLivraison),
            statusCommande: statusCommande || 'En cours',
            dateLivraison
        });

        await newCommande.save();
        res.status(201).json(newCommande);
    } catch (err) {
        console.error('Erreur création commande:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR TOUTES LES COMMANDES
export const getAllCommandes = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, dateDebut, dateFin } = req.query;
        
        // Filtres dynamiques
        const filters = {};
        if (status) filters.statusCommande = status;
        if (dateDebut && dateFin) {
            filters.dateCreation = {
                $gte: new Date(dateDebut),
                $lte: new Date(dateFin)
            };
        }

        const commandes = await commandeModel.find(filters)
            .sort({ dateCreation: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await commandeModel.countDocuments(filters);

        res.status(200).json({
            commandes,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error('Erreur récupération commandes:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ OBTENIR UNE COMMANDE PAR ID
export const getCommandeById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de commande invalide' });
        }

        const commande = await commandeModel.findById(id);
        
        if (!commande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        
        res.status(200).json(commande);
    } catch (err) {
        console.error('Erreur récupération commande:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ METTRE À JOUR UNE COMMANDE
export const updateCommande = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de commande invalide' });
        }

        // Mise à jour avec validation
        const commande = await commandeModel.findByIdAndUpdate(
            id, 
            { ...updates, dateModification: new Date() },
            { new: true, runValidators: true }
        );

        if (!commande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        res.status(200).json(commande);
    } catch (err) {
        console.error('Erreur mise à jour commande:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ SUPPRIMER UNE COMMANDE
export const deleteCommande = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de commande invalide' });
        }

        const commande = await commandeModel.findByIdAndDelete(id);
        
        if (!commande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        
        res.status(200).json({ message: 'Commande supprimée avec succès' });
    } catch (err) {
        console.error('Erreur suppression commande:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ STATISTIQUES COMMANDES
export const getCommandeStats = async (req, res) => {
    try {
        const stats = await commandeModel.aggregate([
            {
                $group: {
                    _id: '$statusCommande',
                    count: { $sum: 1 },
                    totalRevenu: { $sum: '$prixTotal' }
                }
            }
        ]);

        const totalCommandes = await commandeModel.countDocuments();
        const revenueTotal = await commandeModel.aggregate([
            { $group: { _id: null, total: { $sum: '$prixTotal' } } }
        ]);

        res.status(200).json({
            statsParStatus: stats,
            totalCommandes,
            revenueTotal: revenueTotal[0]?.total || 0
        });
    } catch (err) {
        console.error('Erreur statistiques commandes:', err.message);
        res.status(500).json({ error: err.message });
    }
};