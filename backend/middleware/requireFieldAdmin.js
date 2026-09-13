/**
 * R1-08A — Middleware admin réel (role Admin en base).
 */
import { isAdmin } from '../utils/accessControl.js';
import { FieldRecensementApiError } from '../utils/FieldRecensementApiError.js';
import { sendFieldRecensementError } from '../utils/fieldRecensementV1Respond.js';

export function requireFieldAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return sendFieldRecensementError(
      res,
      req,
      FieldRecensementApiError.fromCode('ADMIN_REQUIRED'),
    );
  }
  return next();
}

export default requireFieldAdmin;
