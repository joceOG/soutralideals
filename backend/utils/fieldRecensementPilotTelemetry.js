/**
 * Télémétrie pilote Field Recensement — événements techniques sans PII.
 * Interdit : nom, téléphone, email, adresse, GPS, payload, JWT, KYC, URL signée, cld:auth.
 */
const ALLOWED_KEYS = new Set([
  'event',
  'code',
  'professionalType',
  'reviewStatus',
  'publicationStatus',
  'httpStatus',
  'durationMs',
  'requestId',
  'bucket',
  'storeKind',
  'retryAfterSeconds',
  'queueSize',
  'oldestBlockedAgeMinutes',
  'dryRun',
  'job',
  'outcome',
]);

/**
 * @param {string} event
 * @param {Record<string, unknown>} [fields]
 */
export function emitFieldRecensementPilotEvent(event, fields = {}) {
  const payload = { event: String(event), ts: new Date().toISOString() };
  for (const [k, v] of Object.entries(fields || {})) {
    if (!ALLOWED_KEYS.has(k)) continue;
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      payload[k] = v;
    }
  }

  if (process.env.NODE_ENV === 'test') return payload;

  try {
    if (typeof process.emit === 'function') {
      process.emit('field_recensement_pilot_event', payload);
    }
  } catch {
    /* ignore */
  }

  // Journal technique minimal (pas de console en production si logger dispo).
  if (process.env.FIELD_RECENSEMENT_PILOT_LOG_EVENTS === 'true') {
    // eslint-disable-next-line no-console
    console.info('[fr-pilot]', JSON.stringify(payload));
  }
  return payload;
}

/** Catalogue d’événements attendus (documentation / monitoring). */
export const FIELD_RECENSEMENT_PILOT_EVENTS = Object.freeze([
  'create_success',
  'create_already_applied',
  'temporary_failure',
  'permission_revoked',
  'app_version_blocked',
  'publication_failed',
  'reconciliation_run',
  'media_gc_run',
  'correction_rate',
  'queue_size',
  'oldest_blocked_age',
  'rate_limited',
  'rate_limit_store_error',
]);

export default {
  emitFieldRecensementPilotEvent,
  FIELD_RECENSEMENT_PILOT_EVENTS,
};
