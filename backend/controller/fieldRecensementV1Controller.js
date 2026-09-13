/**
 * R1-03 / R1-11 — Contrôleur HTTP v1 FieldRecensement.
 */
import { createFieldRecensement } from '../services/fieldRecensementCreateService.js';
import {
  getFieldRecensementForActor,
  listMineFieldRecensements,
} from '../services/fieldRecensementReadService.js';
import {
  getAdminFieldRecensementQueueStats,
  listAdminFieldRecensementQueue,
} from '../services/fieldRecensementAdminQueueService.js';
import {
  patchFieldRecensement,
  resubmitFieldRecensement,
} from '../services/fieldRecensementCorrectionService.js';
import {
  approveFieldRecensement,
  rejectFieldRecensement,
  requestCorrectionFieldRecensement,
} from '../services/fieldRecensementAdminModerationService.js';
import { retryPublishFieldRecensement } from '../services/fieldRecensementPublishService.js';
import {
  suspendFieldRecensement,
  reactivateFieldRecensement,
} from '../services/fieldRecensementLifecycleService.js';
import { FieldRecensementApiError } from '../utils/FieldRecensementApiError.js';
import {
  cleanupUploadedFiles,
  sendFieldRecensementError,
  sendFieldRecensementReadSuccess,
  sendFieldRecensementSuccess,
} from '../utils/fieldRecensementV1Respond.js';

function toPublicData(doc, matchStatus) {
  return {
    id: String(doc._id),
    clientMutationId: doc.clientMutationId,
    reviewStatus: doc.reviewStatus,
    publicationStatus: doc.publicationStatus,
    revision: doc.revision,
    matchStatus,
  };
}

export async function createFieldRecensementController(req, res, next) {
  try {
    let payload;
    try {
      payload = JSON.parse(req.body?.payload ?? '');
    } catch {
      cleanupUploadedFiles(req);
      return sendFieldRecensementError(
        res,
        req,
        FieldRecensementApiError.fromCode('RECENSEMENT_VALIDATION_FAILED', {
          message: 'Payload JSON invalide.',
        }),
      );
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      cleanupUploadedFiles(req);
      return sendFieldRecensementError(
        res,
        req,
        FieldRecensementApiError.fromCode('RECENSEMENT_VALIDATION_FAILED', {
          message: 'Payload objet requis.',
        }),
      );
    }

    if (req.fieldAppBuild != null && payload.app?.buildNumber != null) {
      const payloadBuild = Number(payload.app.buildNumber);
      if (!Number.isInteger(payloadBuild) || payloadBuild !== req.fieldAppBuild) {
        cleanupUploadedFiles(req);
        return sendFieldRecensementError(
          res,
          req,
          FieldRecensementApiError.fromCode('APP_BUILD_MISMATCH', {
            details: {
              headerBuildNumber: req.fieldAppBuild,
              payloadBuildNumber: payload.app.buildNumber,
            },
          }),
        );
      }
    }

    const photoFile = req.files?.profilePhoto?.[0] || null;

    const result = await createFieldRecensement({
      agentUser: req.utilisateur,
      payload,
      profilePhotoFile: photoFile ? { path: photoFile.path } : null,
    });

    cleanupUploadedFiles(req);

    const data = toPublicData(result.doc, result.matchStatus);

    if (result.kind === 'created') {
      return sendFieldRecensementSuccess(res, 'RECENSEMENT_CREATED', data);
    }
    if (result.kind === 'already') {
      return sendFieldRecensementSuccess(res, 'RECENSEMENT_ALREADY_APPLIED', data);
    }
    if (result.kind === 'processing') {
      return sendFieldRecensementSuccess(res, 'RECENSEMENT_PROCESSING', data);
    }

    return sendFieldRecensementError(
      res,
      req,
      FieldRecensementApiError.fromCode('SERVER_TEMPORARY_ERROR'),
    );
  } catch (err) {
    cleanupUploadedFiles(req);
    return sendFieldRecensementError(res, req, err);
  }
}

export async function listMineFieldRecensementsController(req, res, next) {
  try {
    const data = await listMineFieldRecensements({
      agentUser: req.utilisateur,
      query: req.query,
    });
    return sendFieldRecensementReadSuccess(res, data);
  } catch (err) {
    return sendFieldRecensementError(res, req, err);
  }
}

/** R3-01 — file admin globale (curseur). Pas de X-App-Build. */
export async function listAdminFieldRecensementQueueController(req, res) {
  try {
    const data = await listAdminFieldRecensementQueue({ query: req.query });
    return sendFieldRecensementReadSuccess(res, data);
  } catch (err) {
    return sendFieldRecensementError(res, req, err);
  }
}

