/**
 * Rate limiter dédié /api/v1/field-recensements*
 *
 * Ordre requis sur les routes : auth → (authz) → rateLimit → flag → build → multer → ctrl
 * Clé principale = hash(userId) — jamais téléphone / JWT / IP en clair.
 * IP hashée uniquement comme signal secondaire (bucket séparé très permissif optionnel non utilisé
 * pour ne pas bloquer une équipe derrière le même NAT).
 *
 * Store : mémoire processus. DETTE : store Redis avant multi-instance.
 */
import { FieldRecensementApiError } from '../utils/FieldRecensementApiError.js';
import { sendFieldRecensementError } from '../utils/fieldRecensementV1Respond.js';
import {
  getFieldRecensementRateLimitConfig,
} from '../config/fieldRecensementRateLimitConfig.js';
import {
  getFieldRecensementRateLimitStore,
  hashRateLimitIdentity,
} from '../utils/fieldRecensementRateLimitStore.js';
import { emitFieldRecensementPilotEvent } from '../utils/fieldRecensementPilotTelemetry.js';

/**
 * @param {'create'|'correction'|'read'|'admin'} bucket
 */
export function fieldRecensementRateLimit(bucket) {
  return async function fieldRecensementRateLimitMiddleware(req, res, next) {
    const cfg = getFieldRecensementRateLimitConfig();
    const limit = cfg[bucket];
    if (!limit || limit < 1) return next();

    const userId =
      req.utilisateur?._id?.toString?.() ||
      req.utilisateur?.id?.toString?.() ||
      null;
    if (!userId) {
      // Auth aurait dû peupler req.utilisateur ; ne pas rate-limiter anonymement ici.
      return next();
    }

    const key = `frv1:${bucket}:u:${hashRateLimitIdentity(userId)}`;
    const store = getFieldRecensementRateLimitStore();

    let result;
    try {
      result = await store.consume(key, limit, cfg.windowMs);
    } catch (err) {
      emitFieldRecensementPilotEvent('rate_limit_store_error', {
        bucket,
        storeKind: store.kind || 'unknown',
      });
      if (cfg.failOpenOnStoreError) {
        return next();
      }
      return sendFieldRecensementError(
        res,
        req,
        FieldRecensementApiError.fromCode('SERVER_TEMPORARY_ERROR', { cause: err }),
      );
    }

    if (result.allowed) return next();

    const retryAfterSeconds = Math.max(1, Number(result.retryAfterSeconds) || 60);
    emitFieldRecensementPilotEvent('rate_limited', {
      bucket,
      retryAfterSeconds,
      storeKind: store.kind || 'memory',
    });

    const apiErr = FieldRecensementApiError.fromCode('RATE_LIMITED', {
      details: { retryAfterSeconds },
    });
    apiErr.retryAfterSeconds = retryAfterSeconds;
    return sendFieldRecensementError(res, req, apiErr);
  };
}

export const rateLimitCreate = fieldRecensementRateLimit('create');
export const rateLimitCorrection = fieldRecensementRateLimit('correction');
export const rateLimitRead = fieldRecensementRateLimit('read');
export const rateLimitAdmin = fieldRecensementRateLimit('admin');

export default fieldRecensementRateLimit;
