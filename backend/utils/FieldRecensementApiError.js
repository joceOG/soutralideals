/**
 * R1-11 — Erreur de domaine Field Recensement V1 (contrat canonique).
 */
import {
  getFieldRecensementApiCodeDef,
  resolveFieldRecensementApiCode,
  FIELD_RECENSEMENT_API_CODES,
} from '../constants/fieldRecensementApiCodes.js';

function sanitizeDetails(code, details) {
  if (details == null) return undefined;
  if (typeof details !== 'object' || Array.isArray(details)) {
    return undefined;
  }
  const def = FIELD_RECENSEMENT_API_CODES[code];
  const allow = def?.detailsAllowlist;
  const out = {};
  for (const [k, v] of Object.entries(details)) {
    if (v === undefined) continue;
    if (allow && !allow.includes(k)) continue;
    if (!allow) {
      // Sans allowlist : n’accepter que structures simples non sensibles
      if (k === 'fields' || k === 'errors' || k === 'action' || k === 'matchReasons') {
        out[k] = v;
      } else if (
        typeof v === 'number' ||
        typeof v === 'boolean' ||
        (typeof v === 'string' && v.length < 200)
      ) {
        out[k] = v;
      }
      continue;
    }
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export class FieldRecensementApiError extends Error {
  /**
   * @param {string} code
   * @param {{ details?: object, message?: string, cause?: unknown }} [opts]
   */
  constructor(code, opts = {}) {
    const resolved = resolveFieldRecensementApiCode(code);
    if (!FIELD_RECENSEMENT_API_CODES[resolved]) {
      const unknown = new Error(
        `FieldRecensementApiError: code non enregistré « ${code} »`,
      );
      unknown.code = 'UNKNOWN_FIELD_RECENSEMENT_API_CODE';
      unknown.unknownCode = code;
      throw unknown;
    }
    const def = getFieldRecensementApiCodeDef(resolved);
    const message =
      typeof opts.message === 'string' && opts.message.trim()
        ? opts.message.trim().slice(0, 300)
        : def.defaultMessage;
    super(message);
    this.name = 'FieldRecensementApiError';
    this.code = resolved;
    this.status = def.httpStatus;
    this.statusCode = def.httpStatus;
    this.retryable = def.retryable;
    this.category = def.category;
    this.details = sanitizeDetails(resolved, opts.details);
    this.retryAfterSeconds = def.retryAfterSeconds;
    this.isFieldRecensementApiError = true;
    if (opts.cause !== undefined) {
      this.cause = opts.cause;
    }
  }

  /**
   * @param {string} code
   * @param {{ details?: object, message?: string, cause?: unknown }} [opts]
   */
  static fromCode(code, opts = {}) {
    return new FieldRecensementApiError(code, opts);
  }

  toJSON() {
    const body = {
      success: false,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    };
    if (this.details) body.details = this.details;
    return body;
  }
}

/**
 * Compat : signature historique apiError(status, code, message, details, retryable).
 * HTTP / retryable dérivés du registre (les args status/retryable sont ignorés s’ils divergent).
 */
export function apiError(status, code, message, details, _retryable = false) {
  try {
    return new FieldRecensementApiError(code, {
      message: typeof message === 'string' ? message : undefined,
      details:
        details && typeof details === 'object' && !Array.isArray(details)
          ? details
          : Array.isArray(details)
            ? { fields: details }
            : details,
    });
  } catch (e) {
    if (e?.code === 'UNKNOWN_FIELD_RECENSEMENT_API_CODE') {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[R1-11] code API inconnu:', code);
      }
      return new FieldRecensementApiError('SERVER_TEMPORARY_ERROR', {
        cause: e,
      });
    }
    throw e;
  }
}

export default FieldRecensementApiError;
