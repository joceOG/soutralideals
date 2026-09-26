/**
 * DASH-8E.3B — Autorisation métier Prestation (read-only, sans KYC).
 */
import prestataireModel from '../models/prestataireModel.js';
import { resolveProfessionalCapabilities } from './professionalCapabilitiesService.js';

export const PRESTATION_STATUSES = Object.freeze([
  'EN_ATTENTE',
  'ACCEPTEE',
  'REFUSEE',
  'EN_COURS',
  'TERMINEE',
  'ANNULEE',
  'LITIGE',
]);

const CLIENT_STATUS_TRANSITIONS = Object.freeze({
  EN_ATTENTE: ['ANNULEE'],
  ACCEPTEE: ['ANNULEE'],
  TERMINEE: ['LITIGE'],
});

const PRESTATAIRE_STATUS_TRANSITIONS = Object.freeze({
  EN_ATTENTE: ['ACCEPTEE', 'REFUSEE'],
  ACCEPTEE: ['EN_COURS'],
  EN_COURS: ['TERMINEE'],
});

/** Champs modifiables par acteur (noms Mongoose). */
export const PRESTATION_CLIENT_UPDATE_FIELDS = Object.freeze([
  'datePrestation',
  'heureDebut',
  'heureFin',
  'dureeEstimee',
  'adresse',
  'ville',
  'codePostal',
  'localisation',
  'description',
  'notesClient',
  'telephoneUrgence',
  'estRecurrente',
  'frequenceRecurrence',
]);

export const PRESTATION_PROVIDER_UPDATE_FIELDS = Object.freeze([
  'notesPrestataire',
  'notePrestataire',
  'commentairePrestataire',
]);

export const PRESTATION_ADMIN_UPDATE_FIELDS = Object.freeze([
  'prestataire',
  'service',
  'tarifHoraire',
  'montantTotal',
  'fraisDeplacements',
  'moyenPaiement',
  'statut',
  'statutPaiement',
  'referencePaiement',
  'noteClient',
  'commentaireClient',
]);

