/**
 * R1-11 — Sérialisation réponses Field Recensement V1.
 */
import fs from 'node:fs';
import {
  getFieldRecensementApiCodeDef,
  resolveFieldRecensementApiCode,
  FIELD_RECENSEMENT_API_CODES,
} from '../constants/fieldRecensementApiCodes.js';
import { FieldRecensementApiError } from './FieldRecensementApiError.js';

export function cleanupUploadedFiles(req) {
  const bags = [];
  if (req.file) bags.push(req.file);
  if (Array.isArray(req.files)) bags.push(...req.files);
  else if (req.files && typeof req.files === 'object') {
    for (const v of Object.values(req.files)) {
      if (Array.isArray(v)) bags.push(...v);
      else if (v) bags.push(v);
    }
  }
  for (const f of bags) {
    if (f?.path && fs.existsSync(f.path)) {
      try {
        fs.unlinkSync(f.path);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * @param {import('express').Response} res
 * @param {string} code
 * @param {object} [data]
 * @param {string} [message]
 */
export function sendFieldRecensementSuccess(res, code, data, message) {
  const resolved = resolveFieldRecensementApiCode(code);
  const def = getFieldRecensementApiCodeDef(resolved);
  res.set('Cache-Control', 'no-store');
  if (def.retryAfterSeconds && def.retryable) {
    res.set('Retry-After', String(def.retryAfterSeconds));
  }
  const body = {
    success: true,
    code: resolved,
    message: message || def.defaultMessage,
    retryable: def.retryable,
  };
  if (data !== undefined) body.data = data;
  return res.status(def.httpStatus).json(body);
}

/**
 * Lecture GET : structure stable sans code artificiel.
 * @param {import('express').Response} res
 * @param {object} data
 */
export function sendFieldRecensementReadSuccess(res, data) {
  res.set('Cache-Control', 'no-store');
  return res.status(200).json({
    success: true,
    data,
  });
}

/**
 * @param {import('express').Response} res
 * @param {import('express').Request} req
 * @param {unknown} err
 */
export function sendFieldRecensementError(res, req, err) {
  cleanupUploadedFiles(req);

  let apiErr;
  if (err instanceof FieldRecensementApiError || err?.isFieldRecensementApiError) {
    apiErr = err;
  } else if (err?.code && FIELD_RECENSEMENT_API_CODES[resolveFieldRecensementApiCode(err.code)]) {
    apiErr = new FieldRecensementApiError(err.code, {
      message: err.message,
      details: err.details,
      cause: err,
    });
  } else if (err?.name === 'ValidationError') {
    apiErr = new FieldRecensementApiError('RECENSEMENT_VALIDATION_FAILED', {
      cause: err,
    });
  } else if (err?.code === 11000 || err?.code === '11000') {
    apiErr = new FieldRecensementApiError('IDEMPOTENCY_KEY_REUSED', {
      message: 'Conflit d’unicité.',
      cause: err,
    });
  } else if (err?.name === 'CastError') {
    apiErr = new FieldRecensementApiError('RECENSEMENT_ID_INVALID', { cause: err });
  } else if (err?.code === 'LIMIT_FILE_SIZE') {
    apiErr = new FieldRecensementApiError('RECENSEMENT_PHOTO_TOO_LARGE', { cause: err });
  } else if (err?.code === 'LIMIT_UNEXPECTED_FILE' || err?.code === 'LIMIT_FILE_COUNT') {
    apiErr = new FieldRecensementApiError('RECENSEMENT_PHOTO_INVALID', { cause: err });
  } else if (err?.message && /image|mime|multer|Unexpected field/i.test(String(err.message))) {
    apiErr = new FieldRecensementApiError('RECENSEMENT_PHOTO_INVALID', { cause: err });
  } else if (err?.status && err?.code) {
    try {
      apiErr = new FieldRecensementApiError(err.code, {
        message: err.message,
        details: err.details,
        cause: err,
      });
    } catch {
      apiErr = new FieldRecensementApiError('SERVER_TEMPORARY_ERROR', { cause: err });
    }
  } else {
    apiErr = new FieldRecensementApiError('SERVER_TEMPORARY_ERROR', { cause: err });
  }

  res.set('Cache-Control', 'no-store');
  if (apiErr.retryable && apiErr.retryAfterSeconds) {
    res.set('Retry-After', String(apiErr.retryAfterSeconds));
  }

  if (req.app?.locals?.logger?.warn) {
    try {
      req.app.locals.logger.warn({
        code: apiErr.code,
        method: req.method,
        path: req.originalUrl?.split('?')[0],
        httpStatus: apiErr.status,
        retryable: apiErr.retryable,
        requestId: req.id || req.headers['x-request-id'],
        role: req.utilisateur?.role,
      });
    } catch {
      /* ignore */
    }
  } else if (process.env.NODE_ENV !== 'test' && apiErr.cause) {
    console.error('[field-recensement-v1]', apiErr.code, apiErr.cause?.message || apiErr.cause);
  }

  return res.status(apiErr.status).json(apiErr.toJSON());
}

export default {
  sendFieldRecensementSuccess,
  sendFieldRecensementReadSuccess,
  sendFieldRecensementError,
  cleanupUploadedFiles,
};
