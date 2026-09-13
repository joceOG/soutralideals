/**
 * R1-07 — PATCH correction + POST resubmit FieldRecensement.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import mongoose from 'mongoose';
import FieldRecensement from '../models/fieldRecensementModel.js';
import FieldRecensementOperation from '../models/fieldRecensementOperationModel.js';
import Service from '../models/serviceModel.js';
import Categorie from '../models/categorieModel.js';
import { isAdmin } from '../utils/accessControl.js';
import {
  canonicalizeCreatePayload,
  computeRequestHash,
  sha256File,
} from '../utils/fieldRecensementCanonical.js';
import { validateCreatePayloadAsync } from '../utils/fieldRecensementValidate.js';
import { uploadKycToCloudinary } from '../utils/kycAccess.js';
import { buildFieldMediaCloudinaryOptions } from '../utils/fieldRecensementMediaClassification.js';
import { matchFieldRecensementUser } from '../services/fieldRecensementUserMatcher.js';
import {
  applyPathChanges,
  assertChangesWithinCorrectionFields,
  sanitizeCorrectionChanges,
} from '../utils/fieldRecensementCorrection.js';
import { toAgentFieldRecensementDetail } from '../utils/fieldRecensementDto.js';
import { apiError } from '../services/fieldRecensementCreateService.js';
import { normalizeEmail } from '../utils/emailIdentity.js';
import {
  canonicalizePhone,
  isInternationalInput,
} from '../utils/phone.js';

function unlinkQuiet(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}

function isValidObjectIdParam(id) {
  return /^[a-fA-F0-9]{24}$/.test(String(id));
}

function normalizePerson(person, defaultCountry = 'CI') {
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
  delete b.categorieId;
  return b;
}

function plainDocSlice(doc) {
  const toPlain = (v) => {
    if (v == null) return {};
    if (typeof v.toObject === 'function') return JSON.parse(JSON.stringify(v.toObject()));
    return JSON.parse(JSON.stringify(v));
  };
  return {
    person: toPlain(doc.person),
    business: toPlain(doc.business),
    location: toPlain(doc.location),
    consent: toPlain(doc.consent),
    app: toPlain(doc.app),
    metadata: toPlain(doc.metadata),
  };
}

function toValidationPayload(doc, merged) {
  const business = { ...(merged.business || {}) };
  delete business.derivedCategorieId;
  delete business.categoryLabel;
  delete business.categorieId;
  // stringify ObjectIds
  if (business.serviceId) business.serviceId = String(business.serviceId);
  if (business.categoryId) business.categoryId = String(business.categoryId);
  if (Array.isArray(business.businessCategoryIds)) {
    business.businessCategoryIds = business.businessCategoryIds.map(String);
  }

  const consent = { ...(merged.consent || {}) };
  delete consent.confirmedByAgent;

  return {
    clientMutationId: doc.clientMutationId,
    operationMutationId: doc.clientMutationId,
    schemaVersion: doc.schemaVersion || 1,
    professionalType: doc.professionalType,
    recordedAt: doc.timing?.recordedAt?.toISOString?.() || new Date().toISOString(),
    app: merged.app || {
      version: doc.app?.version,
      buildNumber: doc.app?.buildNumber,
      installationId: doc.app?.installationId,
    },
    person: merged.person,
    business,
    location: merged.location,
    consent,
    metadata: merged.metadata || {},
  };
}

function validateTarifs(business) {
  if (business?.tarifDeclareMin != null && business?.tarifDeclareMax != null) {
    const min = Number(business.tarifDeclareMin);
    const max = Number(business.tarifDeclareMax);
    if (!Number.isNaN(min) && !Number.isNaN(max) && min > max) {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'tarifDeclareMin > tarifDeclareMax.', [
        { field: 'business.tarifDeclareMin', code: 'INVALID_RANGE' },
      ]);
    }
  }
}

function correctionPublicId(recenseurId, clientMutationId, revision) {
  const hash = crypto
    .createHash('sha256')
    .update(`${recenseurId}:${clientMutationId}:profilePhoto:rev:${revision}`, 'utf8')
    .digest('hex')
    .slice(0, 40);
  return `field/${hash}`;
}

function computeContentHash(canonicalPayload, mediaSha256) {
  const media = mediaSha256
    ? [{ kind: 'profilePhoto', sha256: mediaSha256 }]
    : [];
  return computeRequestHash(canonicalPayload, media);
}

function computeOperationHash({ action, expectedRevision, paths, mediaSha256 }) {
  const body = {
    action,
    expectedRevision,
    changes: paths,
    mediaSha256: mediaSha256 || null,
  };
  return crypto.createHash('sha256').update(JSON.stringify(body), 'utf8').digest('hex');
}

async function findExistingOperation(fieldRecensementId, operationMutationId) {
  return FieldRecensementOperation.findOne({
    fieldRecensementId,
    operationMutationId,
  }).select('+operationHash');
}

async function checkBusinessDuplicate(
  normalizedPhone,
  professionalType,
  recenseurId,
  clientMutationId,
  excludeId = null,
) {
  const filter = {
    'person.telephone': normalizedPhone,
    professionalType,
    reviewStatus: { $nin: ['rejected'] },
    $nor: [{ recenseur: recenseurId, clientMutationId }],
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await FieldRecensement.findOne(filter).select('_id').lean();
  if (existing) {
    throw apiError(
      409,
      'RECENSEMENT_DUPLICATE_SUSPECTED',
      'Une fiche similaire existe déjà.',
      { matchReasons: ['same_telephone_and_type'], action: 'contact_supervisor' },
    );
  }
}

function scheduleDestroy(publicId) {
  if (!publicId || process.env.NODE_ENV === 'test') {
    // En test : appel synchrone mockable sans bloquer
    if (publicId && process.env.NODE_ENV === 'test') {
      import('../utils/kycAccess.js')
        .then(() => {
          /* destroy différé best-effort via cloudinary mock si présent */
        })
        .catch(() => {});
    }
    return;
  }
  setImmediate(() => {
    import('cloudinary')
      .then((c) => c.v2.uploader.destroy(publicId, { type: 'authenticated', invalidate: true }))
      .catch(() => {});
  });
}

