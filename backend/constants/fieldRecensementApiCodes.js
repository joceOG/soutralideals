/**
 * R1-11 — Registre central des codes API Field Recensement V1.
 * Un code = un HTTP + un retryable + un message (pas d’ambiguïté).
 */
export const FIELD_RECENSEMENT_API_CATEGORIES = Object.freeze([
  'success',
  'validation',
  'authentication',
  'authorization',
  'conflict',
  'version',
  'temporary',
  'internal',
]);

/**
 * @typedef {{
 *   httpStatus: number,
 *   retryable: boolean,
 *   defaultMessage: string,
 *   category: string,
 *   retryAfterSeconds?: number,
 *   clientAction?: string,
 *   detailsAllowlist?: string[],
 *   justifiedUnused?: boolean,
 * }} FieldRecensementCodeDef
 */

/** @type {Readonly<Record<string, FieldRecensementCodeDef>>} */
export const FIELD_RECENSEMENT_API_CODES = Object.freeze({
  // --- Succès / traitement ---
  RECENSEMENT_CREATED: {
    httpStatus: 201,
    retryable: false,
    defaultMessage: 'Dossier enregistré.',
    category: 'success',
    clientAction: 'marquer submitted puis poll',
  },
  RECENSEMENT_ALREADY_APPLIED: {
    httpStatus: 200,
    retryable: false,
    defaultMessage: 'Opération déjà appliquée.',
    category: 'success',
    clientAction: 'conserver le même dossier / état',
  },
  RECENSEMENT_PROCESSING: {
    httpStatus: 202,
    retryable: true,
    defaultMessage: 'Traitement en cours.',
    category: 'temporary',
    retryAfterSeconds: 5,
    clientAction: 'backoff puis poll / rejouer',
    detailsAllowlist: ['retryAfterSeconds'],
  },
  RECENSEMENT_UPDATED: {
    httpStatus: 200,
    retryable: false,
    defaultMessage: 'Dossier mis à jour.',
    category: 'success',
    clientAction: 'mettre à jour l’état local',
  },
  RECENSEMENT_RESUBMITTED: {
    httpStatus: 200,
    retryable: false,
    defaultMessage: 'Dossier resoumis pour revue.',
    category: 'success',
    clientAction: 'marquer submitted puis poll',
  },
  RECENSEMENT_CORRECTION_REQUESTED: {
    httpStatus: 200,
    retryable: false,
    defaultMessage: 'Correction demandée.',
    category: 'success',
    clientAction: 'afficher champs à corriger',
  },
  RECENSEMENT_REJECTED: {
    httpStatus: 200,
    retryable: false,
    defaultMessage: 'Dossier rejeté.',
    category: 'success',
    clientAction: 'archiver localement',
  },
  RECENSEMENT_PUBLISHED: {
    httpStatus: 200,
    retryable: false,
    defaultMessage: 'Dossier publié.',
    category: 'success',
    clientAction: 'rafraîchir détail admin',
  },
  RECENSEMENT_PUBLICATION_PROCESSING: {
    httpStatus: 202,
    retryable: true,
    defaultMessage: 'Publication en cours.',
    category: 'temporary',
    retryAfterSeconds: 5,
    clientAction: 'backoff puis retry publish',
    detailsAllowlist: ['retryAfterSeconds', 'publicationStatus', 'id'],
  },
  RECENSEMENT_SUSPENDED: {
    httpStatus: 200,
    retryable: false,
    defaultMessage: 'Dossier suspendu.',
    category: 'success',
    clientAction: 'rafraîchir détail admin',
  },
  RECENSEMENT_REACTIVATED: {
    httpStatus: 200,
    retryable: false,
    defaultMessage: 'Dossier réactivé.',
    category: 'success',
    clientAction: 'rafraîchir détail admin',
  },
  RECENSEMENT_REACTIVATION_PROCESSING: {
    httpStatus: 202,
    retryable: true,
    defaultMessage: 'Réactivation en cours.',
    category: 'temporary',
    retryAfterSeconds: 5,
    clientAction: 'backoff puis retry reactivate',
    detailsAllowlist: ['retryAfterSeconds'],
  },

  // --- Validation ---
  RECENSEMENT_VALIDATION_FAILED: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'Certaines informations sont invalides.',
    category: 'validation',
    clientAction: 'afficher champs à corriger',
    detailsAllowlist: ['fields', 'errors'],
  },
  RECENSEMENT_PHOTO_INVALID: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'Photo invalide ou format non accepté.',
    category: 'validation',
    clientAction: 'choisir une autre image',
  },
  RECENSEMENT_PHOTO_TOO_LARGE: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'Fichier trop volumineux.',
    category: 'validation',
    clientAction: 'réduire la taille de la photo',
  },
  RECENSEMENT_ID_INVALID: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'Identifiant invalide.',
    category: 'validation',
    clientAction: 'recharger la liste',
  },
  RECENSEMENT_QUERY_INVALID: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'Paramètres de requête invalides.',
    category: 'validation',
    clientAction: 'corriger les filtres',
  },
  RECENSEMENT_CURSOR_INVALID: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'Curseur de pagination invalide.',
    category: 'validation',
    clientAction: 'reprendre sans curseur',
  },
  RECENSEMENT_CORRECTION_FIELD_FORBIDDEN: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'Champ non corrigible.',
    category: 'validation',
    clientAction: 'retirer le champ interdit',
  },
  RECENSEMENT_CORRECTION_INCOMPLETE: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'Correction incomplète.',
    category: 'validation',
    clientAction: 'compléter les champs demandés',
  },
  APP_BUILD_MISMATCH: {
    httpStatus: 400,
    retryable: false,
    defaultMessage: 'X-App-Build et payload.app.buildNumber divergent.',
    category: 'validation',
    clientAction: 'aligner header et payload',
    detailsAllowlist: ['headerBuildNumber', 'payloadBuildNumber'],
  },

  // --- Auth / authz ---
  AUTH_REQUIRED: {
    httpStatus: 401,
    retryable: false,
    defaultMessage: 'Authentification requise.',
    category: 'authentication',
    clientAction: 'se connecter',
  },
  AUTH_TOKEN_EXPIRED: {
    httpStatus: 401,
    retryable: false,
    defaultMessage: 'Session expirée.',
    category: 'authentication',
    clientAction: 'refresh puis rejouer la même mutation',
  },
  AUTH_TOKEN_INVALID: {
    httpStatus: 401,
    retryable: false,
    defaultMessage: 'Jeton d’authentification invalide.',
    category: 'authentication',
    clientAction: 'se reconnecter',
  },
  RECENSEUR_PERMISSION_REVOKED: {
    httpStatus: 403,
    retryable: false,
    defaultMessage: 'Permission de recensement révoquée ou absente.',
    category: 'authorization',
    clientAction: 'arrêter sync, conserver données',
  },
  ADMIN_REQUIRED: {
    httpStatus: 403,
    retryable: false,
    defaultMessage: 'Droits administrateur requis.',
    category: 'authorization',
    clientAction: 'utiliser un compte Admin',
  },
  RECENSEMENT_FORBIDDEN: {
    httpStatus: 403,
    retryable: false,
    defaultMessage: 'Action non autorisée sur ce dossier.',
    category: 'authorization',
    clientAction: 'arrêter l’édition',
  },

  // --- Ressource / conflits ---
  RECENSEMENT_NOT_FOUND: {
    httpStatus: 404,
    retryable: false,
    defaultMessage: 'Dossier introuvable.',
    category: 'conflict',
    clientAction: 'recharger la liste',
  },
  RECENSEMENT_ROUTE_NOT_FOUND: {
    httpStatus: 404,
    retryable: false,
    defaultMessage: 'Route de recensement introuvable.',
    category: 'conflict',
    clientAction: 'vérifier le chemin API',
  },
  RECENSEMENT_DUPLICATE_SUSPECTED: {
    httpStatus: 409,
    retryable: false,
    defaultMessage: 'Doublon métier suspecté.',
    category: 'conflict',
    clientAction: 'contacter superviseur',
    detailsAllowlist: ['matchReasons', 'action'],
  },
  RECENSEMENT_INVALID_STATE: {
    httpStatus: 409,
    retryable: false,
    defaultMessage: 'État du dossier incompatible avec cette action.',
    category: 'conflict',
    clientAction: 'recharger l’état serveur',
  },
  RECENSEMENT_REVISION_CONFLICT: {
    httpStatus: 409,
    retryable: false,
    defaultMessage: 'Révision obsolète.',
    category: 'conflict',
    clientAction: 'recharger état serveur',
    detailsAllowlist: ['currentRevision', 'expectedRevision', 'action'],
  },
  IDEMPOTENCY_KEY_REUSED: {
    httpStatus: 409,
    retryable: false,
    defaultMessage: 'Clé d’idempotence réutilisée avec un autre contenu.',
    category: 'conflict',
    clientAction: 'ne pas régénérer sans revue ; conserver file locale',
  },
  RECENSEMENT_PUBLICATION_BLOCKED: {
    httpStatus: 409,
    retryable: false,
    defaultMessage: 'Publication bloquée.',
    category: 'conflict',
    clientAction: 'corriger le dossier ou revoir le match',
  },
  RECENSEMENT_REACTIVATION_BLOCKED: {
    httpStatus: 409,
    retryable: false,
    defaultMessage: 'Réactivation bloquée.',
    category: 'conflict',
    clientAction: 'revue admin manuelle',
  },
  RECENSEMENT_NOT_READY: {
    httpStatus: 409,
    retryable: false,
    defaultMessage: 'Dossier non prêt pour cette action.',
    category: 'conflict',
    clientAction: 'compléter ingestion / consentement',
  },
  RECENSEMENT_MATCH_REVIEW_REQUIRED: {
    httpStatus: 409,
    retryable: false,
    defaultMessage: 'Revue de correspondance utilisateur requise.',
    category: 'conflict',
    clientAction: 'revue admin manuelle',
  },

  // --- Version ---
  APP_VERSION_BLOCKED: {
    httpStatus: 426,
    retryable: false,
    defaultMessage: 'Cette version de SDEALSIDENTIFICATION doit être mise à jour.',
    category: 'version',
    clientAction: 'demander mise à jour interne',
    detailsAllowlist: [
      'currentBuildNumber',
      'minimumBuildNumber',
      'updateRequired',
      'updateChannel',
      'reason',
    ],
  },

  // --- Temporaires ---
  FIELD_RECENSEMENT_V1_DISABLED: {
    httpStatus: 503,
    retryable: true,
    defaultMessage: 'Le service de recensement est temporairement indisponible.',
    category: 'temporary',
    retryAfterSeconds: 300,
    clientAction: 'backoff, conserver file locale',
  },
  RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE: {
    httpStatus: 503,
    retryable: true,
    defaultMessage: 'Échec temporaire de publication.',
    category: 'temporary',
    retryAfterSeconds: 30,
    clientAction: 'backoff puis retry publish',
  },
  RECENSEMENT_SUSPENSION_TEMPORARY_FAILURE: {
    httpStatus: 503,
    retryable: true,
    defaultMessage: 'Échec temporaire de suspension.',
    category: 'temporary',
    retryAfterSeconds: 30,
    clientAction: 'backoff puis retry suspend',
  },
  RECENSEMENT_REACTIVATION_TEMPORARY_FAILURE: {
    httpStatus: 503,
    retryable: true,
    defaultMessage: 'Échec temporaire de réactivation.',
    category: 'temporary',
    retryAfterSeconds: 30,
    clientAction: 'backoff puis retry reactivate',
  },
  RECENSEMENT_MEDIA_FAILED: {
    httpStatus: 503,
    retryable: true,
    defaultMessage: 'Échec temporaire d’upload média.',
    category: 'temporary',
    retryAfterSeconds: 30,
    clientAction: 'backoff puis rejouer la même mutation',
  },
  RATE_LIMITED: {
    httpStatus: 429,
    retryable: true,
    defaultMessage: 'Trop de requêtes. Réessayez plus tard.',
    category: 'temporary',
    retryAfterSeconds: 60,
    clientAction: 'attendre Retry-After puis rejouer',
    detailsAllowlist: ['retryAfterSeconds'],
  },
  SERVER_TEMPORARY_ERROR: {
    httpStatus: 503,
    retryable: true,
    defaultMessage: 'Erreur temporaire du serveur.',
    category: 'temporary',
    retryAfterSeconds: 30,
    clientAction: 'backoff puis rejouer',
  },
});

