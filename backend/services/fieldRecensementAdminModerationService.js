/**
 * R1-08A — Décisions admin : request-correction, reject, approve (+ déclenchement publish R1-09).
 */
import crypto from 'node:crypto';
import FieldRecensement from '../models/fieldRecensementModel.js';
import FieldRecensementOperation from '../models/fieldRecensementOperationModel.js';
import FieldRecensementAuditEvent from '../models/fieldRecensementAuditEventModel.js';
import Service from '../models/serviceModel.js';
import Categorie from '../models/categorieModel.js';
import { apiError } from './fieldRecensementCreateService.js';
import { toAdminFieldRecensementDetail } from '../utils/fieldRecensementDto.js';
import { CORRECTION_FIELD_ALLOWLIST } from '../utils/fieldRecensementCorrection.js';
import {
  ADMIN_REASON_CODES,
  REJECT_REASON_CODES,
  MAX_CORRECTION_FIELDS,
  MAX_CORRECTION_MESSAGE_LEN,
} from '../utils/fieldRecensementAdminReasons.js';
import { validateCreatePayloadAsync } from '../utils/fieldRecensementValidate.js';
import { matchFieldRecensementUser } from './fieldRecensementUserMatcher.js';
import { publishFieldRecensement } from './fieldRecensementPublishService.js';

const COMMON_FIELDS = Object.freeze([
  'person.nom',
  'person.prenoms',
  'person.telephone',
  'person.whatsapp',
  'person.email',
  'location.adresse',
  'location.commune',
  'location.quartier',
  'location.zonesIntervention',
  'location.latitude',
  'location.longitude',
  'location.accuracyMeters',
  'profilePhoto',
  'consent',
]);

const FIELDS_BY_TYPE = Object.freeze({
  prestataire: [
    ...COMMON_FIELDS,
    'business.serviceId',
    'business.description',
    'business.tarifDeclareMin',
    'business.tarifDeclareMax',
    'business.horairesTexte',
    'business.devise',
    'business.disponibilite',
  ],
  freelance: [
    ...COMMON_FIELDS,
    'business.displayName',
    'business.jobTitle',
    'business.categoryId',
    'business.skills',
    'business.hourlyRate',
    'business.bio',
    'business.horairesTexte',
  ],
  vendeur: [
    ...COMMON_FIELDS,
    'business.shopName',
    'business.shopDescription',
    'business.businessType',
    'business.businessCategoryIds',
    'business.productTypeLabels',
  ],
});

const DECISION_BODY_KEYS = Object.freeze([
  'operationMutationId',
  'expectedRevision',
  'reasonCode',
  'message',
  'fields',
  'internalNote',
]);

function isValidObjectIdParam(id) {
  return /^[a-fA-F0-9]{24}$/.test(String(id));
}

function assertStrictBody(body, { allowFields = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Corps JSON objet requis.');
  }
  for (const key of Object.keys(body)) {
    if (key.startsWith('$') || key.includes('__proto__') || key === 'constructor') {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Propriété interdite.');
    }
    if (!DECISION_BODY_KEYS.includes(key)) {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', `Propriété inconnue : ${key}`);
    }
    if (key === 'fields' && !allowFields) {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'fields non autorisé pour cette action.');
    }
    if (key === 'internalNote') {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'internalNote non supporté dans cette phase.');
    }
  }
}

function parseCommonDecision(body, { allowFields = false } = {}) {
  assertStrictBody(body, { allowFields });
  const operationMutationId = body.operationMutationId;
  const expectedRevision = Number(body.expectedRevision);
  if (!operationMutationId || !/^[0-9a-fA-F-]{36}$/.test(String(operationMutationId))) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'operationMutationId UUID requis.');
  }
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'expectedRevision invalide.');
  }
  if (body.requestHash != null || body.currentContentHash != null || body.operationHash != null) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Hash client interdit.');
  }
  return { operationMutationId, expectedRevision };
}

function sanitizeMessage(message) {
  if (message == null || message === '') return undefined;
  if (typeof message !== 'string') {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'message doit être une chaîne.');
  }
  const trimmed = message.trim().slice(0, MAX_CORRECTION_MESSAGE_LEN);
  if (message.trim().length > MAX_CORRECTION_MESSAGE_LEN) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'message trop long.');
  }
  return trimmed || undefined;
}

