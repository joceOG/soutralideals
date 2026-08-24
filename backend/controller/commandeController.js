import commandeModel from '../models/commandeModel.js';
import mongoose from 'mongoose';
import { assertOwnerOrAdmin, assertAdmin, isAdmin, isOwnerOrAdmin } from '../utils/accessControl.js';
import {
  applyOrderStatusChange,
  OrderStatusPolicyError,
} from '../services/orderStatusService.js';

const COMMANDE_UPDATE_WHITELIST = [
  'dateLivraison',
  'notesClient',
  'infoCommande',
];

async function loadCommandeOr404(id, res) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'ID de commande invalide' });
    return null;
  }
  const commande = await commandeModel.findById(id);
  if (!commande) {
    res.status(404).json({ error: 'Commande non trouvée' });
    return null;
  }
  return commande;
}

function assertCommandeAccess(req, res, commande) {
  const ownerId = commande.utilisateur?.toString();
  if (ownerId && isOwnerOrAdmin(req, ownerId)) return true;
  if (!ownerId && isAdmin(req)) return true;
  res.status(403).json({ error: 'Accès refusé : commande d\'un autre utilisateur.' });
  return false;
}

function pickAllowedUpdates(body, isAdminUser) {
  const allowed = isAdminUser
    ? [...COMMANDE_UPDATE_WHITELIST, 'prixTotal', 'prixArticles', 'prixLivraison', 'paiementInfo']
    : COMMANDE_UPDATE_WHITELIST;
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  return updates;
}

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
            dateLivraison,
            vendeur,
        } = req.body;

        if (!infoCommande || !articles || articles.length === 0) {
            return res.status(400).json({ error: 'Informations de commande et articles requis' });
        }

        // STAB-11 : statut initial forcé serveur (ignorer status client)
        const newCommande = new commandeModel({
            utilisateur: req.utilisateur._id,
            vendeur: vendeur || undefined,
            infoCommande,
            articles,
            paiementInfo,
            datePaie,
            prixArticles: prixArticles || 0,
            prixLivraison: prixLivraison || 0,
            prixTotal: prixTotal || (prixArticles + prixLivraison),
            statusCommande: 'En cours',
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
        const { page = 1, limit = 10, status, dateDebut, dateFin, utilisateur } = req.query;

        const filters = {};
        if (status) filters.statusCommande = status;
        if (dateDebut && dateFin) {
            filters.dateCreation = {
                $gte: new Date(dateDebut),
                $lte: new Date(dateFin)
            };
        }

        if (isAdmin(req)) {
            if (utilisateur) filters.utilisateur = utilisateur;
        } else {
            filters.utilisateur = req.utilisateur._id;
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

export const getCommandeById = async (req, res) => {
    try {
        const commande = await loadCommandeOr404(req.params.id, res);
        if (!commande) return;
        if (!assertCommandeAccess(req, res, commande)) return;
        res.status(200).json(commande);
    } catch (err) {
        console.error('Erreur récupération commande:', err.message);
        res.status(500).json({ error: err.message });
    }
};

export const updateCommande = async (req, res) => {
    try {
        const commande = await loadCommandeOr404(req.params.id, res);
        if (!commande) return;

        // STAB-11 : changement de statut via politique centralisée (même que Socket)
        if (req.body.statusCommande !== undefined) {
            try {
                const updated = await applyOrderStatusChange({
                    orderId: req.params.id,
                    targetStatus: req.body.statusCommande,
                    user: req.utilisateur,
                });
                // Autres champs non-statut éventuels
                const other = pickAllowedUpdates(req.body, isAdmin(req));
                if (Object.keys(other).length > 0) {
                    Object.assign(updated, other);
                    await updated.save();
                }
                return res.status(200).json(updated);
            } catch (err) {
                if (err instanceof OrderStatusPolicyError) {
                    return res.status(err.statusCode || 400).json({ error: err.message });
                }
                throw err;
            }
        }

        if (!assertCommandeAccess(req, res, commande)) return;

        const updates = pickAllowedUpdates(req.body, isAdmin(req));
        updates.dateModification = new Date();

        const updated = await commandeModel.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json(updated);
    } catch (err) {
        console.error('Erreur mise à jour commande:', err.message);
        res.status(500).json({ error: err.message });
    }
};

export const deleteCommande = async (req, res) => {
    try {
        const commande = await loadCommandeOr404(req.params.id, res);
        if (!commande) return;
        if (!assertCommandeAccess(req, res, commande)) return;

        await commandeModel.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Commande supprimée avec succès' });
    } catch (err) {
        console.error('Erreur suppression commande:', err.message);
        res.status(500).json({ error: err.message });
    }
};

export const getCommandeStats = async (req, res) => {
    try {
        if (!assertAdmin(req, res)) return;

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
