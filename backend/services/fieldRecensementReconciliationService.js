/**
 * R1-15 — Réconciliation publications Field Recensement V1.
 * Priorité : invisibilité. Réutilise publishFieldRecensement / révocation.
 * Dry-run par défaut. Aucune approbation inventée.
 */
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import FieldRecensement from '../models/fieldRecensementModel.js';
import FieldRecensementAuditEvent from '../models/fieldRecensementAuditEventModel.js';
import FieldRecensementReconciliationRun from '../models/fieldRecensementReconciliationRunModel.js';
import FieldRecensementMediaGcCandidate from '../models/fieldRecensementMediaGcCandidateModel.js';
import {
  getFieldRecensementReconciliationConfig,
  resolveReconciliationExecutionMode,
  RECONCILIATION_JOB_NAME,
} from '../config/fieldRecensementReconciliationConfig.js';
import {
  classifyFieldRecensementForReconciliation,
  RECONCILE_CLASS,
} from '../utils/fieldRecensementReconciliationClassification.js';
import {
  publishFieldRecensement,
  getProfileModel,
  SOURCE_V1,
} from '../services/fieldRecensementPublishService.js';
import { revokePublicDerivative } from '../utils/fieldRecensementMediaAdapter.js';
import { invalidateCache } from '../middleware/cacheInvalidation.js';
import {
  acquireFieldRecensementJobLock,
  releaseFieldRecensementJobLock,
  isFieldRecensementJobLockValid,
  MEDIA_GC_JOB_NAME,
} from '../models/fieldRecensementJobLockModel.js';

function bump(map, key) {
  map[key] = (map[key] || 0) + 1;
}

async function loadLinkedProfile(doc) {
  if (!doc.linkedProfile?.id || !doc.professionalType) return null;
  const Model = getProfileModel(doc.professionalType);
  if (!Model) return null;
  return Model.findById(doc.linkedProfile.id)
    .select('source sourceFieldRecensementId fieldPublicationStatus fieldPublicationEpoch status')
    .lean();
}

/**
 * Masque un profil V1 dangereux (containment).
 */
export async function containUnsafeV1Profile({
  dossier,
  profile,
  canMutate,
  invalidate = invalidateCache,
}) {
  if (!profile || !dossier) return { applied: false, reason: 'NO_TARGET' };
  const isV1 =
    profile.source === SOURCE_V1 ||
    String(profile.sourceFieldRecensementId || '') === String(dossier._id);
  if (!isV1) return { applied: false, reason: 'NOT_V1' };
  if (profile.fieldPublicationStatus !== 'published') {
    return { applied: false, reason: 'ALREADY_HIDDEN' };
  }
  if (!canMutate) {
    return { applied: false, reason: 'DRY_RUN', wouldContain: true };
  }

  const Model = getProfileModel(dossier.professionalType);
  const fenceEpoch = (Number(dossier.publicationFenceEpoch) || 0) + 1;
  await FieldRecensement.updateOne(
    { _id: dossier._id },
    { $inc: { publicationFenceEpoch: 1 } },
  );
  await Model.updateOne(
    {
      _id: profile._id,
      sourceFieldRecensementId: dossier._id,
    },
    {
      $set: {
        fieldPublicationStatus: 'suspended',
        fieldPublicationEpoch: fenceEpoch,
        status: 'suspended',
        ...(dossier.professionalType !== 'prestataire'
          ? { accountStatus: 'Suspended' }
          : {}),
      },
    },
  );
  try {
    invalidate('/api/prestataire');
    invalidate('/api/freelance');
    invalidate('/api/vendeur');
    invalidate('/api/search');
  } catch {
    /* ignore */
  }
  await writeReconcileAudit({
    fieldRecensementId: dossier._id,
    action: 'reconcile_containment_applied',
    note: dossier.reviewStatus,
  });
  return { applied: true, reason: 'CONTAINED' };
}