function normalizeFields(fields, professionalType) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'fields tableau non vide requis.');
  }
  if (fields.length > MAX_CORRECTION_FIELDS) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', `fields max ${MAX_CORRECTION_FIELDS}.`);
  }
  const allowedForType = new Set(FIELDS_BY_TYPE[professionalType] || []);
  const seen = new Set();
  const out = [];
  for (const raw of fields) {
    if (typeof raw !== 'string') {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'Chaque field doit être une chaîne.');
    }
    const f = raw.trim();
    if (!f || f.includes('$') || f.includes('[') || f.includes('*') || f.includes('__proto__')) {
      throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', `Chemin invalide : ${raw}`);
    }
    if (!CORRECTION_FIELD_ALLOWLIST.includes(f)) {
      throw apiError(400, 'RECENSEMENT_CORRECTION_FIELD_FORBIDDEN', `Champ non corrigible : ${f}`);
    }
    if (!allowedForType.has(f)) {
      throw apiError(
        400,
        'RECENSEMENT_CORRECTION_FIELD_FORBIDDEN',
        `Champ incompatible avec ${professionalType} : ${f}`,
      );
    }
    const key = f.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  if (out.length === 0) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'fields vide après normalisation.');
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function computeDecisionHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
}

async function findExistingOperation(fieldRecensementId, operationMutationId) {
  return FieldRecensementOperation.findOne({
    fieldRecensementId,
    operationMutationId,
  }).select('+operationHash');
}

function adminDto(doc, extras = {}) {
  return {
    ...toAdminFieldRecensementDetail(doc),
    ...extras,
  };
}

async function writeDecisionAudit({
  fieldRecensementId,
  operationMutationId,
  actorId,
  action,
  reasonCode,
  previousStatus,
  nextStatus,
  revisionBefore,
  revisionAfter,
  fields,
  note,
}) {
  if (process.env.TEST_AUDIT_FAIL === '1') {
    throw apiError(500, 'RECENSEMENT_AUDIT_FAILED', 'Échec écriture audit (test).', undefined, true);
  }
  try {
    await FieldRecensementAuditEvent.create({
      fieldRecensementId,
      kind: 'decision',
      operationMutationId,
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
        fields: fields || undefined,
        note: note ? String(note).slice(0, 500) : undefined,
      },
    });
  } catch (e) {
    if (e?.code === 11000) {
      return; // déjà écrit — idempotent
    }
    throw e;
  }
}

async function ensureAuditOrRepair(args) {
  const existing = await FieldRecensementAuditEvent.findOne({
    kind: 'decision',
    operationMutationId: args.operationMutationId,
  }).lean();
  if (existing) return;
  await writeDecisionAudit(args);
}

async function loadDocOr404(id) {
  if (!isValidObjectIdParam(id)) {
    throw apiError(400, 'RECENSEMENT_ID_INVALID', 'Identifiant dossier invalide.');
  }
  const doc = await FieldRecensement.findById(id).select(
    '+requestHash +currentContentHash +media.profilePhoto.ref +ingestionStatus +matchedUtilisateurId +internalMatch',
  );
  if (!doc) {
    throw apiError(404, 'RECENSEMENT_NOT_FOUND', 'Dossier introuvable.');
  }
  return doc;
}

async function handleIdempotentReplay({
  existingOp,
  operationHash,
  id,
  action,
  auditArgs,
  actorUser,
}) {
  if (existingOp.operationHash !== operationHash) {
    throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Opération réutilisée avec contenu différent.');
  }
  await ensureAuditOrRepair(auditArgs);
  const latest = await FieldRecensement.findById(id);

  if (action === 'approve' && latest?.reviewStatus === 'approved') {
    return continuePublicationAfterApprove({
      id,
      actorUser,
      operationMutationId: existingOp.operationMutationId,
      fallbackDoc: latest,
      alreadyApplied: true,
    });
  }

  return {
    kind: 'already',
    code: 'RECENSEMENT_ALREADY_APPLIED',
    status: 200,
    data: adminDto(latest),
    retryable: false,
  };
}

/**
 * Après décision approve (ou rejeu) : lance / reprend la publication fail-safe.
 * Ne jamais annuler reviewStatus=approved.
 */
async function continuePublicationAfterApprove({
  id,
  actorUser,
  operationMutationId,
  fallbackDoc,
  alreadyApplied = false,
}) {
  try {
    const pub = await publishFieldRecensement({
      id: String(id),
      actorUser,
      operationMutationId: `publish-after-approve:${operationMutationId}`,
      ownerKey: `approve-pub:${actorUser._id}:${id}`,
    });
    return {
      kind: pub.kind,
      code: pub.code,
      status: pub.status,
      data: {
        ...pub.data,
        publicationPending: pub.kind !== 'published' && pub.kind !== 'already',
      },
      retryable: pub.kind === 'processing',
    };
  } catch (err) {
    const fresh = (await FieldRecensement.findById(id)) || fallbackDoc;
    const retryable = err.retryable !== false && err.status !== 409;
    return {
      kind: alreadyApplied ? 'already_publish_failed' : 'publish_failed',
      code: err.code || 'RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE',
      status: err.status === 409 ? 409 : err.status || 503,
      data: adminDto(fresh, { publicationPending: true }),
      retryable,
      success: false,
    };
  }
}

