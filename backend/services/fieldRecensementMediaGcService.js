/**
 * R1-12 — Service GC sécurisé des médias Field Recensement V1.
 * Principe : conservation > suppression. Dry-run par défaut. Aucun destroy sans gates.
 */
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import FieldRecensement from '../models/fieldRecensementModel.js';
import FieldRecensementMediaGcCandidate from '../models/fieldRecensementMediaGcCandidateModel.js';
import FieldRecensementMediaGcRun from '../models/fieldRecensementMediaGcRunModel.js';
import Prestataire from '../models/prestataireModel.js';
import Freelance from '../models/freelanceModel.js';
import Vendeur from '../models/vendeurModel.js';
import {
  getFieldRecensementMediaGcConfig,
  resolveMediaGcExecutionMode,
} from '../config/fieldRecensementMediaGcConfig.js';
import {
  classifyFieldMediaAsset,
  fingerprintPublicId,
  isGcDeletableClass,
  FIELD_MEDIA_CLASS,
  FIELD_MEDIA_TAGS,
} from '../utils/fieldRecensementMediaClassification.js';
import { stripAuthPrefix } from '../utils/fieldRecensementMediaAdapter.js';
import {
  acquireFieldRecensementJobLock,
  releaseFieldRecensementJobLock,
  isFieldRecensementJobLockValid,
  MEDIA_GC_JOB_NAME,
} from '../models/fieldRecensementJobLockModel.js';

const HOUR_MS = 3600_000;

function bump(map, key) {
  map[key] = (map[key] || 0) + 1;
}

/**
 * Collecte toutes les références Cloudinary protégées depuis Mongo.
 */
export async function collectProtectedMediaRefs(db = mongoose.connection) {
  const protectedSet = new Set();
  const add = (publicId, deliveryHint) => {
    const id = stripAuthPrefix(publicId);
    if (!id) return;
    protectedSet.add(`image|authenticated|${id}`);
    protectedSet.add(`image|upload|${id}`);
    if (deliveryHint) protectedSet.add(`image|${deliveryHint}|${id}`);
  };

  const docs = await FieldRecensement.find({})
    .select(
      'media.profilePhoto.ref media.profilePhoto.publicId media.profilePhoto.kind kyc.documents.ref publicationLock publicationStatus ingestionStatus reviewStatus',
    )
    .lean();
  for (const doc of docs) {
    const photo = doc.media?.profilePhoto;
    if (photo?.ref) add(photo.ref, 'authenticated');
    if (photo?.publicId) {
      add(photo.publicId, photo.kind === 'profile_public' ? 'upload' : 'authenticated');
    }
    for (const d of doc.kyc?.documents || []) {
      if (d?.ref) add(d.ref, 'authenticated');
    }
  }

  for (const Model of [Prestataire, Freelance, Vendeur]) {
    const docs = await Model.find({})
      .select(
        'cni1 cni2 selfie attestationAssurance imagePath shopLogo verificationDocuments diplomeCertificat sourceFieldRecensementId',
      )
      .lean();
    for (const p of docs) {
      for (const k of ['cni1', 'cni2', 'selfie', 'attestationAssurance', 'imagePath', 'shopLogo']) {
        if (typeof p[k] === 'string' && p[k]) {
          // URLs publiques → extraire éventuel public_id profiles/
          const m = String(p[k]).match(/\/(?:image\/upload\/)(?:v\d+\/)?(.+)$/);
          if (m) add(m[1].replace(/\.[a-zA-Z0-9]+$/, ''), 'upload');
          else if (!/^https?:/i.test(p[k])) add(p[k]);
        }
      }
      const vd = p.verificationDocuments || {};
      for (const v of Object.values(vd)) {
        if (typeof v === 'string' && v) add(v, 'authenticated');
      }
      if (Array.isArray(p.diplomeCertificat)) {
        for (const d of p.diplomeCertificat) {
          if (typeof d === 'string') add(d);
        }
      }
    }
  }

  return protectedSet;
}

/**
 * Vérifie si un asset est encore référencé / opération active.
 */
