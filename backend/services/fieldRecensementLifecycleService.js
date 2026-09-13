/**
 * R1-08B — Suspension / réactivation fail-safe FieldRecensement.
 * Principe : suspension incomplète → profil masqué ; réactivation incomplète → profil masqué.
 */
import crypto from 'node:crypto';
import FieldRecensement from '../models/fieldRecensementModel.js';
import FieldRecensementOperation from '../models/fieldRecensementOperationModel.js';
import FieldRecensementAuditEvent from '../models/fieldRecensementAuditEventModel.js';
import Utilisateur from '../models/utilisateurModel.js';
import Service from '../models/serviceModel.js';
import Categorie from '../models/categorieModel.js';
import { apiError } from './fieldRecensementCreateService.js';
import { toAdminFieldRecensementDetail } from '../utils/fieldRecensementDto.js';
import {
  SUSPEND_REASON_CODES,
  REACTIVATE_REASON_CODES,
  MAX_CORRECTION_MESSAGE_LEN,
} from '../utils/fieldRecensementAdminReasons.js';
import { invalidateCache } from '../middleware/cacheInvalidation.js';
import { revokePublicDerivative } from '../utils/fieldRecensementMediaAdapter.js';
import {
  publishFieldRecensement,
  getProfileModel,
} from './fieldRecensementPublishService.js';

const BODY_KEYS = Object.freeze([
  'operationMutationId',
  'expectedRevision',
  'reasonCode',
  'message',
]);

function crashAfter(step) {
  const key = process.env.TEST_SUSPEND_CRASH_AFTER || process.env.TEST_REACTIVATE_CRASH_AFTER;
  if (key === step) {
    const err = new Error(`TEST_CRASH:${step}`);
    err.status = 503;
    err.code = process.env.TEST_REACTIVATE_CRASH_AFTER
      ? 'RECENSEMENT_REACTIVATION_TEMPORARY_FAILURE'
      : 'RECENSEMENT_SUSPENSION_TEMPORARY_FAILURE';
    err.retryable = true;
    throw err;
  }
}

function isValidObjectIdParam(id) {
  return /^[a-fA-F0-9]{24}$/.test(String(id));
}

function assertStrictBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Corps JSON objet requis.');
  }
  for (const key of Object.keys(body)) {
    if (key.startsWith('$') || key.includes('__proto__') || key === 'constructor') {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Propriété interdite.');
    }
    if (!BODY_KEYS.includes(key)) {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', `Propriété inconnue : ${key}`);
    }
  }
}

function parseBody(body) {
  assertStrictBody(body);
  const operationMutationId = body.operationMutationId;
  const expectedRevision = Number(body.expectedRevision);
  if (!operationMutationId || !/^[0-9a-fA-F-]{36}$/.test(String(operationMutationId))) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'operationMutationId UUID requis.');
  }
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'expectedRevision invalide.');
  }
  if (body.requestHash != null || body.operationHash != null) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Hash client interdit.');
  }
  return { operationMutationId, expectedRevision };
}

function sanitizeMessage(message) {
  if (message == null || message === '') return undefined;
  const s = String(message).trim();
  if (s.length > MAX_CORRECTION_MESSAGE_LEN) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'message trop long.');
  }
  return s;
}

function adminDto(doc, extras = {}) {
  return { ...toAdminFieldRecensementDetail(doc), ...extras };
}

function invalidatePublicCaches() {
  try {
    invalidateCache('/api/prestataire');
    invalidateCache('/api/freelance');
    invalidateCache('/api/vendeur');
    invalidateCache('/api/search');
    invalidateCache('/api/article');
    invalidateCache('/api/freelance-services');
  } catch {
    /* ignore */
  }
}

async function writeAudit({
  fieldRecensementId,
  operationMutationId,
  actorId,
  action,
  reasonCode,
  previousStatus,
  nextStatus,
  revisionBefore,
  revisionAfter,
  note,
}) {
  const key = `${operationMutationId}:${action}`;
  try {
    if (process.env.TEST_AUDIT_FAIL === '1') {
      const e = new Error('TEST_AUDIT_FAIL');
      e.code = 11000;
      throw e;
    }
    await FieldRecensementAuditEvent.create({
      fieldRecensementId,
      kind: 'decision',
      operationMutationId: key,
      actorId,
      at: new Date(),
      meta: {
        action,
        outcome: 'success',
        reasonCode,
        previousStatus,
        nextStatus,
        revisionBefore,
        revisionAfter,
        note: note ? String(note).slice(0, 500) : undefined,
      },
    });
  } catch (e) {
    if (e?.code === 11000) return;
    throw e;
  }
}

