/**
 * R1-03 — Autorisation agent recensement (canCreateRecensement).
 */
import { userCanCreateRecensement } from '../utils/recensementPolicy.js';
import { FieldRecensementApiError } from '../utils/FieldRecensementApiError.js';
import { sendFieldRecensementError } from '../utils/fieldRecensementV1Respond.js';

export function requireFieldRecenseur(req, res, next) {
  if (!userCanCreateRecensement(req.utilisateur)) {
    return sendFieldRecensementError(
      res,
      req,
      FieldRecensementApiError.fromCode('RECENSEUR_PERMISSION_REVOKED'),
    );
  }
  return next();
}

export default requireFieldRecenseur;