/** Ancien code → code canonique (R1-11). */
export const FIELD_RECENSEMENT_CODE_ALIASES = Object.freeze({
  FIELD_RECENSEMENT_PATCHED: 'RECENSEMENT_UPDATED',
  FIELD_RECENSEMENT_RESUBMITTED: 'RECENSEMENT_RESUBMITTED',
  FIELD_DATA_EDIT_FORBIDDEN: 'RECENSEMENT_FORBIDDEN',
  RECENSEMENT_CONFLICT_CORRECTION: 'RECENSEMENT_REVISION_CONFLICT',
  RECENSEMENT_PUBLICATION_FAILED: 'RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE',
  RECENSEMENT_SUSPENSION_FAILED: 'RECENSEMENT_SUSPENSION_TEMPORARY_FAILURE',
  RECENSEMENT_REACTIVATION_FAILED: 'RECENSEMENT_REACTIVATION_TEMPORARY_FAILURE',
  INTERNAL_ERROR: 'SERVER_TEMPORARY_ERROR',
  RECENSEMENT_SAVE_FAILED: 'SERVER_TEMPORARY_ERROR',
  RECENSEMENT_AUDIT_FAILED: 'SERVER_TEMPORARY_ERROR',
});

/**
 * @param {string} code
 * @returns {string}
 */
export function resolveFieldRecensementApiCode(code) {
  if (!code || typeof code !== 'string') return 'SERVER_TEMPORARY_ERROR';
  if (FIELD_RECENSEMENT_API_CODES[code]) return code;
  if (FIELD_RECENSEMENT_CODE_ALIASES[code]) return FIELD_RECENSEMENT_CODE_ALIASES[code];
  return code;
}

/**
 * @param {string} code
 * @returns {FieldRecensementCodeDef}
 */
export function getFieldRecensementApiCodeDef(code) {
  const resolved = resolveFieldRecensementApiCode(code);
  const def = FIELD_RECENSEMENT_API_CODES[resolved];
  if (!def) {
    const err = new Error(`Code API FieldRecensement inconnu: ${code}`);
    err.code = 'UNKNOWN_FIELD_RECENSEMENT_API_CODE';
    err.unknownCode = code;
    throw err;
  }
  return def;
}

export function listFieldRecensementApiCodes() {
  return Object.keys(FIELD_RECENSEMENT_API_CODES);
}

export default FIELD_RECENSEMENT_API_CODES;