/**
 * POST request-correction
 */
export async function requestCorrectionFieldRecensement({ id, actorUser, body }) {
  const { operationMutationId, expectedRevision } = parseCommonDecision(body, {
    allowFields: true,
  });
  const reasonCode = body.reasonCode;
  if (!ADMIN_REASON_CODES.includes(reasonCode)) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'reasonCode inconnu.');
  }
  const message = sanitizeMessage(body.message);

  const doc = await loadDocOr404(id);
  const fields = normalizeFields(body.fields, doc.professionalType);

  const operationHash = computeDecisionHash({
    action: 'request_correction',
    expectedRevision,
    reasonCode,
    message: message || null,
    fields,
  });

  const existingOp = await findExistingOperation(id, operationMutationId);
  const auditArgs = {
    fieldRecensementId: id,
    operationMutationId,
    actorId: actorUser._id,
    action: 'request_correction',
    reasonCode,
    previousStatus: 'pending_review',
    nextStatus: 'needs_correction',
    revisionBefore: expectedRevision,
    revisionAfter: expectedRevision + 1,
    fields,
    note: message,
  };

  if (existingOp) {
    return handleIdempotentReplay({
      existingOp,
      operationHash,
      id,
      action: 'request_correction',
      auditArgs: {
        ...auditArgs,
        previousStatus: existingOp.responseSnapshot?.reviewStatus
          ? 'pending_review'
          : 'pending_review',
        revisionBefore: existingOp.revisionBefore,
        revisionAfter: existingOp.revisionAfter,
      },
    });
  }

  if (doc.reviewStatus !== 'pending_review') {
    throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Demande de correction impossible dans cet état.');
  }
  if (doc.revision !== expectedRevision) {
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: doc.revision,
    });
  }

  const now = new Date();
  const updated = await FieldRecensement.findOneAndUpdate(
    {
      _id: doc._id,
      reviewStatus: 'pending_review',
      revision: expectedRevision,
    },
    {
      $set: {
        reviewStatus: 'needs_correction',
        revision: expectedRevision + 1,
        lastOperationMutationId: operationMutationId,
        correction: {
          reasonCode,
          message,
          fields,
          requestedAt: now,
          requestedBy: actorUser._id,
          addressedFields: [],
        },
      },
      $push: {
        decisionHistory: {
          action: 'request_correction',
          actorId: actorUser._id,
          at: now,
          note: reasonCode,
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
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: latest?.revision,
    });
  }

  try {
    await FieldRecensementOperation.create({
      fieldRecensementId: updated._id,
      operationMutationId,
      action: 'request_correction',
      operationHash,
      actorId: actorUser._id,
      result: 'correction_requested',
      revisionBefore: expectedRevision,
      revisionAfter: updated.revision,
      httpStatus: 200,
      resultCode: 'RECENSEMENT_CORRECTION_REQUESTED',
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
        await ensureAuditOrRepair(auditArgs);
        return {
          kind: 'already',
          code: 'RECENSEMENT_ALREADY_APPLIED',
          status: 200,
          data: adminDto(updated),
        };
      }
      throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Opération réutilisée avec contenu différent.');
    }
    throw e;
  }

  await writeDecisionAudit({
    ...auditArgs,
    revisionAfter: updated.revision,
  });

  return {
    kind: 'correction_requested',
    code: 'RECENSEMENT_CORRECTION_REQUESTED',
    status: 200,
    data: adminDto(updated),
  };
}

/**
 * POST reject
 */