/**
 * @param {{
 *   id: string,
 *   actorUser: object,
 *   req: object,
 *   body: object,
 *   profilePhotoFile?: { path: string } | null,
 * }} args
 */
export async function patchFieldRecensement({
  id,
  actorUser,
  req,
  body,
  profilePhotoFile = null,
}) {
  const tempPath = profilePhotoFile?.path || null;
  try {
    if (!isValidObjectIdParam(id)) {
      throw apiError(400, 'RECENSEMENT_ID_INVALID', 'Identifiant dossier invalide.');
    }

    if (!body || typeof body !== 'object') {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Corps JSON requis.');
    }

    const operationMutationId = body.operationMutationId;
    const expectedRevision = Number(body.expectedRevision);
    if (!operationMutationId || !/^[0-9a-fA-F-]{36}$/.test(String(operationMutationId))) {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'operationMutationId UUID requis.');
    }
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'expectedRevision invalide.');
    }

    const sanitized = sanitizeCorrectionChanges(body.changes ?? {});
    if (!sanitized.ok) {
      throw apiError(400, sanitized.code, sanitized.message);
    }
    const paths = sanitized.paths;

    const existingOp = await findExistingOperation(id, operationMutationId);
    let mediaSha256 = null;
    if (tempPath) {
      mediaSha256 = await sha256File(tempPath);
    }
    const operationHash = computeOperationHash({
      action: 'patch',
      expectedRevision,
      paths,
      mediaSha256,
    });

    if (existingOp) {
      if (existingOp.operationHash !== operationHash) {
        throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Opération réutilisée avec contenu différent.');
      }
      const latest = await FieldRecensement.findById(id);
      return {
        kind: 'already',
        code: 'RECENSEMENT_ALREADY_APPLIED',
        data: latest
          ? toAgentFieldRecensementDetail(latest)
          : {
              id: String(id),
              ...(existingOp.responseSnapshot || {}),
            },
      };
    }

    const doc = await FieldRecensement.findById(id).select(
      '+requestHash +currentContentHash +media.profilePhoto.ref +media.profilePhoto.publicId +media.profilePhoto.sha256 +matchedUtilisateurId +internalMatch',
    );
    if (!doc) {
      throw apiError(404, 'RECENSEMENT_NOT_FOUND', 'Dossier introuvable.');
    }

    const owner = String(doc.recenseur) === String(actorUser._id);
    if (isAdmin(req) && !owner) {
      throw apiError(403, 'RECENSEMENT_FORBIDDEN', 'L’admin ne modifie pas les données déclarées.');
    }
    if (!owner) {
      throw apiError(404, 'RECENSEMENT_NOT_FOUND', 'Dossier introuvable.');
    }

    if (doc.reviewStatus !== 'needs_correction') {
      throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Correction impossible dans cet état.');
    }

    if (doc.revision !== expectedRevision) {
      throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
        currentRevision: doc.revision,
      });
    }

    const allowedFields = doc.correction?.fields || [];
    const fieldCheck = assertChangesWithinCorrectionFields(paths, allowedFields);
    if (!fieldCheck.ok) {
      throw apiError(400, fieldCheck.code, fieldCheck.message);
    }

    if (tempPath && !allowedFields.includes('profilePhoto')) {
      throw apiError(
        400,
        'RECENSEMENT_CORRECTION_FIELD_FORBIDDEN',
        'Photo non demandée en correction.',
      );
    }
    if (allowedFields.includes('profilePhoto') && tempPath) {
      // ok
    } else if (Object.keys(paths).length === 0 && !tempPath) {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Aucun changement fourni.');
    }

    const slice = plainDocSlice(doc);
    const merged = applyPathChanges(slice, paths);
    merged.person = normalizePerson(merged.person);
    validateTarifs(merged.business);

    const validationPayload = toValidationPayload(doc, merged);
    const validated = await validateCreatePayloadAsync(validationPayload, {
      findService: (sid) => Service.findById(sid).lean(),
      findCategorie: (cid) => Categorie.findById(cid).lean(),
      findCategoriesByIds: async (ids) =>
        Categorie.find({ _id: { $in: ids } }).lean(),
    });
    if (!validated.ok) {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Validation échouée.', validated.errors);
    }

    const value = validated.value;
    value.business = buildBusinessDoc(doc.professionalType, value.business);
    if (doc.professionalType === 'prestataire' && value.business.derivedCategorieId) {
      /* already set by validator */
    }

    await checkBusinessDuplicate(
      value.person.telephone,
      doc.professionalType,
      doc.recenseur,
      doc.clientMutationId,
      doc._id,
    );

    const matchResult = await matchFieldRecensementUser({
      telephone: value.person.telephone,
      email: value.person.email,
      defaultCountry: 'CI',
    });
    const matchedId =
      matchResult?.status === 'verified_match' ? matchResult.matchedUtilisateurId : null;

    const photoSha =
      mediaSha256 || doc.media?.profilePhoto?.sha256 || null;
    const canonical = canonicalizeCreatePayload({
      ...value,
      business: {
        ...value.business,
        serviceId: value.business.serviceId ? String(value.business.serviceId) : undefined,
        categoryId: value.business.categoryId ? String(value.business.categoryId) : undefined,
        businessCategoryIds: value.business.businessCategoryIds?.map(String),
        derivedCategorieId: undefined,
        categoryLabel: undefined,
      },
    });
    const newContentHash = computeContentHash(canonical, photoSha);

    let newPhoto = null;
    let oldPublicId = doc.media?.profilePhoto?.publicId || null;
    if (tempPath) {
      const publicId = correctionPublicId(
        String(doc.recenseur),
        doc.clientMutationId,
        expectedRevision + 1,
      );
      try {
        const cldOpts = buildFieldMediaCloudinaryOptions({
          publicId,
          overwrite: true,
          mediaKind: 'profile_pending_private',
          fieldRecensementId: String(doc._id),
          uploadSessionId: `${doc.clientMutationId}:rev:${expectedRevision + 1}`,
        });
        const uploaded = await uploadKycToCloudinary(tempPath, undefined, {
          publicId: cldOpts.public_id,
          overwrite: cldOpts.overwrite,
          tags: cldOpts.tags,
          context: cldOpts.context,
        });
        newPhoto = {
          ref: uploaded.ref,
          publicId: uploaded.publicId,
          kind: 'profile_pending_private',
          status: 'uploaded',
          sha256: mediaSha256,
        };
      } catch {
        throw apiError(503, 'RECENSEMENT_MEDIA_FAILED', 'Échec upload média.', undefined, true);
      }
    }

    const addressed = new Set([...(doc.correction?.addressedFields || [])]);
    for (const k of Object.keys(paths)) addressed.add(k);
    if (tempPath) addressed.add('profilePhoto');

    const setFields = {
      person: value.person,
      business: value.business,
      location: value.location,
      consent: {
        recensementAccepted: value.consent.recensementAccepted,
        acceptedAt: value.consent.acceptedAt,
        textVersion: value.consent.textVersion,
        method: value.consent.method,
        language: value.consent.language,
      },
      currentContentHash: newContentHash,
      revision: expectedRevision + 1,
      lastOperationMutationId: operationMutationId,
      'correction.addressedFields': [...addressed],
      matchedUtilisateurId: matchedId || null,
    };
    if (matchedId) {
      setFields.internalMatch = {
        utilisateurId: matchedId,
        confidence: matchResult.confidence ?? 1,
        at: new Date(),
      };
    }
    if (newPhoto) {
      setFields['media.profilePhoto'] = newPhoto;
    }

    if (process.env.TEST_PATCH_SAVE_FAIL === '1') {
      if (newPhoto?.publicId) scheduleDestroy(newPhoto.publicId);
      throw apiError(500, 'RECENSEMENT_SAVE_FAILED', 'Échec sauvegarde (test).', undefined, true);
    }

    const updated = await FieldRecensement.findOneAndUpdate(
      {
        _id: doc._id,
        recenseur: actorUser._id,
        reviewStatus: 'needs_correction',
        revision: expectedRevision,
      },
      {
        $set: setFields,
        $push: {
          operationHashes: {
            operationMutationId,
            requestHash: operationHash,
            at: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      if (newPhoto?.publicId) scheduleDestroy(newPhoto.publicId);
      const latest = await FieldRecensement.findById(doc._id).select('revision').lean();
      throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
        currentRevision: latest?.revision,
      });
    }

    if (newPhoto && oldPublicId && oldPublicId !== newPhoto.publicId) {
      scheduleDestroy(oldPublicId);
    }

    const detail = toAgentFieldRecensementDetail(updated);
    try {
      await FieldRecensementOperation.create({
        fieldRecensementId: updated._id,
        operationMutationId,
        action: 'patch',
        operationHash,
        actorId: actorUser._id,
        result: 'patched',
        revisionBefore: expectedRevision,
        revisionAfter: updated.revision,
        httpStatus: 200,
        resultCode: 'RECENSEMENT_UPDATED',
        responseSnapshot: {
          id: String(updated._id),
          revision: updated.revision,
          reviewStatus: updated.reviewStatus,
          publicationStatus: updated.publicationStatus,
          clientMutationId: updated.clientMutationId,
        },
      });
    } catch (e) {
      if (e?.code === 11000) {
        const race = await findExistingOperation(id, operationMutationId);
        if (race?.operationHash === operationHash) {
          return {
            kind: 'already',
            code: 'RECENSEMENT_ALREADY_APPLIED',
            data: detail,
          };
        }
        throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Opération réutilisée avec contenu différent.');
      }
      throw e;
    }

    return { kind: 'patched', code: 'RECENSEMENT_UPDATED', data: detail };
  } finally {
    unlinkQuiet(tempPath);
  }
}