async function writeReconcileAudit({ fieldRecensementId, action, note }) {
  const operationMutationId = `reconcile:${action}:${fieldRecensementId}`;
  try {
    await FieldRecensementAuditEvent.create({
      fieldRecensementId,
      operationMutationId,
      actorId: null,
      kind: 'other',
      meta: {
        action,
        note: String(note || '').slice(0, 120),
        outcome: 'reconcile',
      },
    });
  } catch (e) {
    if (e?.code === 11000) return;
  }
}

async function resumePublish({ dossier, canMutate }) {
  if (dossier.reviewStatus !== 'approved') {
    return { applied: false, reason: 'NOT_APPROVED' };
  }
  if (!canMutate) {
    return { applied: false, reason: 'DRY_RUN', wouldResume: true };
  }
  const result = await publishFieldRecensement({
    id: dossier._id,
    actorUser: { _id: dossier.recenseur },
    operationMutationId: `reconcile-publish:${dossier._id}:${dossier.revision || 0}`,
    ownerKey: `reconcile:${dossier._id}`,
  });
  await writeReconcileAudit({
    fieldRecensementId: dossier._id,
    action: 'reconcile_publish_resumed',
    note: result.code,
  });
  return { applied: true, reason: result.code, result };
}

async function repairSuspensionAlign({ dossier, profile, canMutate }) {
  if (!canMutate) return { applied: false, wouldContain: true, reason: 'DRY_RUN' };
  const Model = getProfileModel(dossier.professionalType);
  const fenceEpoch = Number(dossier.publicationFenceEpoch) || 0;
  await Model.updateOne(
    { _id: profile._id, sourceFieldRecensementId: dossier._id },
    {
      $set: {
        fieldPublicationStatus: 'suspended',
        fieldPublicationEpoch: fenceEpoch,
        status: 'suspended',
      },
    },
  );
  await writeReconcileAudit({
    fieldRecensementId: dossier._id,
    action: 'reconcile_suspension_repaired',
    note: 'align',
  });
  return { applied: true, reason: 'SUSPENSION_ALIGNED' };
}

async function retryMediaRevocation({ dossier, canMutate, revoke = revokePublicDerivative }) {
  const publicId = dossier.media?.profilePhoto?.publicId;
  if (!publicId || String(publicId).startsWith('cld:auth:')) {
    return { applied: false, reason: 'NO_PUBLIC_DERIVATIVE' };
  }
  if (!canMutate) return { applied: false, wouldRepair: true, reason: 'DRY_RUN' };

  // Ne pas toucher un asset GC deleting/deleted
  const gc = await FieldRecensementMediaGcCandidate.findOne({
    publicId,
    status: { $in: ['deleting', 'deleted'] },
  }).lean();
  if (gc) {
    return { applied: false, reason: 'GC_PROTECTED' };
  }

  try {
    await revoke({ publicId });
    await FieldRecensement.updateOne(
      { _id: dossier._id },
      {
        $set: { 'media.profilePhoto.publicRevocationStatus': 'revoked' },
        $unset: { 'media.profilePhoto.promotedPublicUrl': 1 },
      },
    );
    await writeReconcileAudit({
      fieldRecensementId: dossier._id,
      action: 'reconcile_media_revocation_retried',
      note: 'ok',
    });
    return { applied: true, reason: 'REVOKED' };
  } catch (err) {
    return { applied: false, reason: err.code || 'REVOKE_FAILED' };
  }
}

/**
 * Scan paginé des dossiers candidats.
 */
export async function* iterateReconciliationCandidates({
  batchSize = 100,
  afterId = null,
} = {}) {
  let cursor = afterId;
  for (;;) {
    const q = {};
    if (cursor) q._id = { $gt: cursor };
    const batch = await FieldRecensement.find(q)
      .sort({ _id: 1 })
      .limit(batchSize)
      .select(
        '+publicationLock +publicationFenceEpoch +linkedProfile +publicationLinkedUtilisateurId +publicationError +media.profilePhoto.publicId +media.profilePhoto.publicRevocationStatus reviewStatus publicationStatus professionalType revision updatedAt timing recenseur',
      )
      .lean();
    if (!batch.length) break;
    for (const doc of batch) {
      yield doc;
      cursor = doc._id;
    }
    if (batch.length < batchSize) break;
  }
}

