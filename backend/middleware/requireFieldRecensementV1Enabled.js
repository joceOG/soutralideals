/**
 * R1-10 — Feature flag V1 fail-closed (après auth / avant Multer).
 */
import { getFieldRecensementV1Config } from '../config/fieldRecensementV1Config.js';
import { FieldRecensementApiError } from '../utils/FieldRecensementApiError.js';
import { sendFieldRecensementError } from '../utils/fieldRecensementV1Respond.js';

export function requireFieldRecensementV1Enabled(req, res, next) {
  const cfg = getFieldRecensementV1Config();
  if (cfg.enabled) return next();

  return sendFieldRecensementError(
    res,
    req,
    FieldRecensementApiError.fromCode('FIELD_RECENSEMENT_V1_DISABLED'),
  );
}

export default requireFieldRecensementV1Enabled;