/** R3-01 — compteurs modération (agrégation unique). */
export async function getAdminFieldRecensementQueueStatsController(req, res) {
  try {
    const counts = await getAdminFieldRecensementQueueStats({ query: req.query });
    return sendFieldRecensementReadSuccess(res, { counts });
  } catch (err) {
    return sendFieldRecensementError(res, req, err);
  }
}

export async function getFieldRecensementByIdController(req, res, next) {
  try {
    const result = await getFieldRecensementForActor({
      id: req.params.id,
      actorUser: req.utilisateur,
      req,
    });
    return sendFieldRecensementReadSuccess(res, result.data);
  } catch (err) {
    return sendFieldRecensementError(res, req, err);
  }
}

function parsePatchBody(req) {
  if (req.is('multipart/form-data') || req.body?.payload) {
    try {
      return JSON.parse(req.body?.payload ?? '');
    } catch {
      throw FieldRecensementApiError.fromCode('RECENSEMENT_VALIDATION_FAILED', {
        message: 'Payload JSON invalide.',
      });
    }
  }
  return req.body;
}

export async function patchFieldRecensementController(req, res, next) {
  try {
    const body = parsePatchBody(req);
    const photoFile = req.files?.profilePhoto?.[0] || null;
    const result = await patchFieldRecensement({
      id: req.params.id,
      actorUser: req.utilisateur,
      req,
      body,
      profilePhotoFile: photoFile ? { path: photoFile.path } : null,
    });
    cleanupUploadedFiles(req);
    return sendFieldRecensementSuccess(res, result.code, result.data);
  } catch (err) {
    cleanupUploadedFiles(req);
    return sendFieldRecensementError(res, req, err);
  }
}

export async function resubmitFieldRecensementController(req, res, next) {
  try {
    const result = await resubmitFieldRecensement({
      id: req.params.id,
      actorUser: req.utilisateur,
      req,
      body: req.body,
    });
    return sendFieldRecensementSuccess(res, result.code, result.data);
  } catch (err) {
    return sendFieldRecensementError(res, req, err);
  }
}

function sendAdminDecision(res, req, result) {
  if (result.success === false || (result.status != null && result.status >= 400)) {
    return sendFieldRecensementError(
      res,
      req,
      FieldRecensementApiError.fromCode(result.code || 'SERVER_TEMPORARY_ERROR'),
    );
  }
  return sendFieldRecensementSuccess(res, result.code, result.data);
}

export async function requestCorrectionController(req, res) {
  try {
    const result = await requestCorrectionFieldRecensement({
      id: req.params.id,
      actorUser: req.utilisateur,
      body: req.body,
    });
    return sendAdminDecision(res, req, result);
  } catch (err) {
    return sendFieldRecensementError(res, req, err);
  }
}

export async function rejectFieldRecensementController(req, res) {
  try {
    const result = await rejectFieldRecensement({
      id: req.params.id,
      actorUser: req.utilisateur,
      body: req.body,
    });
    return sendAdminDecision(res, req, result);
  } catch (err) {
    return sendFieldRecensementError(res, req, err);
  }
}

export async function approveFieldRecensementController(req, res) {
  try {
    const result = await approveFieldRecensement({
      id: req.params.id,
      actorUser: req.utilisateur,
      body: req.body,
    });
    return sendAdminDecision(res, req, result);
  } catch (err) {
    return sendFieldRecensementError(res, req, err);
  }
}

export async function publishFieldRecensementController(req, res) {
  try {
    const result = await retryPublishFieldRecensement({
      id: req.params.id,
      actorUser: req.utilisateur,
      body: req.body,
    });
    return sendAdminDecision(res, req, result);
  } catch (err) {
    return sendFieldRecensementError(res, req, err);
  }
}

export async function suspendFieldRecensementController(req, res) {
  try {
    const result = await suspendFieldRecensement({
      id: req.params.id,
      actorUser: req.utilisateur,
      body: req.body,
    });
    return sendAdminDecision(res, req, result);
  } catch (err) {
    return sendFieldRecensementError(res, req, err);
  }
}

export async function reactivateFieldRecensementController(req, res) {
  try {
    const result = await reactivateFieldRecensement({
      id: req.params.id,
      actorUser: req.utilisateur,
      body: req.body,
    });
    return sendAdminDecision(res, req, result);
  } catch (err) {
    return sendFieldRecensementError(res, req, err);
  }
}
