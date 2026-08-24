/**
 * STAB-11 — service appliquant la politique Commande (REST + Socket).
 */
import commandeModel from '../models/commandeModel.js';
import vendeurModel from '../models/vendeurModel.js';
import {
  assertOrderStatusChange,
  normalizeOrderStatus,
  resolveOrderActor,
  OrderStatusPolicyError,
} from '../utils/orderStatusPolicy.js';

async function findVendeurProfileId(userId) {
  if (!userId) return null;
  const v = await vendeurModel.findOne({ utilisateur: userId }).select('_id');
  return v?._id?.toString() || null;
}

/**
 * Applique une transition de statut avec validators Mongoose.
 *
 * @param {object} opts
 * @param {string} opts.orderId
 * @param {string} opts.targetStatus
 * @param {{ _id: any, role: string }} opts.user
 * @returns {Promise<object>} commande mise à jour
 */
export async function applyOrderStatusChange({ orderId, targetStatus, user }) {
  const commande = await commandeModel.findById(orderId);
  if (!commande) {
    throw new OrderStatusPolicyError('Commande introuvable', 404);
  }

  const vendeurProfileId = await findVendeurProfileId(user._id);
  const actor = resolveOrderActor({
    user,
    commande,
    vendeurProfileId,
  });

  if (actor === 'OTHER') {
    throw new OrderStatusPolicyError(
      'Non autorisé à modifier le statut de cette commande.',
      403,
    );
  }

  const target = normalizeOrderStatus(targetStatus);
  if (!target) {
    throw new OrderStatusPolicyError(
      'Statut de commande inconnu ou non autorisé.',
      400,
    );
  }

  assertOrderStatusChange({
    currentStatus: commande.statusCommande,
    targetStatus: target,
    actor,
  });

  commande.statusCommande = target;
  await commande.save(); // exécute validators enum Mongoose

  return commande;
}

export { OrderStatusPolicyError };
