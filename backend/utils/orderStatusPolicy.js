/**
 * STAB-11 — Politique centralisée des transitions de statut Commande (É-marché).
 * REST et Socket DOIVENT appeler assertOrderStatusChange.
 *
 * Statuts réels (commandeModel) :
 * En cours | Confirmée | En préparation | Expédiée | Livrée | Annulée
 */

export const ORDER_STATUSES = Object.freeze([
  'En cours',
  'Confirmée',
  'En préparation',
  'Expédiée',
  'Livrée',
  'Annulée',
]);

/** Transitions autorisées par acteur (hors admin). */
const CLIENT_TRANSITIONS = Object.freeze({
  'En cours': ['Annulée'],
  Confirmée: ['Annulée'],
});

const VENDEUR_TRANSITIONS = Object.freeze({
  'En cours': ['Confirmée', 'Annulée'],
  Confirmée: ['En préparation', 'Annulée'],
  'En préparation': ['Expédiée', 'Annulée'],
  Expédiée: ['Livrée'],
});

export class OrderStatusPolicyError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'OrderStatusPolicyError';
    this.statusCode = statusCode;
    this.code = 'ORDER_STATUS_POLICY';
  }
}

export function normalizeOrderStatus(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  return ORDER_STATUSES.includes(s) ? s : null;
}

export function isKnownOrderStatus(raw) {
  return normalizeOrderStatus(raw) != null;
}

/**
 * @param {object} opts
 * @param {string} opts.currentStatus
 * @param {string} opts.targetStatus
 * @param {'ADMIN'|'CLIENT'|'VENDEUR'|'OTHER'} opts.actor
 * @returns {{ ok: true } | never}
 */
export function assertOrderStatusChange({ currentStatus, targetStatus, actor }) {
  const from = normalizeOrderStatus(currentStatus);
  const to = normalizeOrderStatus(targetStatus);

  if (!to) {
    throw new OrderStatusPolicyError(
      'Statut de commande inconnu ou non autorisé.',
      400,
    );
  }
  if (!from) {
    throw new OrderStatusPolicyError(
      'Statut actuel de commande invalide.',
      400,
    );
  }
  if (from === to) {
    return { ok: true, unchanged: true };
  }

  const role = String(actor || 'OTHER').toUpperCase();

  if (role === 'ADMIN') {
    // Admin : toute transition vers un statut enum connu
    return { ok: true };
  }

  if (from === 'Livrée' || from === 'Annulée') {
    throw new OrderStatusPolicyError(
      'Cette commande est clôturée ; transition impossible.',
      409,
    );
  }

  const table = role === 'VENDEUR'
    ? VENDEUR_TRANSITIONS
    : role === 'CLIENT'
      ? CLIENT_TRANSITIONS
      : null;

  if (!table) {
    throw new OrderStatusPolicyError(
      'Acteur non autorisé à modifier le statut de cette commande.',
      403,
    );
  }

  const allowed = table[from] || [];
  if (!allowed.includes(to)) {
    throw new OrderStatusPolicyError(
      `Transition interdite : « ${from} » → « ${to} ».`,
      409,
    );
  }

  return { ok: true };
}

/**
 * Détermine l'acteur métier pour une commande.
 * @param {object} opts
 * @param {{ _id?: any, role?: string }} opts.user
 * @param {{ utilisateur?: any, vendeur?: any }} opts.commande
 * @param {string|null} [opts.vendeurProfileId] ObjectId du profil Vendeur de l'utilisateur
 */
export function resolveOrderActor({ user, commande, vendeurProfileId = null }) {
  const role = String(user?.role || '').toUpperCase();
  if (role === 'ADMIN') return 'ADMIN';

  const userId = user?._id?.toString?.() || String(user?._id || '');
  const ownerId = commande?.utilisateur?.toString?.() || '';
  const cmdVendeurId = commande?.vendeur?.toString?.() || '';

  if (vendeurProfileId && cmdVendeurId && cmdVendeurId === String(vendeurProfileId)) {
    return 'VENDEUR';
  }

  if (ownerId && userId && ownerId === userId) {
    return 'CLIENT';
  }

  return 'OTHER';
}
