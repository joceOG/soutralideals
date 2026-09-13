/**
 * R1-10 — Contrôle X-App-Build pour clients SDEALSIDENTIFICATION.
 * Admin réel (isAdmin) exempté. Faux Admin non exempté.
 */
import { isAdmin } from '../utils/accessControl.js';
import {
  getFieldRecensementV1Config,
  parsePositiveBuildNumber,
} from '../config/fieldRecensementV1Config.js';
import { FieldRecensementApiError } from '../utils/FieldRecensementApiError.js';
import { sendFieldRecensementError } from '../utils/fieldRecensementV1Respond.js';

function readRawBuildHeader(req) {
  const raw = req.headers['x-app-build'];
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    if (raw.length !== 1) return { multi: true, value: raw };
    return String(raw[0]);
  }
  return String(raw);
}

function sendBlocked(res, req, details) {
  return sendFieldRecensementError(
    res,
    req,
    FieldRecensementApiError.fromCode('APP_VERSION_BLOCKED', { details }),
  );
}

/**
 * @param {{ exemptAdmin?: boolean }} [opts]
 */
export function requireFieldAppBuild(opts = {}) {
  const exemptAdmin = opts.exemptAdmin === true;

  return function requireFieldAppBuildMiddleware(req, res, next) {
    if (exemptAdmin && isAdmin(req)) {
      return next();
    }

    const cfg = getFieldRecensementV1Config();
    const min = cfg.minBuildAndroid;
    if (!cfg.enabled || min == null) {
      return next();
    }

    const raw = readRawBuildHeader(req);
    if (raw == null || raw === '') {
      return sendBlocked(res, req, {
        reason: 'BUILD_HEADER_REQUIRED',
        minimumBuildNumber: min,
        updateRequired: true,
        updateChannel: 'internal',
      });
    }
    if (typeof raw === 'object' && raw.multi) {
      return sendBlocked(res, req, {
        reason: 'BUILD_HEADER_INVALID',
        minimumBuildNumber: min,
        updateRequired: true,
        updateChannel: 'internal',
      });
    }

    const parsed = parsePositiveBuildNumber(raw);
    if (!parsed.ok) {
      return sendBlocked(res, req, {
        reason: 'BUILD_HEADER_INVALID',
        minimumBuildNumber: min,
        currentBuildNumber: null,
        updateRequired: true,
        updateChannel: 'internal',
      });
    }

    req.fieldAppBuild = parsed.value;

    if (parsed.value < min) {
      return sendBlocked(res, req, {
        reason: 'BUILD_TOO_OLD',
        currentBuildNumber: parsed.value,
        minimumBuildNumber: min,
        updateRequired: true,
        updateChannel: 'internal',
      });
    }

    return next();
  };
}

export const requireFieldAgentAppBuild = requireFieldAppBuild({ exemptAdmin: false });
export const requireFieldAppBuildUnlessAdmin = requireFieldAppBuild({ exemptAdmin: true });

export default requireFieldAppBuild;
