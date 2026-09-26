/**
 * DASH-8E.3B — Autorisation métier Commande (read-only).
 */
import vendeurModel from '../models/vendeurModel.js';
import {
  assertOrderStatusChange,
  normalizeOrderStatus,
  resolveOrderActor,
} from '../utils/orderStatusPolicy.js';
import { resolveProfessionalCapabilities } from './professionalCapabilitiesService.js';

export const COMMANDE_CLIENT_UPDATE_FIELDS = Object.freeze([
  'dateLivraison',
  'notesClient',
  'infoCommande',
]);

export const COMMANDE_VENDOR_UPDATE_FIELDS = Object.freeze([
  'dateLivraison',
  'notesClient',
]);

export const COMMANDE_ADMIN_UPDATE_FIELDS = Object.freeze([
  'prixTotal',
  'prixArticles',
  'prixLivraison',
  'paiementInfo',
  'statusCommande',
]);

export const COMMANDE_IMMUTABLE_FIELDS = Object.freeze([
  'utilisateur',
  'vendeur',
  'commission',
  'referencePaiement',
  'datePaie',
]);

export class CommandeAuthorizationError extends Error {
  constructor(code, httpStatus, message) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function isAdminUser(user) {
  return String(user?.role || '').toUpperCase() === 'ADMIN';
}

export async function findVendeurProfileIdForUser(userId) {
  if (!userId) return null;
  const v = await vendeurModel.findOne({ utilisateur: userId }).select('_id').lean();
  return v?._id?.toString() || null;
}

export async function resolveCommandeActor(utilisateur, commande) {
  if (!utilisateur?._id || !commande) return 'none';
  if (isAdminUser(utilisateur)) return 'admin';
  const vendeurProfileId = await findVendeurProfileIdForUser(utilisateur._id);
  const actor = resolveOrderActor({
    user: utilisateur,
    commande,
    vendeurProfileId,
  });
  if (actor === 'ADMIN') return 'admin';
  if (actor === 'CLIENT') return 'client';
  if (actor === 'VENDEUR') return 'vendeur';
  return 'other';
}

export function assertNoImmutableCommandeFieldsInPayload(payload) {
  for (const key of COMMANDE_IMMUTABLE_FIELDS) {
    if (payload[key] !== undefined) {
      throw new CommandeAuthorizationError(
        'UPDATE_FIELD_FORBIDDEN',
        403,
        `Le champ « ${key} » ne peut pas être modifié via cette opération.`,
      );
    }
  }
}

/**
 * @param {object} opts
 * @param {object} opts.utilisateur
 * @param {object} opts.commande
 * @param {'updateFields'|'changeStatus'} opts.operation
 * @param {object} [opts.payload]
 */
export async function authorizeCommandeOperation(opts) {
  const { utilisateur, commande, operation, payload = {} } = opts;
  assertNoImmutableCommandeFieldsInPayload(payload);

  const actor = await resolveCommandeActor(utilisateur, commande);
  if (actor === 'none' || actor === 'other') {
    throw new CommandeAuthorizationError(
      'RESOURCE_ACCESS_FORBIDDEN',
      403,
      'Accès refusé à cette commande.',
    );
  }

  if (operation === 'changeStatus') {
    const target = normalizeOrderStatus(payload.statusCommande);
    if (!target) {
      throw new CommandeAuthorizationError(
        'INVALID_COMMANDE_STATUS_TRANSITION',
        400,
        'Statut de commande invalide.',
      );
    }

    const policyActor =
      actor === 'admin' ? 'ADMIN' : actor === 'vendeur' ? 'VENDEUR' : 'CLIENT';

    if (actor === 'vendeur') {
      const caps = await resolveProfessionalCapabilities(utilisateur._id);
      const v = caps.profilesInternal?.vendeur;
      if (caps.inconsistencies?.some((i) => i?.profileType === 'Vendeur')) {
        throw new CommandeAuthorizationError(
          'PROFESSIONAL_PROFILE_CONFLICT',
          403,
          'Conflit profil Vendeur.',
        );
      }
      if (!v?.exists) {
        throw new CommandeAuthorizationError(
          'PROFESSIONAL_PROFILE_REQUIRED',
          403,
          'Profil Vendeur requis.',
        );
      }
      if (!v.canOperate) {
        throw new CommandeAuthorizationError(
          'PROFESSIONAL_PROFILE_NOT_OPERATIONAL',
          403,
          "Ce profil Vendeur n'est pas autorisé à exercer.",
        );
      }
    }

    try {
      assertOrderStatusChange({
        currentStatus: commande.statusCommande,
        targetStatus: target,
        actor: policyActor,
      });
    } catch (err) {
      const status = err.statusCode || 409;
      throw new CommandeAuthorizationError(
        status === 403 ? 'RESOURCE_ACCESS_FORBIDDEN' : 'INVALID_COMMANDE_STATUS_TRANSITION',
        status,
        err.message,
      );
    }

    return { actor, allowedFields: [], allowedTransition: true };
  }

  if (operation === 'updateFields') {
    let allowed = [];
    if (actor === 'admin') {
      allowed = [
        ...COMMANDE_CLIENT_UPDATE_FIELDS,
        ...COMMANDE_VENDOR_UPDATE_FIELDS,
        ...COMMANDE_ADMIN_UPDATE_FIELDS,
      ];
    } else if (actor === 'client') {
      allowed = [...COMMANDE_CLIENT_UPDATE_FIELDS];
    } else if (actor === 'vendeur') {
      allowed = [...COMMANDE_VENDOR_UPDATE_FIELDS];
    }

    const keys = Object.keys(payload).filter((k) => payload[k] !== undefined);
    const forbidden = keys.filter((k) => !allowed.includes(k));
    if (forbidden.length) {
      throw new CommandeAuthorizationError(
        'UPDATE_FIELD_FORBIDDEN',
        403,
        'Champ non autorisé pour cet acteur.',
      );
    }
    return { actor, allowedFields: allowed, allowedTransition: false };
  }

  throw new CommandeAuthorizationError('RESOURCE_ACCESS_FORBIDDEN', 403, 'Opération interdite.');
}

export function pickCommandeUpdates(payload, allowedFields) {
  const out = {};
  for (const key of allowedFields) {
    if (payload[key] !== undefined) out[key] = payload[key];
  }
  return out;
}
