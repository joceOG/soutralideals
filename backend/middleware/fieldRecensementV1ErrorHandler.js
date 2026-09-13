/**
 * R1-11 — Gestionnaire d’erreurs limité au router Field Recensement V1.
 */
import { sendFieldRecensementError } from '../utils/fieldRecensementV1Respond.js';
import { FieldRecensementApiError } from '../utils/FieldRecensementApiError.js';

export function fieldRecensementV1ErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  return sendFieldRecensementError(res, req, err);
}

/** 404 JSON pour chemins sous /field-recensements non matchés (pas OPTIONS). */
export function fieldRecensementV1NotFound(req, res, next) {
  if (req.method === 'OPTIONS') return next();
  const p = req.path || '';
  if (p === '/field-recensements' || p.startsWith('/field-recensements/')) {
    return next(FieldRecensementApiError.fromCode('RECENSEMENT_ROUTE_NOT_FOUND'));
  }
  return next();
}

export default fieldRecensementV1ErrorHandler;