export async function rejectFieldRecensement({ id, actorUser, body }) {
  const { operationMutationId, expectedRevision } = parseCommonDecision(body);
  const reasonCode = body.reasonCode;
  if (!REJECT_REASON_CODES.includes(reasonCode)) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'reasonCode inconnu.');
  }
  const message = sanitizeMessage(body.message);

  const doc = await loadDocOr404(id);
  const operationHash = computeDecisionHash({
    action: 'reject',
    expectedRevision,
    reasonCode,
    message: message || null,
  });

  const existingOp = await findExistingOperation(id, operationMutationId);
  const auditArgs = {
    fieldRecensementId: id,
    operationMutationId,
    actorId: actorUser._id,
    action: 'reject',
    reasonCode,
    previousStatus: doc.reviewStatus,
    nextStatus: 'rejected',
    revisionBefore: expectedRevision,
    revisionAfter: expectedRevision + 1,
    note: message,
  };

  if (existingOp) {
    return handleIdempotentReplay({
      existingOp,
      operationHash,
      id,
      action: 'reject',
      auditArgs: {
        ...auditArgs,
        previousStatus: existingOp.responseSnapshot?.reviewStatus || doc.reviewStatus,
        revisionBefore: existingOp.revisionBefore,
        revisionAfter: existingOp.revisionAfter,
      },
    });
  }

  if (!['pending_review', 'needs_correction'].includes(doc.reviewStatus)) {
    throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Rejet impossible dans cet état.');
  }
  if (doc.revision !== expectedRevision) {
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: doc.revision,
    });
  }

  const now = new Date();
  const setFields = {
    reviewStatus: 'rejected',
    revision: expectedRevision + 1,
    lastOperationMutationId: operationMutationId,
  };
  if (doc.correction && !doc.correction.resolvedAt) {
    setFields['correction.resolvedAt'] = now;
    setFields['correction.resolvedRevision'] = expectedRevision + 1;
  }

  const updated = await FieldRecensement.findOneAndUpdate(
    {
      _id: doc._id,
      reviewStatus: { $in: ['pending_review', 'needs_correction'] },
      revision: expectedRevision,
    },
    {
      $set: setFields,
      $push: {
        decisionHistory: {
          action: 'reject',
          actorId: actorUser._id,
          at: now,
          note: reasonCode,
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
    const latest = await FieldRecensement.findById(doc._id).select('revision').lean();
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: latest?.revision,
    });
  }

  try {
    await FieldRecensementOperation.create({
      fieldRecensementId: updated._id,
      operationMutationId,
      action: 'reject',
      operationHash,
      actorId: actorUser._id,
      result: 'rejected',
      revisionBefore: expectedRevision,
      revisionAfter: updated.revision,
      httpStatus: 200,
      resultCode: 'RECENSEMENT_REJECTED',
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
        await ensureAuditOrRepair(auditArgs);
        return {
          kind: 'already',
          code: 'RECENSEMENT_ALREADY_APPLIED',
          status: 200,
          data: adminDto(updated),
        };
      }
      throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Opération réutilisée avec contenu différent.');
    }
    throw e;
  }

  await writeDecisionAudit({
    ...auditArgs,
    previousStatus: doc.reviewStatus,
    revisionAfter: updated.revision,
  });

  return {
    kind: 'rejected',
    code: 'RECENSEMENT_REJECTED',
    status: 200,
    data: adminDto(updated),
  };
}

async function assertApprovable(doc) {
  if (doc.ingestionStatus !== 'completed') {
    throw apiError(409, 'RECENSEMENT_NOT_READY', 'Ingestion non terminée.');
  }
  if (!doc.consent?.recensementAccepted) {
    throw apiError(409, 'RECENSEMENT_NOT_READY', 'Consentement invalide.');
  }
  if (doc.reviewStatus === 'needs_correction' || (doc.correction && !doc.correction.resolvedAt && doc.correction.fields?.length)) {
    // approve only from pending_review; this is extra safety
  }

  const business = doc.business?.toObject?.() || { ...doc.business };
  delete business.derivedCategorieId;
  delete business.categoryLabel;
  const payload = {
    clientMutationId: doc.clientMutationId,
    operationMutationId: doc.clientMutationId,
    schemaVersion: doc.schemaVersion || 1,
    professionalType: doc.professionalType,
    recordedAt: doc.timing?.recordedAt?.toISOString?.() || new Date().toISOString(),
    app: doc.app?.toObject?.() || doc.app,
    person: doc.person?.toObject?.() || doc.person,
    business: {
      ...business,
      serviceId: business.serviceId ? String(business.serviceId) : undefined,
      categoryId: business.categoryId ? String(business.categoryId) : undefined,
      businessCategoryIds: business.businessCategoryIds?.map(String),
    },
    location: doc.location?.toObject?.() || doc.location,
    consent: {
      recensementAccepted: doc.consent.recensementAccepted,
      textVersion: doc.consent.textVersion,
      acceptedAt: doc.consent.acceptedAt,
    },
    metadata: doc.metadata?.toObject?.() || doc.metadata || {},
  };

  const validated = await validateCreatePayloadAsync(payload, {
    findService: (sid) => Service.findById(sid).lean(),
    findCategorie: (cid) => Categorie.findById(cid).lean(),
    findCategoriesByIds: async (ids) => Categorie.find({ _id: { $in: ids } }).lean(),
  });
  if (!validated.ok) {
    throw apiError(409, 'RECENSEMENT_NOT_READY', 'Données métier invalides.', validated.errors);
  }

  const match = await matchFieldRecensementUser({
    telephone: payload.person.telephone,
    email: payload.person.email,
    defaultCountry: 'CI',
  });
  if (match.status === 'conflict' || match.status === 'ambiguous') {
    throw apiError(
      409,
      'RECENSEMENT_MATCH_REVIEW_REQUIRED',
      'Correspondance utilisateur ambiguë — revue humaine requise.',
    );
  }

  const dup = await FieldRecensement.findOne({
    _id: { $ne: doc._id },
    'person.telephone': payload.person.telephone,
    professionalType: doc.professionalType,
    reviewStatus: { $nin: ['rejected'] },
  })
    .select('_id')
    .lean();
  if (dup) {
    throw apiError(
      409,
      'RECENSEMENT_DUPLICATE_SUSPECTED',
      'Doublon métier non résolu — revue humaine requise.',
    );
  }
}

