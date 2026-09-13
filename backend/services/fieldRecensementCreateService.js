/**
 * R1-03 — Service create FieldRecensement (Option C : réserve Mongo → Cloudinary).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import mongoose from 'mongoose';
import FieldRecensement from '../models/fieldRecensementModel.js';
import Service from '../models/serviceModel.js';
import Categorie from '../models/categorieModel.js';
import {
  canonicalizeCreatePayload,
  computeRequestHash,
  sha256File,
} from '../utils/fieldRecensementCanonical.js';
import { validateCreatePayloadAsync } from '../utils/fieldRecensementValidate.js';
import { uploadKycToCloudinary } from '../utils/kycAccess.js';
import {
  matchFieldRecensementUser,
  toAgentSafeMatchResult,
} from '../services/fieldRecensementUserMatcher.js';
import { normalizeEmail } from '../utils/emailIdentity.js';
import {
  canonicalizePhone,
  isInternationalInput,
} from '../utils/phone.js';
import { apiError } from '../utils/FieldRecensementApiError.js';
import { buildFieldMediaCloudinaryOptions } from '../utils/fieldRecensementMediaClassification.js';

export { apiError };

const POLL_MS = 100;
const POLL_MAX_MS = 3000;

function normalizePersonForDoc(person, defaultCountry = 'CI') {
  const out = {
    nom: String(person.nom).trim(),
    prenoms: person.prenoms ? String(person.prenoms).trim() : undefined,
    telephone: person.telephone,
  };
  try {
    const opts = {};
    if (!isInternationalInput(person.telephone)) opts.defaultCountry = defaultCountry;
    out.telephone = canonicalizePhone(person.telephone, opts).e164;
  } catch {
    out.telephone = String(person.telephone).trim();
  }
  if (person.whatsapp != null && String(person.whatsapp).trim() !== '') {
    try {
      const opts = {};
      if (!isInternationalInput(person.whatsapp)) opts.defaultCountry = defaultCountry;
      out.whatsapp = canonicalizePhone(person.whatsapp, opts).e164;
    } catch {
      out.whatsapp = String(person.whatsapp).trim();
    }
  }
  const email = normalizeEmail(person.email);
  if (email) out.email = email;
  return out;
}

function buildBusinessDoc(professionalType, business) {
  const b = { ...business };
  if (professionalType === 'prestataire' && b.serviceId) {
    b.serviceId = new mongoose.Types.ObjectId(String(b.serviceId));
    if (b.derivedCategorieId) {
      b.derivedCategorieId = new mongoose.Types.ObjectId(String(b.derivedCategorieId));
    }
  }
  if (professionalType === 'freelance' && b.categoryId) {
    b.categoryId = new mongoose.Types.ObjectId(String(b.categoryId));
  }
  if (Array.isArray(b.businessCategoryIds)) {
    const unique = [...new Set(b.businessCategoryIds.map(String))];
    b.businessCategoryIds = unique.map((id) => new mongoose.Types.ObjectId(id));
  }
  if (Array.isArray(b.productTypeLabels)) {
    const seen = new Set();
    b.productTypeLabels = b.productTypeLabels
      .map((s) => String(s).trim())
      .filter((s) => {
        const k = s.toLowerCase();
        if (!s || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, c) => a.localeCompare(c));
  }
  if (Array.isArray(b.skills)) {
    const seen = new Set();
    b.skills = b.skills
      .map((s) => String(s).trim())
      .filter((s) => {
        const k = s.toLowerCase();
        if (!s || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((a, c) => a.localeCompare(c));
  }
  delete b.categorieId;
  return b;
}

function deterministicPublicId(recenseurId, clientMutationId) {
  const hash = crypto
    .createHash('sha256')
    .update(`${recenseurId}:${clientMutationId}:profilePhoto`, 'utf8')
    .digest('hex')
    .slice(0, 40);
  return `field/${hash}`;
}

function mapMatchStatus(matchResult) {
  const safe = toAgentSafeMatchResult(matchResult);
  return safe.matchStatus;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollUntilCompleted(docId, maxMs = POLL_MAX_MS) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const doc = await FieldRecensement.findById(docId).select(
      '+requestHash +media.profilePhoto.sha256 +media.profilePhoto.ref +ingestionStatus +ingestionErrorCode',
    );
    if (!doc) return null;
    if (doc.ingestionStatus === 'completed') return doc;
    if (doc.ingestionStatus === 'failed') return doc;
    await sleep(POLL_MS);
  }
  return FieldRecensement.findById(docId).select(
    '+requestHash +media.profilePhoto.sha256 +media.profilePhoto.ref +ingestionStatus +ingestionErrorCode',
  );
}

async function checkBusinessDuplicate(normalizedPhone, professionalType, recenseurId, clientMutationId) {
  const existing = await FieldRecensement.findOne({
    'person.telephone': normalizedPhone,
    professionalType,
    reviewStatus: { $nin: ['rejected'] },
    $nor: [{ recenseur: recenseurId, clientMutationId }],
  })
    .select('_id')
    .lean();
  if (existing) {
    throw apiError(
      409,
      'RECENSEMENT_DUPLICATE_SUSPECTED',
      'Une fiche similaire existe déjà.',
      { matchReasons: ['same_telephone_and_type'], action: 'contact_supervisor' },
    );
  }
}

async function tryClaimMediaUpload(docId) {
  return FieldRecensement.findOneAndUpdate(
    { _id: docId, ingestionStatus: { $in: ['reserved', 'failed'] } },
    { $set: { ingestionStatus: 'media_uploading' }, $unset: { ingestionErrorCode: 1 } },
    { new: true },
  ).select('+requestHash +media.profilePhoto.sha256 +media.profilePhoto.ref +ingestionStatus +ingestionErrorCode');
}

async function uploadProfilePhoto(doc, filePath) {
  const publicId = deterministicPublicId(String(doc.recenseur), doc.clientMutationId);
  const cldOpts = buildFieldMediaCloudinaryOptions({
    publicId,
    overwrite: false,
    mediaKind: 'profile_pending_private',
    fieldRecensementId: String(doc._id),
    uploadSessionId: doc.clientMutationId,
  });
  const { ref, publicId: uploadedId } = await uploadKycToCloudinary(filePath, undefined, {
    publicId: cldOpts.public_id,
    overwrite: cldOpts.overwrite,
    tags: cldOpts.tags,
    context: cldOpts.context,
  });
  doc.media = doc.media || {};
  doc.media.profilePhoto = {
    ref,
    publicId: uploadedId,
    kind: 'profile_pending_private',
    sha256: doc.media.profilePhoto?.sha256,
  };
  doc.ingestionStatus = 'completed';
  doc.ingestionErrorCode = undefined;
  await doc.save();
}

async function handleDuplicateKey({
  agentUser,
  clientMutationId,
  requestHash,
  profilePhotoFile,
  matchStatus,
}) {
  const existing = await FieldRecensement.findOne({
    recenseur: agentUser._id,
    clientMutationId,
  }).select(
    '+requestHash +media.profilePhoto.sha256 +media.profilePhoto.ref +ingestionStatus +ingestionErrorCode',
  );

  if (!existing) {
    throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Conflit idempotence.');
  }

  if (existing.requestHash !== requestHash) {
    throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Clé idempotente réutilisée avec contenu différent.');
  }

  if (existing.ingestionStatus === 'completed') {
    return { kind: 'already', doc: existing, matchStatus, needsUpload: false };
  }

  if (existing.ingestionStatus === 'media_uploading') {
    const polled = await pollUntilCompleted(existing._id);
    if (polled?.ingestionStatus === 'completed') {
      return { kind: 'already', doc: polled, matchStatus, needsUpload: false };
    }
    return { kind: 'processing', doc: polled || existing, matchStatus, needsUpload: false };
  }

  if (['failed', 'reserved'].includes(existing.ingestionStatus)) {
    if (profilePhotoFile) {
      return { kind: 'retry', doc: existing, matchStatus, needsUpload: true };
    }
    if (existing.ingestionStatus === 'reserved' && !profilePhotoFile) {
      existing.ingestionStatus = 'completed';
      await existing.save();
      return { kind: 'already', doc: existing, matchStatus, needsUpload: false };
    }
    return { kind: 'processing', doc: existing, matchStatus, needsUpload: false };
  }

  return { kind: 'already', doc: existing, matchStatus, needsUpload: false };
}

/**
 * @param {{ agentUser: object, payload: object, profilePhotoFile?: { path: string }|null }} input
 */