async function hideProfile(doc, linked, fenceEpoch) {
  if (!linked?.id) return;
  const Model = getProfileModel(doc.professionalType);
  await Model.updateOne(
    { _id: linked.id, sourceFieldRecensementId: doc._id },
    {
      $set: {
        fieldPublicationStatus: 'suspended',
        fieldPublicationEpoch: fenceEpoch,
        status: 'suspended',
        ...(doc.professionalType !== 'prestataire'
          ? { accountStatus: 'Suspended' }
          : {}),
      },
    },
  );
}

/**
 * POST suspend
 */
export async function suspendFieldRecensement({ id, actorUser, body }) {
  if (!isValidObjectIdParam(id)) {
    throw apiError(400, 'RECENSEMENT_ID_INVALID', 'Identifiant invalide.');
  }
  const { operationMutationId, expectedRevision } = parseBody(body);
  const reasonCode = body.reasonCode;
  if (!SUSPEND_REASON_CODES.includes(reasonCode)) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'reasonCode suspension inconnu.');
  }
  const message = sanitizeMessage(body.message);

  const opHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        action: 'suspend',
        expectedRevision,
        reasonCode,
        message: message || null,
      }),
      'utf8',
    )
    .digest('hex');

  const existingOp = await FieldRecensementOperation.findOne({
    fieldRecensementId: id,
    operationMutationId,
  }).select('+operationHash');

  if (existingOp) {
    if (existingOp.operationHash !== opHash) {
      throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Opération réutilisée avec contenu différent.');
    }
    const latest = await FieldRecensement.findById(id).select('+linkedProfile');
    await writeAudit({
      fieldRecensementId: id,
      operationMutationId,
      actorId: actorUser._id,
      action: 'suspend_succeeded',
      reasonCode,
      previousStatus: 'approved',
      nextStatus: 'suspended',
      revisionBefore: existingOp.revisionBefore,
      revisionAfter: existingOp.revisionAfter,
      note: message,
    });
    return {
      kind: 'already',
      code: 'RECENSEMENT_ALREADY_APPLIED',
      status: 200,
      data: adminDto(latest),
      retryable: false,
    };
  }

  const doc = await FieldRecensement.findById(id).select(
    '+linkedProfile +publicationFenceEpoch +media.profilePhoto.publicId +media.profilePhoto.ref +media.profilePhoto.promotedPublicUrl +media.profilePhoto.publicRevocationStatus',
  );
  if (!doc) throw apiError(404, 'RECENSEMENT_NOT_FOUND', 'Dossier introuvable.');

  if (doc.reviewStatus === 'suspended') {
    throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Dossier déjà suspendu.');
  }
  if (doc.reviewStatus !== 'approved') {
    throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Suspension réservée aux dossiers approved.');
  }
  if (doc.revision !== expectedRevision) {
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: doc.revision,
    });
  }

  crashAfter('before_hide');

  // Transition atomique + fencing + masquage profil
  const now = new Date();
  const updated = await FieldRecensement.findOneAndUpdate(
    {
      _id: doc._id,
      reviewStatus: 'approved',
      revision: expectedRevision,
    },
    {
      $set: {
        reviewStatus: 'suspended',
        publicationStatus: 'suspended',
        revision: expectedRevision + 1,
        lastOperationMutationId: operationMutationId,
      },
      $inc: { publicationFenceEpoch: 1 },
      $push: {
        decisionHistory: {
          action: 'suspend',
          actorId: actorUser._id,
          at: now,
          note: reasonCode,
        },
        operationHashes: {
          operationMutationId,
          requestHash: opHash,
          at: now,
        },
      },
    },
    { new: true },
  ).select('+linkedProfile +publicationFenceEpoch +media.profilePhoto.publicId');

  if (!updated) {
    const latest = await FieldRecensement.findById(id).select('revision reviewStatus').lean();
    if (latest?.reviewStatus === 'suspended') {
      throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Dossier déjà suspendu.');
    }
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: latest?.revision,
    });
  }

  const fenceEpoch = Number(updated.publicationFenceEpoch) || 1;
  const linked = updated.linkedProfile || doc.linkedProfile;

  try {
    await hideProfile(updated, linked, fenceEpoch);
    crashAfter('after_hide');
    invalidatePublicCaches();
    await writeAudit({
      fieldRecensementId: id,
      operationMutationId,
      actorId: actorUser._id,
      action: 'profile_hidden',
      reasonCode,
      previousStatus: 'approved',
      nextStatus: 'suspended',
      revisionBefore: expectedRevision,
      revisionAfter: updated.revision,
    });

    crashAfter('after_flags');

    // Révocation dérivé public (optionnelle / retryable) — ne touche pas l’authenticated
    const publicId = updated.media?.profilePhoto?.publicId;
    if (publicId && !String(publicId).startsWith('cld:auth:')) {
      await FieldRecensement.updateOne(
        { _id: updated._id },
        { $set: { 'media.profilePhoto.publicRevocationStatus': 'requested' } },
      );
      await writeAudit({
        fieldRecensementId: id,
        operationMutationId,
        actorId: actorUser._id,
        action: 'public_media_revocation_requested',
        reasonCode,
        previousStatus: 'approved',
        nextStatus: 'suspended',
        revisionBefore: expectedRevision,
        revisionAfter: updated.revision,
      });
      crashAfter('during_media_revoke');
      try {
        await revokePublicDerivative({ publicId });
        await FieldRecensement.updateOne(
          { _id: updated._id },
          {
            $set: { 'media.profilePhoto.publicRevocationStatus': 'revoked' },
            $unset: { 'media.profilePhoto.promotedPublicUrl': 1 },
          },
        );
        await writeAudit({
          fieldRecensementId: id,
          operationMutationId,
          actorId: actorUser._id,
          action: 'public_media_revoked',
          reasonCode,
          previousStatus: 'approved',
          nextStatus: 'suspended',
          revisionBefore: expectedRevision,
          revisionAfter: updated.revision,
        });
      } catch {
        await FieldRecensement.updateOne(
          { _id: updated._id },
          { $set: { 'media.profilePhoto.publicRevocationStatus': 'failed' } },
        );
        // Profil déjà masqué — échec révocation n’annule pas la suspension
      }
    }

    crashAfter('before_finalize');

    try {
      await FieldRecensementOperation.create({
        fieldRecensementId: updated._id,
        operationMutationId,
        action: 'suspend',
        operationHash: opHash,
        actorId: actorUser._id,
        result: 'suspended',
        revisionBefore: expectedRevision,
        revisionAfter: updated.revision,
        httpStatus: 200,
        resultCode: 'RECENSEMENT_SUSPENDED',
        responseSnapshot: {
          id: String(updated._id),
          revision: updated.revision,
          reviewStatus: 'suspended',
          publicationStatus: 'suspended',
        },
      });
    } catch (e) {
      if (e?.code !== 11000) throw e;
    }

    crashAfter('before_audit');
    await writeAudit({
      fieldRecensementId: id,
      operationMutationId,
      actorId: actorUser._id,
      action: 'suspend_succeeded',
      reasonCode,
      previousStatus: 'approved',
      nextStatus: 'suspended',
      revisionBefore: expectedRevision,
      revisionAfter: updated.revision,
      note: message,
    });

    const finalDoc = await FieldRecensement.findById(id);
    return {
      kind: 'suspended',
      code: 'RECENSEMENT_SUSPENDED',
      status: 200,
      data: adminDto(finalDoc),
      retryable: false,
    };
  } catch (err) {
    // Fail-safe : s’assurer que le profil reste masqué
    try {
      await hideProfile(updated, linked, fenceEpoch);
      invalidatePublicCaches();
    } catch {
      /* ignore */
    }
    await writeAudit({
      fieldRecensementId: id,
      operationMutationId,
      actorId: actorUser._id,
      action: 'suspend_failed',
      reasonCode,
      previousStatus: 'approved',
      nextStatus: 'suspended',
      revisionBefore: expectedRevision,
      revisionAfter: updated.revision,
      note: err.code || err.message,
    });
    if (err.status) {
      return {
        kind: 'failed',
        code: err.code || 'RECENSEMENT_SUSPENSION_TEMPORARY_FAILURE',
        status: err.status,
        data: adminDto(await FieldRecensement.findById(id)),
        retryable: err.retryable !== false,
        success: false,
      };
    }
    throw apiError(503, 'RECENSEMENT_SUSPENSION_TEMPORARY_FAILURE', err.message, undefined, true);
  }
}

