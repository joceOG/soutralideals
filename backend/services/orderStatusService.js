/**
 * STAB-11 / DASH-8E.3B — service appliquant la politique Commande (REST + Socket).
 */
import commandeModel from '../models/commandeModel.js';
import {
  authorizeCommandeOperation,
  CommandeAuthorizationError,
  findVendeurProfileIdForUser,
} from './commandeAuthorizationService.js';
import { normalizeOrderStatus } from '../utils/orderStatusPolicy.js';

export class OrderStatusPolicyError extends Error {
  constructor(message, statusCode = 400, code = 'ORDER_STATUS_POLICY') {
    super(message);
    this.name = 'OrderStatusPolicyError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.orderId
 * @param {string} opts.targetStatus
 * @param {{ _id: any, role: string }} opts.user
 */
export async function applyOrderStatusChange({ orderId, targetStatus, user }) {
  const commande = await commandeModel.findById(orderId);
  if (!commande) {
    throw new OrderStatusPolicyError('Commande introuvable', 404);
  }

  try {
    await authorizeCommandeOperation({
      utilisateur: user,
      commande,
      operation: 'changeStatus',
      payload: { statusCommande: targetStatus },
    });
  } catch (err) {
    if (err instanceof CommandeAuthorizationError) {
      throw new OrderStatusPolicyError(err.message, err.httpStatus, err.code);
    }
    throw err;
  }

  const target = normalizeOrderStatus(targetStatus);
  commande.statusCommande = target;
  await commande.save();

  return commande;
}

export { findVendeurProfileIdForUser };