export class PrestationAuthorizationError extends Error {
  constructor(code, httpStatus, message) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function isAdminUser(user) {
  return String(user?.role || '').toUpperCase() === 'ADMIN';
}

export async function resolvePrestationActor(utilisateur, prestation) {
  if (!utilisateur?._id || !prestation) return 'none';
  if (isAdminUser(utilisateur)) return 'admin';

  const uid = utilisateur._id.toString();
  if (prestation.utilisateur?.toString() === uid) return 'client';

  const prestDoc = await prestataireModel.findById(prestation.prestataire).select('utilisateur').lean();
  if (prestDoc?.utilisateur?.toString() === uid) return 'prestataire';

  return 'other';
}

function assertStatusTransition(from, to, table) {
  const allowed = table[from] || [];
  if (!allowed.includes(to)) {
    throw new PrestationAuthorizationError(
      'INVALID_PRESTATION_STATUS_TRANSITION',
      409,
      `Transition interdite : « ${from} » → « ${to} ».`,
    );
  }
}

/**
 * @param {object} opts
 * @param {object} opts.utilisateur
 * @param {object} opts.prestation
 * @param {'update'|'changeStatus'|'delete'|'read'} opts.operation
 * @param {object} [opts.payload]
 */
export async function authorizePrestationOperation(opts) {
  const { utilisateur, prestation, operation, payload = {} } = opts;
  const actor = await resolvePrestationActor(utilisateur, prestation);

  if (actor === 'none' || actor === 'other') {
    throw new PrestationAuthorizationError(
      'RESOURCE_ACCESS_FORBIDDEN',
      403,
      'Accès refusé à cette prestation.',
    );
  }

  const resolved =
    actor === 'prestataire' || actor === 'client'
      ? await resolveProfessionalCapabilities(utilisateur._id)
      : null;

  if (actor === 'prestataire') {
    const internal = resolved?.profilesInternal?.prestataire;
    const dup = resolved?.inconsistencies?.some(
      (i) => i?.code === 'MULTIPLE_PROFILES_OF_SAME_TYPE' && i.profileType === 'Prestataire',
    );
    if (dup) {
      throw new PrestationAuthorizationError(
        'PROFESSIONAL_PROFILE_CONFLICT',
        403,
        'Plusieurs profils Prestataire nécessitent une régularisation.',
      );
    }
    if (!internal?.exists) {
      throw new PrestationAuthorizationError(
        'PROFESSIONAL_PROFILE_REQUIRED',
        403,
        'Profil Prestataire requis.',
      );
    }
  }

  if (operation === 'changeStatus') {
    const target = payload.statut || payload.nouveauStatut;
    if (!PRESTATION_STATUSES.includes(target)) {
      throw new PrestationAuthorizationError(
        'INVALID_PRESTATION_STATUS_TRANSITION',
        400,
        'Statut invalide.',
      );
    }
    const from = prestation.statut;
    if (from === target) {
      return { actor, allowedFields: [], allowedTransition: true, unchanged: true };
    }

    if (actor === 'admin') {
      return { actor, allowedFields: [], allowedTransition: true };
    }

    if (actor === 'client') {
      assertStatusTransition(from, target, CLIENT_STATUS_TRANSITIONS);
      return { actor, allowedFields: [], allowedTransition: true };
    }

    if (actor === 'prestataire') {
      const internal = resolved.profilesInternal.prestataire;
      const finishingOnly = from === 'EN_COURS' && target === 'TERMINEE';
      const starting = from === 'ACCEPTEE' && target === 'EN_COURS';
      const accepting = from === 'EN_ATTENTE' && (target === 'ACCEPTEE' || target === 'REFUSEE');

      if (accepting || starting) {
        if (!internal.canOperate) {
          throw new PrestationAuthorizationError(
            'PROFESSIONAL_PROFILE_NOT_OPERATIONAL',
            403,
            "Ce profil Prestataire n'est pas autorisé à exercer.",
          );
        }
      } else if (!finishingOnly && !internal.canOperate) {
        throw new PrestationAuthorizationError(
          'PROFESSIONAL_PROFILE_NOT_OPERATIONAL',
          403,
          "Ce profil Prestataire n'est pas autorisé à exercer.",
        );
      }

      assertStatusTransition(from, target, PRESTATAIRE_STATUS_TRANSITIONS);
      return { actor, allowedFields: [], allowedTransition: true };
    }
  }

  if (operation === 'update') {
    let allowedFields = [];
    if (actor === 'admin') {
      allowedFields = [
        ...PRESTATION_CLIENT_UPDATE_FIELDS,
        ...PRESTATION_PROVIDER_UPDATE_FIELDS,
        ...PRESTATION_ADMIN_UPDATE_FIELDS,
      ];
    } else if (actor === 'client') {
      allowedFields = [...PRESTATION_CLIENT_UPDATE_FIELDS];
    } else if (actor === 'prestataire') {
      allowedFields = [...PRESTATION_PROVIDER_UPDATE_FIELDS];
    }

    const forbidden = Object.keys(payload).filter(
      (k) => payload[k] !== undefined && !allowedFields.includes(k),
    );
    if (forbidden.length) {
      throw new PrestationAuthorizationError(
        'UPDATE_FIELD_FORBIDDEN',
        403,
        'Champ non autorisé pour cet acteur.',
      );
    }
    return { actor, allowedFields, allowedTransition: false };
  }

  if (operation === 'delete' || operation === 'read') {
    return { actor, allowedFields: [], allowedTransition: false };
  }

  throw new PrestationAuthorizationError('RESOURCE_ACCESS_FORBIDDEN', 403, 'Opération interdite.');
}

export function pickPrestationUpdates(payload, allowedFields) {
  const out = {};
  for (const key of allowedFields) {
    if (payload[key] !== undefined) out[key] = payload[key];
  }
  return out;
}