/**
 * POST approve — décision de revue + publication fail-safe (R1-09).
 */
export async function approveFieldRecensement({ id, actorUser, body }) {
  const { operationMutationId, expectedRevision } = parseCommonDecision(body);
  const reasonCode = body.reasonCode || 'OTHER';
  if (!ADMIN_REASON_CODES.includes(reasonCode)) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'reasonCode inconnu.');
  }
  const message = sanitizeMessage(body.message);

  const doc = await loadDocOr404(id);
  const operationHash = computeDecisionHash({
    action: 'approve',
    expectedRevision,
    reasonCode,
    message: message || null,
  });

  const existingOp = await findExistingOperation(id, operationMutationId);
  const auditArgs = {
    fieldRecensementId: id,
    operationMutationId,
    actorId: actorUser._id,
    action: 'approve',
    reasonCode,
    previousStatus: 'pending_review',
    nextStatus: 'approved',
    revisionBefore: expectedRevision,
    revisionAfter: expectedRevision + 1,
    note: message,
  };

  if (existingOp) {
    return handleIdempotentReplay({
      existingOp,
      operationHash,
      id,
      action: 'approve',
      actorUser,
      auditArgs: {
        ...auditArgs,
        revisionBefore: existingOp.revisionBefore,
        revisionAfter: existingOp.revisionAfter,
      },
    });
  }

  if (doc.reviewStatus !== 'pending_review') {
    throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Approbation impossible dans cet état.');
  }
  if (doc.revision !== expectedRevision) {
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: doc.revision,
    });
  }

  await assertApprovable(doc);

  const now = new Date();
  const updated = await FieldRecensement.findOneAndUpdate(
    {
      _id: doc._id,
      reviewStatus: 'pending_review',
      revision: expectedRevision,
      ingestionStatus: 'completed',
    },
    {
      $set: {
        reviewStatus: 'approved',
        publicationStatus: 'not_started',
        revision: expectedRevision + 1,
        lastOperationMutationId: operationMutationId,
      },
      $push: {
        decisionHistory: {
          action: 'approve',
          actorId: actorUser._id,
          at: now,
          note: reasonCode,
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
    const latest = await FieldRecensement.findById(doc._id).select('revision').lean();
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: latest?.revision,
    });
  }

  try {
    await FieldRecensementOperation.create({
      fieldRecensementId: updated._id,
      operationMutationId,
      action: 'approve',
      operationHash,
      actorId: actorUser._id,
      result: 'approved',
      revisionBefore: expectedRevision,
      revisionAfter: updated.revision,
      httpStatus: 202,
      resultCode: 'RECENSEMENT_APPROVED_PENDING_PUBLICATION',
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
        await ensureAuditOrRepair(auditArgs);
        return continuePublicationAfterApprove({
          id: updated._id,
          actorUser,
          operationMutationId,
          fallbackDoc: updated,
          alreadyApplied: true,
        });
      }
      throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Opération réutilisée avec contenu différent.');
    }
    throw e;
  }

  await writeDecisionAudit({
    ...auditArgs,
    revisionAfter: updated.revision,
  });

  return continuePublicationAfterApprove({
    id: updated._id,
    actorUser,
    operationMutationId,
    fallbackDoc: updated,
  });
}

export { FIELDS_BY_TYPE, COMMON_FIELDS };