export async function createFieldRecensement({ agentUser, payload, profilePhotoFile = null }) {
  const filePath = profilePhotoFile?.path || null;
  let tempUnlinked = false;

  try {
    const validation = await validateCreatePayloadAsync(payload, {
      findService: (id) => Service.findById(id).select('_id categorie').lean(),
      findCategorie: (id) => Categorie.findById(id).select('_id nomcategorie').lean(),
      findCategoriesByIds: (ids) =>
        Categorie.find({ _id: { $in: ids } }).select('_id nomcategorie').lean(),
    });
    if (!validation.ok) {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Validation échouée.', {
        errors: validation.errors,
      });
    }

    const validatedPayload = validation.value;
    const canonical = canonicalizeCreatePayload(validatedPayload, { defaultCountry: 'CI' });
    const mediaParts = [];
    if (filePath) {
      mediaParts.push({ kind: 'profilePhoto', sha256: await sha256File(filePath) });
    }
    const requestHash = computeRequestHash(canonical, mediaParts);

    const personDoc = normalizePersonForDoc(validatedPayload.person);
    await checkBusinessDuplicate(
      personDoc.telephone,
      validatedPayload.professionalType,
      agentUser._id,
      validatedPayload.clientMutationId,
    );

    const matchResult = await matchFieldRecensementUser({
      telephone: personDoc.telephone,
      email: personDoc.email,
      defaultCountry: 'CI',
    });
    const matchStatus = mapMatchStatus(matchResult);

    const operationMutationId =
      validatedPayload.operationMutationId || validatedPayload.clientMutationId;
    const hasPhoto = Boolean(filePath);

    const docData = {
      schemaVersion: 1,
      clientMutationId: validatedPayload.clientMutationId,
      requestHash,
      revision: 1,
      lastOperationMutationId: operationMutationId,
      recenseur: agentUser._id,
      professionalType: validatedPayload.professionalType,
      reviewStatus: 'pending_review',
      publicationStatus: 'not_started',
      ingestionStatus: hasPhoto ? 'reserved' : 'completed',
      person: personDoc,
      business: buildBusinessDoc(validatedPayload.professionalType, validatedPayload.business),
      location: validatedPayload.location || undefined,
      consent: {
        recensementAccepted: true,
        acceptedAt: validatedPayload.consent.acceptedAt
          ? new Date(validatedPayload.consent.acceptedAt)
          : undefined,
        textVersion: validatedPayload.consent.textVersion,
        method: validatedPayload.consent.method,
        language: validatedPayload.consent.language,
      },
      app: validatedPayload.app,
      timing: {
        recordedAt: new Date(validatedPayload.recordedAt),
        serverReceivedAt: new Date(),
        deviceTimezone: validatedPayload.metadata?.deviceTimezone,
        clockSkewDetected: false,
      },
      metadata: {
        notes:
          validatedPayload.metadata?.notes != null
            ? String(validatedPayload.metadata.notes)
            : undefined,
      },
      matchedUtilisateurId:
        matchResult.status === 'verified_match' ? matchResult.matchedUtilisateurId : null,
      linkedProfile: null,
    };

    if (hasPhoto) {
      docData.media = {
        profilePhoto: {
          kind: 'profile_pending_private',
          sha256: mediaParts[0].sha256,
        },
      };
    }

    let createdDoc;
    try {
      createdDoc = await FieldRecensement.create(docData);
    } catch (e) {
      if (e?.code === 11000) {
        const dup = await handleDuplicateKey({
          agentUser,
          clientMutationId: validatedPayload.clientMutationId,
          requestHash,
          profilePhotoFile,
          matchStatus,
        });
        if (dup.kind === 'retry' && dup.needsUpload && filePath) {
          const claimed = await tryClaimMediaUpload(dup.doc._id);
          if (!claimed) {
            const polled = await pollUntilCompleted(dup.doc._id);
            if (polled?.ingestionStatus === 'completed') {
              return { kind: 'already', doc: polled, matchStatus };
            }
            return { kind: 'processing', doc: polled || dup.doc, matchStatus };
          }
          try {
            await uploadProfilePhoto(claimed, filePath);
            return { kind: 'created', doc: claimed, matchStatus };
          } catch {
            claimed.ingestionStatus = 'failed';
            claimed.ingestionErrorCode = 'CLOUDINARY_UPLOAD_FAILED';
            await claimed.save();
            throw apiError(
              503,
              'RECENSEMENT_MEDIA_FAILED',
              'Échec upload média.',
              undefined,
              true,
            );
          }
        }
        return { kind: dup.kind === 'retry' ? 'processing' : dup.kind, doc: dup.doc, matchStatus };
      }
      throw e;
    }

    if (hasPhoto && filePath) {
      const claimed = await tryClaimMediaUpload(createdDoc._id);
      const target = claimed || createdDoc;
      try {
        if (!claimed) {
          target.ingestionStatus = 'media_uploading';
          await target.save();
        }
        await uploadProfilePhoto(target, filePath);
        return { kind: 'created', doc: target, matchStatus };
      } catch {
        target.ingestionStatus = 'failed';
        target.ingestionErrorCode = 'CLOUDINARY_UPLOAD_FAILED';
        await target.save();
        throw apiError(503, 'RECENSEMENT_MEDIA_FAILED', 'Échec upload média.', undefined, true);
      }
    }

    return { kind: 'created', doc: createdDoc, matchStatus };
  } finally {
    if (filePath && !tempUnlinked && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
    }
  }
}

export { computeRequestHash };