/**
 * @param {{
 *   cli?: object,
 *   now?: Date,
 *   ownerId?: string,
 *   writeRun?: boolean,
 *   invalidate?: Function,
 *   revoke?: Function,
 *   maxDocs?: number,
 * }} opts
 */
export async function runFieldRecensementReconciliation(opts = {}) {
  const cfg = getFieldRecensementReconciliationConfig();
  const exec = resolveReconciliationExecutionMode(opts.cli || {}, cfg);
  const now = opts.now || new Date();
  const canMutate = exec.canMutate === true;
  const writeRun = opts.writeRun !== false && exec.mode !== 'report-only';
  const runId = crypto.randomUUID();

  const stats = {
    runId,
    mode: exec.mode,
    scanned: 0,
    consistent: 0,
    tooRecent: 0,
    activeOperation: 0,
    unsafeVisible: 0,
    recoverablePublish: 0,
    recoverableSuspend: 0,
    recoverableReactivate: 0,
    recoverableAudit: 0,
    manualReview: 0,
    wouldContain: 0,
    wouldResume: 0,
    wouldRepair: 0,
    repaired: 0,
    contained: 0,
    failed: 0,
    skipped: 0,
    errors: 0,
    reasonCounts: {},
    cloudinaryMutations: 0,
    cacheInvalidations: 0,
  };

  const lock = await acquireFieldRecensementJobLock({
    jobName: RECONCILIATION_JOB_NAME,
    ownerId: opts.ownerId,
    leaseMs: cfg.leaseMs || 120_000,
    now,
  });
  if (!lock.acquired) {
    stats.skipped += 1;
    bump(stats.reasonCounts, 'LOCK_HELD');
    return { ...stats, lockHeld: true, canMutate: false };
  }

  let runDoc = null;
  if (writeRun) {
    runDoc = await FieldRecensementReconciliationRun.create({
      runId,
      mode: exec.mode,
      startedAt: now,
      configSnapshot: {
        enabled: cfg.enabled,
        dryRun: cfg.dryRun,
        staleAfterMinutes: cfg.staleAfterMinutes,
        batchSize: cfg.batchSize,
        leaseMs: cfg.leaseMs,
        maxAttempts: cfg.maxAttempts,
      },
    });
  }

  try {
    const staleAfterMinutes = cfg.staleAfterMinutes ?? 15;
    const maxAttempts = cfg.maxAttempts ?? 8;
    const batchSize = cfg.batchSize ?? 100;
    const maxDocs = opts.maxDocs ?? batchSize;

    let processed = 0;
    for await (const dossier of iterateReconciliationCandidates({ batchSize })) {
      if (processed >= maxDocs) break;
      processed += 1;
      stats.scanned += 1;

      const lockOk = await isFieldRecensementJobLockValid({
        jobName: RECONCILIATION_JOB_NAME,
        attemptId: lock.attemptId,
        now: new Date(),
      });
      if (!lockOk) {
        stats.skipped += 1;
        bump(stats.reasonCounts, 'LEASE_EXPIRED');
        break;
      }

      let profile = null;
      try {
        profile = await loadLinkedProfile(dossier);
      } catch {
        profile = null;
      }

      const classification = classifyFieldRecensementForReconciliation({
        dossier,
        profile,
        now,
        staleAfterMinutes,
        maxAttempts,
      });
      bump(stats.reasonCounts, classification.class);

      switch (classification.class) {
        case RECONCILE_CLASS.CONSISTENT:
          stats.consistent += 1;
          break;
        case RECONCILE_CLASS.TOO_RECENT:
          stats.tooRecent += 1;
          break;
        case RECONCILE_CLASS.ACTIVE_OPERATION:
          stats.activeOperation += 1;
          break;
        case RECONCILE_CLASS.UNSAFE_VISIBLE: {
          stats.unsafeVisible += 1;
          const r = await containUnsafeV1Profile({
            dossier,
            profile,
            canMutate,
            invalidate: (path) => {
              stats.cacheInvalidations += 1;
              return (opts.invalidate || invalidateCache)(path);
            },
          });
          if (r.wouldContain) stats.wouldContain += 1;
          if (r.applied) stats.contained += 1;
          break;
        }
        case RECONCILE_CLASS.RECOVERABLE_PUBLISH: {
          stats.recoverablePublish += 1;
          try {
            const r = await resumePublish({ dossier, canMutate });
            if (r.wouldResume) stats.wouldResume += 1;
            if (r.applied) stats.repaired += 1;
          } catch (err) {
            stats.failed += 1;
            stats.errors += 1;
            bump(stats.reasonCounts, err.code || 'PUBLISH_FAIL');
            if (canMutate) {
              await writeReconcileAudit({
                fieldRecensementId: dossier._id,
                action: 'reconcile_failed',
                note: err.code || 'error',
              }).catch(() => {});
            }
          }
          break;
        }
        case RECONCILE_CLASS.RECOVERABLE_SUSPENSION: {
          stats.recoverableSuspend += 1;
          const r = await repairSuspensionAlign({ dossier, profile, canMutate });
          if (r.wouldContain) stats.wouldRepair += 1;
          if (r.applied) stats.repaired += 1;
          break;
        }
        case RECONCILE_CLASS.RECOVERABLE_MEDIA_REVOCATION: {
          const r = await retryMediaRevocation({
            dossier,
            canMutate,
            revoke: async (args) => {
              stats.cloudinaryMutations += 1;
              return (opts.revoke || revokePublicDerivative)(args);
            },
          });
          if (r.wouldRepair) stats.wouldRepair += 1;
          if (r.applied) stats.repaired += 1;
          break;
        }
        case RECONCILE_CLASS.RECOVERABLE_REACTIVATION:
          stats.recoverableReactivate += 1;
          stats.manualReview += 1;
          bump(stats.reasonCounts, 'REACTIVATION_NEEDS_DECISION');
          break;
        case RECONCILE_CLASS.RECOVERABLE_AUDIT:
          stats.recoverableAudit += 1;
          if (canMutate) {
            await writeReconcileAudit({
              fieldRecensementId: dossier._id,
              action: 'reconcile_audit_repaired',
              note: 'idempotent',
            });
            stats.repaired += 1;
          } else {
            stats.wouldRepair += 1;
          }
          break;
        case RECONCILE_CLASS.MANUAL_REVIEW_REQUIRED:
        case RECONCILE_CLASS.MAX_ATTEMPTS_REACHED:
          stats.manualReview += 1;
          if (canMutate) {
            await writeReconcileAudit({
              fieldRecensementId: dossier._id,
              action: 'reconcile_manual_review_required',
              note: classification.reason,
            });
          }
          break;
        default:
          stats.skipped += 1;
          bump(stats.reasonCounts, 'UNKNOWN_PROTECTED');
      }
    }

    if (runDoc) {
      runDoc.finishedAt = new Date();
      Object.assign(runDoc, {
        scanned: stats.scanned,
        consistent: stats.consistent,
        tooRecent: stats.tooRecent,
        active: stats.activeOperation,
        recoverable:
          stats.recoverablePublish +
          stats.recoverableSuspend +
          stats.recoverableReactivate +
          stats.recoverableAudit,
        repaired: stats.repaired,
        contained: stats.contained,
        manualReview: stats.manualReview,
        failed: stats.failed,
        skipped: stats.skipped,
        reasonCounts: stats.reasonCounts,
      });
      await runDoc.save();
    }

    return { ...stats, canMutate, lockHeld: false };
  } finally {
    await releaseFieldRecensementJobLock({
      jobName: RECONCILIATION_JOB_NAME,
      attemptId: lock.attemptId,
    });
  }
}

export { MEDIA_GC_JOB_NAME };

export default {
  runFieldRecensementReconciliation,
  classifyFieldRecensementForReconciliation,
  containUnsafeV1Profile,
};