export async function evaluateMediaProtection({
  publicId,
  deliveryType,
  protectedSet,
  now = new Date(),
}) {
  const id = stripAuthPrefix(publicId);
  const key = `image|${deliveryType}|${id}`;
  const keyAltAuth = `image|authenticated|${id}`;
  const keyAltUp = `image|upload|${id}`;

  if (
    protectedSet.has(key) ||
    protectedSet.has(keyAltAuth) ||
    protectedSet.has(keyAltUp)
  ) {
    return { protected: true, reasonCode: 'STILL_REFERENCED' };
  }

  const active = await FieldRecensement.findOne({
    $and: [
      {
        $or: [
          { 'media.profilePhoto.publicId': id },
          { 'media.profilePhoto.ref': `cld:auth:${id}` },
        ],
      },
      {
        $or: [
          { 'publicationLock.expiresAt': { $gt: now } },
          { ingestionStatus: { $in: ['reserved', 'media_uploading'] } },
          {
            publicationStatus: {
              $in: [
                'preparing_media',
                'ready',
                'linking_profile',
                'creating_profile',
                'linking_user',
              ],
            },
          },
        ],
      },
    ],
  })
    .select('_id')
    .lean();

  if (active) {
    return { protected: true, reasonCode: 'ACTIVE_OPERATION' };
  }

  return { protected: false, reasonCode: null };
}

/**
 * Liste Cloudinary bornée par tag (injectable).
 * @param {{
 *   listByTag: Function,
 *   deliveryType: 'authenticated'|'upload',
 *   maxPages?: number,
 *   pageSize?: number,
 * }} args
 */
export async function listManagedFieldMediaPages({
  listByTag,
  deliveryType,
  maxPages = 20,
  pageSize = 50,
  tag = FIELD_MEDIA_TAGS[0],
}) {
  const assets = [];
  let nextCursor = undefined;
  for (let page = 0; page < maxPages; page++) {
    const res = await listByTag({
      tag,
      resourceType: 'image',
      type: deliveryType,
      maxResults: pageSize,
      nextCursor,
    });
    const batch = res?.resources || [];
    for (const r of batch) {
      assets.push({
        publicId: r.public_id,
        deliveryType: r.type || deliveryType,
        resourceType: r.resource_type || 'image',
        tags: r.tags,
        context: r.context?.custom || r.context,
        createdAt: r.created_at ? new Date(r.created_at) : null,
        bytes: r.bytes,
      });
    }
    nextCursor = res?.next_cursor;
    if (!nextCursor || batch.length === 0) break;
  }
  return assets;
}

function defaultMockListByTag() {
  return async () => ({ resources: [], next_cursor: undefined });
}

/**
 * Exécute un run GC.
 * @param {{
 *   cli?: { execute?: boolean, confirm?: string, reportOnly?: boolean },
 *   listByTag?: Function,
 *   destroyAsset?: Function,
 *   now?: Date,
 *   ownerId?: string,
 *   writeCandidates?: boolean,
 * }} opts
 */