/**
 * @param {{ id: string, actorUser: object, req: object, body: object }} args
 */
export async function resubmitFieldRecensement({ id, actorUser, req, body }) {
  if (!isValidObjectIdParam(id)) {
    throw apiError(400, 'RECENSEMENT_ID_INVALID', 'Identifiant dossier invalide.');
  }
  if (!body || typeof body !== 'object') {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Corps JSON requis.');
  }

  const operationMutationId = body.operationMutationId;
  const expectedRevision = Number(body.expectedRevision);
  if (!operationMutationId || !/^[0-9a-fA-F-]{36}$/.test(String(operationMutationId))) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'operationMutationId UUID requis.');
  }
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'expectedRevision invalide.');
  }

  const operationHash = computeOperationHash({
    action: 'resubmit',
    expectedRevision,
    paths: {},
    mediaSha256: null,
  });

  const existingOp = await findExistingOperation(id, operationMutationId);
  if (existingOp) {
    if (existingOp.operationHash !== operationHash) {
      throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Opération réutilisée avec contenu différent.');
    }
    const latest = await FieldRecensement.findById(id);
    return {
      kind: 'already',
      code: 'RECENSEMENT_ALREADY_APPLIED',
      data: latest
        ? toAgentFieldRecensementDetail(latest)
        : {
            id: String(id),
            ...(existingOp.responseSnapshot || {}),
          },
    };
  }

  const doc = await FieldRecensement.findById(id).select(
    '+requestHash +currentContentHash +media.profilePhoto.ref +media.profilePhoto.sha256 +ingestionStatus',
  );
  if (!doc) {
    throw apiError(404, 'RECENSEMENT_NOT_FOUND', 'Dossier introuvable.');
  }

  const owner = String(doc.recenseur) === String(actorUser._id);
  if (isAdmin(req) && !owner) {
    throw apiError(403, 'RECENSEMENT_FORBIDDEN', 'Resubmit réservé au propriétaire.');
  }
  if (!owner) {
    throw apiError(404, 'RECENSEMENT_NOT_FOUND', 'Dossier introuvable.');
  }

  if (doc.reviewStatus !== 'needs_correction') {
    throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Resubmit impossible dans cet état.');
  }
  if (doc.revision !== expectedRevision) {
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: doc.revision,
    });
  }
  if (doc.ingestionStatus === 'failed' || doc.ingestionStatus === 'media_uploading') {
    throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Ingestion non terminée.');
  }

  const required = doc.correction?.fields || [];
  const addressed = new Set(doc.correction?.addressedFields || []);
  for (const f of required) {
    if (!addressed.has(f)) {
      throw apiError(
        400,
        'RECENSEMENT_CORRECTION_INCOMPLETE',
        `Champ demandé non corrigé : ${f}`,
      );
    }
  }
  if (required.includes('profilePhoto')) {
    const hasPhoto =
      doc.media?.profilePhoto?.ref ||
      doc.media?.profilePhoto?.sha256 ||
      doc.media?.profilePhoto?.kind;
    if (!hasPhoto) {
      throw apiError(400, 'RECENSEMENT_CORRECTION_INCOMPLETE', 'Photo demandée absente.');
    }
  }

  // Revalider payload complet
  const slice = plainDocSlice(doc);
  const validationPayload = toValidationPayload(doc, slice);
  const validated = await validateCreatePayloadAsync(validationPayload, {
    findService: (sid) => Service.findById(sid).lean(),
    findCategorie: (cid) => Categorie.findById(cid).lean(),
    findCategoriesByIds: async (ids) => Categorie.find({ _id: { $in: ids } }).lean(),
  });
  if (!validated.ok) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Dossier invalide.', validated.errors);
  }

  const now = new Date();
  const updated = await FieldRecensement.findOneAndUpdate(
    {
      _id: doc._id,
      recenseur: actorUser._id,
      reviewStatus: 'needs_correction',
      revision: expectedRevision,
    },
    {
      $set: {
        reviewStatus: 'pending_review',
        publicationStatus: 'not_started',
        revision: expectedRevision + 1,
        lastOperationMutationId: operationMutationId,
        'correction.resolvedAt': now,
        'correction.resolvedRevision': expectedRevision + 1,
      },
      $push: {
        decisionHistory: {
          action: 'resubmit',
          actorId: actorUser._id,
          at: now,
          note: doc.correction?.reasonCode || 'resubmit',
        },
        operationHashes: {
          operationMutationId,
          requestHash: operationHash,
          at: now,
        },
      },
    },
    { new: true },
  );

  if (!updated) {
    const latest = await FieldRecensement.findById(doc._id).select('revision reviewStatus').lean();
    if (latest?.reviewStatus === 'pending_review') {
      // autre concurrent a gagné — si même op déjà créée ailleurs
      throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
        currentRevision: latest.revision,
      });
    }
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: latest?.revision,
    });
  }

  const detail = toAgentFieldRecensementDetail(updated);
  try {
    await FieldRecensementOperation.create({
      fieldRecensementId: updated._id,
      operationMutationId,
      action: 'resubmit',
      operationHash,
      actorId: actorUser._id,
      result: 'resubmitted',
      revisionBefore: expectedRevision,
      revisionAfter: updated.revision,
      httpStatus: 200,
      resultCode: 'RECENSEMENT_RESUBMITTED',
      responseSnapshot: {
        id: String(updated._id),
        revision: updated.revision,
        reviewStatus: updated.reviewStatus,
        publicationStatus: updated.publicationStatus,
        clientMutationId: updated.clientMutationId,
      },
    });
  } catch (e) {
    if (e?.code === 11000) {
      const race = await findExistingOperation(id, operationMutationId);
      if (race?.operationHash === operationHash) {
        return { kind: 'already', code: 'RECENSEMENT_ALREADY_APPLIED', data: detail };
      }
      throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Opération réutilisée avec contenu différent.');
    }
    throw e;
  }

  return { kind: 'resubmitted', code: 'RECENSEMENT_RESUBMITTED', data: detail };
}

export default { patchFieldRecensement, resubmitFieldRecensement };