/**
 * POST reactivate — republie via pipeline R1-09 sans créer de doublon.
 */
export async function reactivateFieldRecensement({ id, actorUser, body }) {
  if (!isValidObjectIdParam(id)) {
    throw apiError(400, 'RECENSEMENT_ID_INVALID', 'Identifiant invalide.');
  }
  const { operationMutationId, expectedRevision } = parseBody(body);
  const reasonCode = body.reasonCode;
  if (!REACTIVATE_REASON_CODES.includes(reasonCode)) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'reasonCode réactivation inconnu.');
  }
  const message = sanitizeMessage(body.message);

  const opHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        action: 'reactivate',
        expectedRevision,
        reasonCode,
        message: message || null,
      }),
      'utf8',
    )
    .digest('hex');

  const existingOp = await FieldRecensementOperation.findOne({
    fieldRecensementId: id,
    operationMutationId,
  }).select('+operationHash');

  if (existingOp) {
    if (existingOp.operationHash !== opHash) {
      throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Opération réutilisée avec contenu différent.');
    }
    const latest = await FieldRecensement.findById(id);
    return {
      kind: 'already',
      code: 'RECENSEMENT_ALREADY_APPLIED',
      status: 200,
      data: adminDto(latest, { published: latest?.publicationStatus === 'published' }),
      retryable: false,
    };
  }

  const doc = await FieldRecensement.findById(id).select(
    '+linkedProfile +publicationLinkedUtilisateurId +publicationFenceEpoch +media.profilePhoto.ref +media.profilePhoto.publicId',
  );
  if (!doc) throw apiError(404, 'RECENSEMENT_NOT_FOUND', 'Dossier introuvable.');

  if (doc.reviewStatus !== 'suspended') {
    throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Réactivation réservée aux dossiers suspended.');
  }
  if (doc.revision !== expectedRevision) {
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: doc.revision,
    });
  }

  crashAfter('after_lease');

  // Remettre approved sans published ; profil reste suspended jusqu’au seal
  const now = new Date();
  const updated = await FieldRecensement.findOneAndUpdate(
    {
      _id: doc._id,
      reviewStatus: 'suspended',
      revision: expectedRevision,
    },
    {
      $set: {
        reviewStatus: 'approved',
        publicationStatus: 'ready',
        revision: expectedRevision + 1,
        lastOperationMutationId: operationMutationId,
      },
      $push: {
        decisionHistory: {
          action: 'reactivate',
          actorId: actorUser._id,
          at: now,
          note: reasonCode,
        },
        operationHashes: {
          operationMutationId,
          requestHash: opHash,
          at: now,
        },
      },
    },
    { new: true },
  ).select('+linkedProfile +publicationFenceEpoch +publicationLinkedUtilisateurId');

  if (!updated) {
    const latest = await FieldRecensement.findById(id).select('revision').lean();
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: latest?.revision,
    });
  }

  await writeAudit({
    fieldRecensementId: id,
    operationMutationId,
    actorId: actorUser._id,
    action: 'reactivate_started',
    reasonCode,
    previousStatus: 'suspended',
    nextStatus: 'approved',
    revisionBefore: expectedRevision,
    revisionAfter: updated.revision,
    note: message,
  });

  try {
    crashAfter('after_revalidate');

    // Vérifier utilisateur / profil liés — ne pas activer le stub
    if (updated.publicationLinkedUtilisateurId) {
      const u = await Utilisateur.findById(updated.publicationLinkedUtilisateurId);
      if (!u) {
        throw apiError(409, 'RECENSEMENT_REACTIVATION_BLOCKED', 'Utilisateur lié introuvable.');
      }
    }
    const linked = updated.linkedProfile;
    if (linked?.id) {
      const Model = getProfileModel(updated.professionalType);
      const profile = await Model.findById(linked.id);
      if (!profile || String(profile.sourceFieldRecensementId) !== String(updated._id)) {
        throw apiError(409, 'RECENSEMENT_REACTIVATION_BLOCKED', 'Profil lié incompatible.');
      }
      // Maintenir non public pendant restauration
      await Model.updateOne(
        { _id: profile._id },
        {
          $set: {
            fieldPublicationStatus: 'ready',
            fieldPublicationEpoch: Number(updated.publicationFenceEpoch) || 0,
            status: 'active',
            ...(updated.professionalType !== 'prestataire'
              ? { accountStatus: 'Active', 'verificationDocuments.isVerified': true }
              : { verifier: true }),
          },
        },
      );
    }

    // Revalider service / catégorie
    if (updated.professionalType === 'prestataire' && updated.business?.serviceId) {
      const svc = await Service.findById(updated.business.serviceId).lean();
      if (!svc) {
        throw apiError(409, 'RECENSEMENT_REACTIVATION_BLOCKED', 'Service introuvable.');
      }
    }
    if (updated.professionalType === 'freelance' && updated.business?.categoryId) {
      const cat = await Categorie.findById(updated.business.categoryId).lean();
      if (!cat) {
        throw apiError(409, 'RECENSEMENT_REACTIVATION_BLOCKED', 'Catégorie introuvable.');
      }
    }

    await writeAudit({
      fieldRecensementId: id,
      operationMutationId,
      actorId: actorUser._id,
      action: 'reactivate_validation_passed',
      reasonCode,
      previousStatus: 'suspended',
      nextStatus: 'approved',
      revisionBefore: expectedRevision,
      revisionAfter: updated.revision,
    });

    crashAfter('after_flags');
    crashAfter('after_media');
    crashAfter('before_dossier_published');

    // Republier via pipeline R1-09 (idempotent, fencing, media)
    const pub = await publishFieldRecensement({
      id: String(updated._id),
      actorUser,
      operationMutationId: `reactivate-publish:${operationMutationId}`,
      ownerKey: `reactivate:${actorUser._id}:${id}`,
    });

    if (pub.kind === 'processing') {
      return {
        kind: 'processing',
        code: 'RECENSEMENT_REACTIVATION_PROCESSING',
        status: 202,
        data: adminDto(await FieldRecensement.findById(id), { retryable: true }),
        retryable: true,
      };
    }

    crashAfter('after_profile_published');

    try {
      await FieldRecensementOperation.create({
        fieldRecensementId: updated._id,
        operationMutationId,
        action: 'reactivate',
        operationHash: opHash,
        actorId: actorUser._id,
        result: 'reactivated',
        revisionBefore: expectedRevision,
        revisionAfter: updated.revision,
        httpStatus: 200,
        resultCode: 'RECENSEMENT_REACTIVATED',
        responseSnapshot: {
          id: String(updated._id),
          revision: updated.revision,
          reviewStatus: 'approved',
          publicationStatus: 'published',
        },
      });
    } catch (e) {
      if (e?.code !== 11000) throw e;
    }

    await writeAudit({
      fieldRecensementId: id,
      operationMutationId,
      actorId: actorUser._id,
      action: 'reactivate_published',
      reasonCode,
      previousStatus: 'suspended',
      nextStatus: 'approved',
      revisionBefore: expectedRevision,
      revisionAfter: updated.revision,
      note: message,
    });

    invalidatePublicCaches();
    const finalDoc = await FieldRecensement.findById(id);
    return {
      kind: 'reactivated',
      code: 'RECENSEMENT_REACTIVATED',
      status: 200,
      data: adminDto(finalDoc, { published: true }),
      retryable: false,
    };
  } catch (err) {
    // Fail-safe : re-masquer le profil
    try {
      const fresh = await FieldRecensement.findById(id).select(
        '+linkedProfile +publicationFenceEpoch',
      );
      if (fresh?.linkedProfile) {
        await hideProfile(
          fresh,
          fresh.linkedProfile,
          Number(fresh.publicationFenceEpoch) || 0,
        );
      }
      if (fresh?.reviewStatus === 'approved' && fresh?.publicationStatus !== 'published') {
        await FieldRecensement.updateOne(
          { _id: id, reviewStatus: 'approved' },
          { $set: { reviewStatus: 'suspended', publicationStatus: 'suspended' } },
        );
      }
      invalidatePublicCaches();
    } catch {
      /* ignore */
    }
    await writeAudit({
      fieldRecensementId: id,
      operationMutationId,
      actorId: actorUser._id,
      action: 'reactivate_failed',
      reasonCode,
      previousStatus: 'suspended',
      nextStatus: 'suspended',
      revisionBefore: expectedRevision,
      revisionAfter: updated.revision,
      note: err.code || err.message,
    });
    if (err.status === 409) {
      return {
        kind: 'blocked',
        code: err.code || 'RECENSEMENT_REACTIVATION_BLOCKED',
        status: 409,
        data: adminDto(await FieldRecensement.findById(id)),
        retryable: false,
        success: false,
      };
    }
    return {
      kind: 'failed',
      code: err.code || 'RECENSEMENT_REACTIVATION_TEMPORARY_FAILURE',
      status: err.status || 503,
      data: adminDto(await FieldRecensement.findById(id)),
      retryable: err.retryable !== false,
      success: false,
    };
  }
}

export default { suspendFieldRecensement, reactivateFieldRecensement };