export async function runFieldRecensementMediaGc(opts = {}) {
  const cfg = getFieldRecensementMediaGcConfig();
  const exec = resolveMediaGcExecutionMode(opts.cli || {}, cfg);
  const now = opts.now || new Date();
  const runId = crypto.randomUUID();
  const reportOnly = exec.mode === 'report-only';
  const writeCandidates = opts.writeCandidates !== false && !reportOnly;
  const canDestroy = exec.canDestroy === true;

  const stats = {
    runId,
    mode: exec.mode,
    scanned: 0,
    managed: 0,
    protected: 0,
    unknown: 0,
    observed: 0,
    quarantined: 0,
    eligible: 0,
    wouldDelete: 0,
    deleted: 0,
    failed: 0,
    skipped: 0,
    errors: 0,
    reasonCounts: {},
    destroyCalls: 0,
  };

  const lock = await acquireFieldRecensementJobLock({
    jobName: MEDIA_GC_JOB_NAME,
    ownerId: opts.ownerId,
    now,
  });
  if (!lock.acquired) {
    stats.skipped += 1;
    bump(stats.reasonCounts, 'LOCK_HELD');
    return { ...stats, lockHeld: true, canDestroy: false };
  }

  const startedAt = now;
  let runDoc = null;
  if (writeCandidates) {
    runDoc = await FieldRecensementMediaGcRun.create({
      runId,
      mode: exec.mode,
      startedAt,
      configSnapshot: {
        enabled: cfg.enabled,
        dryRun: cfg.dryRun,
        orphanTtlHours: cfg.orphanTtlHours,
        quarantineHours: cfg.quarantineHours,
        batchSize: cfg.batchSize,
      },
    });
  }

  try {
    const listByTag = opts.listByTag || defaultMockListByTag();
    const destroyAsset =
      opts.destroyAsset ||
      (async () => {
        throw new Error('destroy non injecté — refuse réel');
      });

    const ttlHours = cfg.orphanTtlHours ?? 72;
    const quarantineHours = cfg.quarantineHours ?? 24;
    const batchSize = cfg.batchSize ?? 100;
    const minAge = new Date(now.getTime() - ttlHours * HOUR_MS);

    const protectedSet = await collectProtectedMediaRefs();

    const authAssets = await listManagedFieldMediaPages({
      listByTag,
      deliveryType: 'authenticated',
    });
    const pubAssets = await listManagedFieldMediaPages({
      listByTag,
      deliveryType: 'upload',
    });
    const all = [...authAssets, ...pubAssets].slice(0, batchSize);

    for (const asset of all) {
      stats.scanned += 1;
      const classification = classifyFieldMediaAsset(asset);

      if (!isGcDeletableClass(classification.class)) {
        if (classification.class === FIELD_MEDIA_CLASS.UNKNOWN_PROTECTED) stats.unknown += 1;
        else stats.protected += 1;
        bump(stats.reasonCounts, classification.reason || classification.class);
        stats.skipped += 1;
        continue;
      }
      stats.managed += 1;

      if (asset.createdAt && asset.createdAt > minAge) {
        stats.skipped += 1;
        bump(stats.reasonCounts, 'TOO_YOUNG');
        continue;
      }

      const prot = await evaluateMediaProtection({
        publicId: asset.publicId,
        deliveryType: asset.deliveryType,
        protectedSet,
        now,
      });
      if (prot.protected) {
        stats.protected += 1;
        bump(stats.reasonCounts, prot.reasonCode);
        if (writeCandidates) {
          await upsertCandidateRetained(asset, classification, {
            status: 'retained',
            reasonCode: prot.reasonCode,
            now,
          });
        }
        continue;
      }

      if (!writeCandidates) {
        stats.observed += 1;
        bump(stats.reasonCounts, 'WOULD_OBSERVE');
        continue;
      }

      const candidate = await upsertCandidate(asset, classification, {
        now,
        quarantineHours,
      });

      if (candidate.status === 'retained' || candidate.status === 'deleted') {
        stats.protected += 1;
        bump(stats.reasonCounts, candidate.reasonCode || candidate.status);
        continue;
      }

      // Premier scan : quarantaine seule (jamais destroy)
      if (candidate.isNewQuarantine) {
        stats.observed += 1;
        stats.quarantined += 1;
        bump(stats.reasonCounts, 'QUARANTINED');
        continue;
      }

      if (candidate.status === 'quarantined') {
        candidate.lastCheckedAt = now;
        if (!candidate.eligibleAfter || candidate.eligibleAfter > now) {
          await candidate.save();
          stats.quarantined += 1;
          bump(stats.reasonCounts, 'QUARANTINE_PENDING');
          continue;
        }

        // Deuxième contrôle après quarantaine
        const prot2 = await evaluateMediaProtection({
          publicId: asset.publicId,
          deliveryType: asset.deliveryType,
          protectedSet,
          now,
        });
        if (prot2.protected) {
          candidate.status = 'retained';
          candidate.reasonCode = prot2.reasonCode;
          await candidate.save();
          stats.protected += 1;
          bump(stats.reasonCounts, prot2.reasonCode);
          continue;
        }

        candidate.status = 'eligible';
        candidate.reasonCode = 'ELIGIBLE_AFTER_QUARANTINE';
        await candidate.save();
        stats.eligible += 1;

        const lockOk = await isFieldRecensementJobLockValid({
          attemptId: lock.attemptId,
          now,
        });
        if (!lockOk) {
          stats.skipped += 1;
          bump(stats.reasonCounts, 'LEASE_EXPIRED');
          break;
        }

        const finalClass = classifyFieldMediaAsset(asset);
        if (!isGcDeletableClass(finalClass.class)) {
          candidate.status = 'retained';
          candidate.reasonCode = 'CLASS_CHANGED';
          await candidate.save();
          stats.protected += 1;
          continue;
        }

        const prot3 = await evaluateMediaProtection({
          publicId: asset.publicId,
          deliveryType: asset.deliveryType,
          protectedSet: await collectProtectedMediaRefs(),
          now,
        });
        if (prot3.protected) {
          candidate.status = 'retained';
          candidate.reasonCode = prot3.reasonCode;
          await candidate.save();
          stats.protected += 1;
          continue;
        }

        if (!canDestroy) {
          stats.wouldDelete += 1;
          bump(stats.reasonCounts, 'WOULD_DELETE');
          continue;
        }

        candidate.status = 'deleting';
        await candidate.save();
        try {
          const result = await destroyAsset({
            publicId: asset.publicId,
            resourceType: 'image',
            type: asset.deliveryType,
            invalidate: asset.deliveryType === 'upload',
          });
          stats.destroyCalls += 1;
          const ok =
            result?.result === 'ok' ||
            result?.result === 'not found' ||
            result?.ok === true;
          if (!ok) {
            throw Object.assign(new Error('destroy incomplete'), { code: 'DESTROY_FAILED' });
          }
          candidate.status = 'deleted';
          candidate.deletedAt = new Date();
          candidate.reasonCode = result?.result === 'not found' ? 'ALREADY_ABSENT' : 'DELETED';
          await candidate.save();
          stats.deleted += 1;
          bump(stats.reasonCounts, candidate.reasonCode);
        } catch (err) {
          candidate.status = 'failed';
          candidate.attempts = (candidate.attempts || 0) + 1;
          candidate.lastFailureCode = String(err.code || 'TEMPORARY_FAILURE').slice(0, 64);
          await candidate.save();
          stats.failed += 1;
          stats.errors += 1;
          bump(stats.reasonCounts, 'DESTROY_ERROR');
        }
      }
    }

    if (runDoc) {
      runDoc.finishedAt = new Date();
      Object.assign(runDoc, {
        scanned: stats.scanned,
        managed: stats.managed,
        protected: stats.protected,
        unknown: stats.unknown,
        observed: stats.observed,
        quarantined: stats.quarantined,
        eligible: stats.eligible,
        wouldDelete: stats.wouldDelete,
        deleted: stats.deleted,
        failed: stats.failed,
        skipped: stats.skipped,
        errors: stats.errors,
        reasonCounts: stats.reasonCounts,
      });
      await runDoc.save();
    }

    return { ...stats, canDestroy, lockHeld: false };
  } finally {
    await releaseFieldRecensementJobLock({ attemptId: lock.attemptId });
  }
}

