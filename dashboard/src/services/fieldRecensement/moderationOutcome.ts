/**
 * R3-02 — Mapping pur des réponses API (sans axios) — testable hors Jest/ESM.
 */
export type FieldApiEnvelope = {
  success?: boolean;
  code?: string;
  message?: string;
  retryable?: boolean;
  data?: {
    id?: string;
    revision?: number;
    reviewStatus?: string;
    publicationStatus?: string;
    [key: string]: unknown;
  };
};

export type ModerationApiOutcome =
  | { kind: 'success'; httpStatus: number; code: string; data?: FieldApiEnvelope['data'] }
  | { kind: 'processing'; httpStatus: number; code: string; data?: FieldApiEnvelope['data'] }
  | { kind: 'already_applied'; httpStatus: number; code: string; data?: FieldApiEnvelope['data'] }
  | { kind: 'revision_conflict'; code: string }
  | { kind: 'invalid_state'; code: string }
  | { kind: 'idempotency_reused'; code: string }
  | { kind: 'temporary'; code: string; retryable: boolean }
  | { kind: 'flag_disabled'; code: string }
  | { kind: 'forbidden'; code: string }
  | { kind: 'auth'; code: string }
  | { kind: 'not_found'; code: string }
  | { kind: 'validation'; code: string }
  | { kind: 'network' }
  | { kind: 'other'; code?: string; httpStatus?: number };

const PROCESSING_CODES = new Set([
  'RECENSEMENT_PUBLICATION_PROCESSING',
  'RECENSEMENT_REACTIVATION_PROCESSING',
]);

const TEMP_CODES = new Set([
  'RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE',
  'RECENSEMENT_SUSPENSION_TEMPORARY_FAILURE',
  'RECENSEMENT_REACTIVATION_TEMPORARY_FAILURE',
  'SERVER_TEMPORARY_ERROR',
]);

export function mapModerationResponse(
  httpStatus: number,
  body: FieldApiEnvelope | null,
): ModerationApiOutcome {
  const code = body?.code || '';

  if (httpStatus === 401 || code === 'AUTH_REQUIRED' || code === 'AUTH_TOKEN_EXPIRED') {
    return { kind: 'auth', code: code || 'AUTH_REQUIRED' };
  }
  if (httpStatus === 403 || code === 'ADMIN_REQUIRED') {
    return { kind: 'forbidden', code: code || 'ADMIN_REQUIRED' };
  }
  if (
    code === 'FIELD_RECENSEMENT_V1_DISABLED' ||
    (httpStatus === 503 && code === 'FIELD_RECENSEMENT_V1_DISABLED')
  ) {
    return { kind: 'flag_disabled', code: 'FIELD_RECENSEMENT_V1_DISABLED' };
  }
  if (httpStatus === 404 || code === 'RECENSEMENT_NOT_FOUND') {
    return { kind: 'not_found', code: code || 'RECENSEMENT_NOT_FOUND' };
  }
  if (code === 'RECENSEMENT_ALREADY_APPLIED') {
    return { kind: 'already_applied', httpStatus, code, data: body?.data };
  }
  if (code === 'RECENSEMENT_REVISION_CONFLICT' || code === 'REVISION_CONFLICT') {
    return { kind: 'revision_conflict', code };
  }
  if (code === 'IDEMPOTENCY_KEY_REUSED') {
    return { kind: 'idempotency_reused', code };
  }
  if (
    code === 'RECENSEMENT_INVALID_STATE' ||
    code === 'INVALID_STATE' ||
    code === 'PUBLICATION_BLOCKED' ||
    code === 'REACTIVATION_BLOCKED' ||
    code === 'RECENSEMENT_NOT_READY' ||
    code === 'RECENSEMENT_MATCH_REVIEW_REQUIRED' ||
    code === 'RECENSEMENT_DUPLICATE_SUSPECTED'
  ) {
    return { kind: 'invalid_state', code };
  }
  if (
    httpStatus === 400 ||
    code === 'RECENSEMENT_VALIDATION_FAILED' ||
    code === 'RECENSEMENT_CORRECTION_FIELD_FORBIDDEN' ||
    code === 'RECENSEMENT_ID_INVALID'
  ) {
    return { kind: 'validation', code: code || 'RECENSEMENT_VALIDATION_FAILED' };
  }
  if (PROCESSING_CODES.has(code) || httpStatus === 202) {
    return { kind: 'processing', httpStatus, code: code || 'PROCESSING', data: body?.data };
  }
  if (TEMP_CODES.has(code) || (httpStatus === 503 && body?.retryable !== false)) {
    return {
      kind: 'temporary',
      code: code || 'SERVER_TEMPORARY_ERROR',
      retryable: body?.retryable !== false,
    };
  }
  if (httpStatus >= 200 && httpStatus < 300 && body?.success !== false) {
    return {
      kind: 'success',
      httpStatus,
      code: code || 'OK',
      data: body?.data,
    };
  }
  return { kind: 'other', code, httpStatus };
}

export function userMessageForOutcome(outcome: ModerationApiOutcome): string {
  switch (outcome.kind) {
    case 'success':
      return 'Action enregistrée.';
    case 'processing':
      return 'Traitement en cours sur le serveur.';
    case 'already_applied':
      return 'Cette action était déjà appliquée.';
    case 'revision_conflict':
      return 'Le dossier a changé. Actualisez puis réessayez.';
    case 'invalid_state':
      return 'Action impossible dans l’état actuel du dossier.';
    case 'idempotency_reused':
      return 'Identifiant d’opération déjà utilisé avec un autre contenu.';
    case 'temporary':
      return 'Erreur temporaire. Vous pouvez réessayer.';
    case 'flag_disabled':
      return 'Module recensement terrain temporairement désactivé.';
    case 'forbidden':
      return 'Accès réservé aux administrateurs.';
    case 'auth':
      return 'Session expirée. Reconnectez-vous.';
    case 'not_found':
      return 'Dossier introuvable.';
    case 'validation':
      return 'Données de l’action invalides.';
    case 'network':
      return 'Réseau indisponible.';
    default:
      return 'Action impossible pour le moment.';
  }
}
