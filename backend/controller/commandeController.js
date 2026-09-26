import commandeModel from '../models/commandeModel.js';
import mongoose from 'mongoose';
import { assertOwnerOrAdmin, assertAdmin, isAdmin, isOwnerOrAdmin } from '../utils/accessControl.js';
import {
  authorizeCommandeOperation,
  pickCommandeUpdates,
  CommandeAuthorizationError,
  assertNoImmutableCommandeFieldsInPayload,
  resolveCommandeActor,
} from '../services/commandeAuthorizationService.js';
import {
  applyOrderStatusChange,
  OrderStatusPolicyError,
} from '../services/orderStatusService.js';
import {
  createOrderFromClientPayload,
  formatPublicCommandeResponse,
  OrderCreationError,
} from '../services/commandeCreationService.js';

function sendOrderCreationError(res, err) {
  if (err instanceof OrderCreationError) {
    return res.status(err.httpStatus).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }
  return null;
}

const COMMANDE_UPDATE_WHITELIST = [
  'dateLivraison',
  'notesClient',
  'infoCommande',
];

function sendCommandeAuthError(res, err) {
  if (err instanceof CommandeAuthorizationError) {
    return res.status(err.httpStatus).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }
  return null;
}

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

async function assertCommandeAccess(req, res, commande) {
  const actor = await resolveCommandeActor(req.utilisateur, commande);
  if (actor === 'admin' || actor === 'client' || actor === 'vendeur') return true;
  res.status(403).json({
    success: false,
    code: 'RESOURCE_ACCESS_FORBIDDEN',
    message: 'Accès refusé à cette commande.',
  });
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

// ✅ CRÉER UNE NOVELLE COMMANDE (DASH-8E.3B.1 — dérivation serveur)
export const createCommande = async (req, res) => {
    try {
        if (!req.utilisateur?._id) {
            return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Authentification requise.' });
        }

        const commande = await createOrderFromClientPayload({
            utilisateurId: req.utilisateur._id,
            body: req.body,
        });

        res.status(201).json(formatPublicCommandeResponse(commande));
    } catch (err) {
        const sent = sendOrderCreationError(res, err);
        if (sent) return sent;
        const sentAuth = sendCommandeAuthError(res, err);
        if (sentAuth) return sentAuth;
        console.error('Erreur création commande:', err.message);
        res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Erreur serveur.' });
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

        assertNoImmutableCommandeFieldsInPayload(req.body);

        if (req.body.statusCommande !== undefined) {
            try {
                const updated = await applyOrderStatusChange({
                    orderId: req.params.id,
                    targetStatus: req.body.statusCommande,
                    user: req.utilisateur,
                });
                const auth = await authorizeCommandeOperation({
                  utilisateur: req.utilisateur,
                  commande: updated,
                  operation: 'updateFields',
                  payload: req.body,
                });
                const other = pickCommandeUpdates(req.body, auth.allowedFields);
                if (Object.keys(other).length > 0) {
                    Object.assign(updated, other);
                    updated.dateModification = new Date();
                    await updated.save();
                }
                return res.status(200).json(updated);
            } catch (err) {
                if (err instanceof OrderStatusPolicyError) {
                    return res.status(err.statusCode || 400).json({
                      success: false,
                      code: err.code || 'INVALID_COMMANDE_STATUS_TRANSITION',
                      message: err.message,
                    });
                }
                const sent = sendCommandeAuthError(res, err);
                if (sent) return sent;
                throw err;
            }
        }

        try {
          const auth = await authorizeCommandeOperation({
            utilisateur: req.utilisateur,
            commande,
            operation: 'updateFields',
            payload: req.body,
          });
          const updates = pickCommandeUpdates(req.body, auth.allowedFields);
          updates.dateModification = new Date();

          const updated = await commandeModel.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true },
          );

          return res.status(200).json(updated);
        } catch (err) {
          const sent = sendCommandeAuthError(res, err);
          if (sent) return sent;
          throw err;
        }
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