async function upsertCandidate(asset, classification, { now, quarantineHours }) {
  const fp = fingerprintPublicId(asset.publicId);
  let doc = await FieldRecensementMediaGcCandidate.findOne({
    resourceType: 'image',
    deliveryType: asset.deliveryType,
    publicId: asset.publicId,
  });
  if (!doc) {
    doc = await FieldRecensementMediaGcCandidate.create({
      publicId: asset.publicId,
      resourceType: 'image',
      deliveryType: asset.deliveryType,
      mediaKind: classification.context?.mediaKind,
      classification: classification.class,
      assetFingerprint: fp,
      firstSeenOrphanAt: now,
      lastCheckedAt: now,
      status: 'quarantined',
      reasonCode: 'ORPHAN_CANDIDATE',
      eligibleAfter: new Date(now.getTime() + (quarantineHours || 24) * HOUR_MS),
      sourceFieldRecensementId: mongoose.isValidObjectId(classification.context?.fieldRecensementId)
        ? new mongoose.Types.ObjectId(String(classification.context.fieldRecensementId))
        : undefined,
      purpose:
        classification.class === FIELD_MEDIA_CLASS.MANAGED_FIELD_PUBLIC
          ? 'public_derivative_revocation'
          : 'orphan_cleanup',
    });
    doc.isNewQuarantine = true;
    return doc;
  }
  doc.lastCheckedAt = now;
  doc.classification = classification.class;
  await doc.save();
  return doc;
}

/** Variante pour marquage retained hors boucle principale */
async function upsertCandidateRetained(asset, classification, { status, reasonCode, now }) {
  const fp = fingerprintPublicId(asset.publicId);
  await FieldRecensementMediaGcCandidate.findOneAndUpdate(
    {
      resourceType: 'image',
      deliveryType: asset.deliveryType,
      publicId: asset.publicId,
    },
    {
      $set: {
        mediaKind: classification.context?.mediaKind,
        classification: classification.class,
        assetFingerprint: fp,
        lastCheckedAt: now,
        status,
        reasonCode,
      },
      $setOnInsert: {
        firstSeenOrphanAt: now,
        purpose: 'orphan_cleanup',
      },
    },
    { upsert: true },
  );
}

export default {
  runFieldRecensementMediaGc,
  collectProtectedMediaRefs,
  evaluateMediaProtection,
  listManagedFieldMediaPages,
};
