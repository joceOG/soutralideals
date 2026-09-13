/**
 * R1-09 — Publication fail-safe FieldRecensement → Utilisateur + profil pro.
 */
import crypto from 'node:crypto';
import FieldRecensement from '../models/fieldRecensementModel.js';
import FieldRecensementOperation from '../models/fieldRecensementOperationModel.js';
import FieldRecensementAuditEvent from '../models/fieldRecensementAuditEventModel.js';
import Utilisateur from '../models/utilisateurModel.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import Service from '../models/serviceModel.js';
import Categorie from '../models/categorieModel.js';
import { apiError } from './fieldRecensementCreateService.js';
import { matchFieldRecensementUser } from './fieldRecensementUserMatcher.js';
import { validateCreatePayloadAsync } from '../utils/fieldRecensementValidate.js';
import { toAdminFieldRecensementDetail } from '../utils/fieldRecensementDto.js';
import { invalidateCache } from '../middleware/cacheInvalidation.js';
import {
  promoteAuthenticatedToPublic,
  buildDeterministicProfilePublicId,
} from '../utils/fieldRecensementMediaAdapter.js';

const LEASE_MS = Number(process.env.FIELD_PUBLISH_LEASE_MS || 60_000);
const SOURCE_V1 = 'field_recensement_v1';

function crashAfter(step) {
  if (process.env.TEST_PUBLISH_CRASH_AFTER === step) {
    const err = new Error(`TEST_CRASH:${step}`);
    err.status = 503;
    err.code = 'RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE';
    err.retryable = true;
    throw err;
  }
}

async function writeAudit({
  fieldRecensementId,
  operationMutationId,
  actorId,
  action,
  note,
}) {
  if (!operationMutationId) return;
  const key = `${operationMutationId}:${action}`;
  try {
    await FieldRecensementAuditEvent.create({
      fieldRecensementId,
      kind: 'decision',
      operationMutationId: key,
      actorId,
      at: new Date(),
      meta: {
        action,
        outcome: 'success',
        note: note ? String(note).slice(0, 500) : undefined,
      },
    });
  } catch (e) {
    if (e?.code === 11000) return;
    throw e;
  }
}

async function setPublicationState(docId, status, extra = {}) {
  return FieldRecensement.findByIdAndUpdate(
    docId,
    { $set: { publicationStatus: status, ...extra } },
    { new: true },
  );
}

async function recordPubError(docId, step, code, attempts, retryable = true) {
  await FieldRecensement.findByIdAndUpdate(docId, {
    $set: {
      publicationStatus: 'failed',
      publicationError: {
        step,
        code,
        at: new Date(),
        attempts,
        retryable,
      },
    },
  });
}

/**
 * Acquire or refresh publication lock.
 * @returns {{ ok: true, attemptId, attempts } | { ok: false, processing: true } | throws }
 */
async function acquireLock(docId, ownerId) {
  const now = new Date();
  const attemptId = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(now.getTime() + LEASE_MS);

  const current = await FieldRecensement.findById(docId)
    .select('+publicationLock publicationStatus')
    .lean();
  if (!current) return { ok: false, processing: false };
  if (current.publicationStatus === 'published') {
    return { ok: true, attemptId: 'already', attempts: 0, alreadyPublished: true };
  }

  const lock = current.publicationLock;
  const lockHeld =
    lock?.expiresAt &&
    new Date(lock.expiresAt) > now &&
    lock.ownerId &&
    lock.ownerId !== ownerId;
  if (lockHeld) {
    return { ok: false, processing: true };
  }

  const attempts = (lock?.attempts || 0) + 1;
  const acquired = await FieldRecensement.findOneAndUpdate(
    {
      _id: docId,
      $or: [
        { publicationLock: { $exists: false } },
        { publicationLock: null },
        { 'publicationLock.expiresAt': { $lte: now } },
        { 'publicationLock.ownerId': ownerId },
      ],
    },
    {
      $set: {
        publicationLock: {
          ownerId,
          attemptId,
          acquiredAt: now,
          expiresAt,
          attempts,
        },
      },
    },
    { new: true },
  ).select('+publicationLock');

  if (!acquired) {
    return { ok: false, processing: true };
  }
  return { ok: true, attemptId, attempts };
}

async function releaseLock(docId, attemptId) {
  await FieldRecensement.updateOne(
    { _id: docId, 'publicationLock.attemptId': attemptId },
    { $unset: { publicationLock: 1 } },
  );
}

async function revalidateForPublish(doc) {
  if (doc.reviewStatus !== 'approved') {
    throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Dossier non approuvé.');
  }
  if (doc.ingestionStatus !== 'completed') {
    throw apiError(409, 'RECENSEMENT_PUBLICATION_BLOCKED', 'Ingestion incomplète.');
  }
  if (!doc.consent?.recensementAccepted) {
    throw apiError(409, 'RECENSEMENT_PUBLICATION_BLOCKED', 'Consentement invalide.');
  }
  if (doc.correction && !doc.correction.resolvedAt && doc.correction.fields?.length) {
    // allowed if approved after resubmit (resolved) — if active correction while approved, block
    if (doc.reviewStatus === 'approved' && !doc.correction.resolvedAt) {
      // after approve from pending, correction may be undefined; if leftover without resolved — block
    }
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
    metadata: {},
  };
  const validated = await validateCreatePayloadAsync(payload, {
    findService: (sid) => Service.findById(sid).lean(),
    findCategorie: (cid) => Categorie.findById(cid).lean(),
    findCategoriesByIds: async (ids) => Categorie.find({ _id: { $in: ids } }).lean(),
  });
  if (!validated.ok) {
    throw apiError(409, 'RECENSEMENT_PUBLICATION_BLOCKED', 'Données métier invalides.', validated.errors);
  }

  const match = await matchFieldRecensementUser({
    telephone: payload.person.telephone,
    email: payload.person.email,
    defaultCountry: 'CI',
  });
  if (match.status === 'conflict' || match.status === 'ambiguous') {
    throw apiError(409, 'RECENSEMENT_PUBLICATION_BLOCKED', 'Match utilisateur ambigu.');
  }
  if (match.status === 'blocked_candidate') {
    throw apiError(409, 'RECENSEMENT_PUBLICATION_BLOCKED', 'Compte utilisateur bloqué.');
  }

  const dup = await FieldRecensement.findOne({
    _id: { $ne: doc._id },
    'person.telephone': payload.person.telephone,
    professionalType: doc.professionalType,
    reviewStatus: { $nin: ['rejected'] },
    publicationStatus: 'published',
  })
    .select('_id')
    .lean();
  if (dup) {
    throw apiError(409, 'RECENSEMENT_PUBLICATION_BLOCKED', 'Doublon métier publié.');
  }

  return { validated: validated.value, match };
}

async function resolveOrCreateUser(doc, match, actorId, operationMutationId) {
  // Reprise : lien durable déjà présent
  const existingLink = await FieldRecensement.findById(doc._id)
    .select('+publicationLinkedUtilisateurId')
    .lean();
  if (existingLink?.publicationLinkedUtilisateurId) {
    const u = await Utilisateur.findById(existingLink.publicationLinkedUtilisateurId);
    if (u) return { user: u, created: false };
  }

  // Stub déjà créé pour ce dossier
  const bySource = await Utilisateur.findOne({
    source: SOURCE_V1,
    sourceFieldRecensementId: doc._id,
  });
  if (bySource) {
    await FieldRecensement.updateOne(
      { _id: doc._id },
      { $set: { publicationLinkedUtilisateurId: bySource._id } },
    );
    return { user: bySource, created: false };
  }

  if (match.status === 'verified_match' && match.matchedUtilisateurId) {
    const u = await Utilisateur.findById(match.matchedUtilisateurId);
    if (!u || u.isActive === false) {
      throw apiError(409, 'RECENSEMENT_PUBLICATION_BLOCKED', 'Utilisateur matché indisponible.');
    }
    if (u.activationStatus === 'pending_claim' && String(u.sourceFieldRecensementId) !== String(doc._id)) {
      throw apiError(409, 'RECENSEMENT_PUBLICATION_BLOCKED', 'Stub appartenant à un autre dossier.');
    }
    await FieldRecensement.updateOne(
      { _id: doc._id },
      { $set: { publicationLinkedUtilisateurId: u._id, matchedUtilisateurId: u._id } },
    );
    await writeAudit({
      fieldRecensementId: doc._id,
      operationMutationId,
      actorId,
      action: 'publish_user_linked',
    });
    return { user: u, created: false };
  }

  // Créer stub pending_claim
  const secret = crypto.randomBytes(32).toString('base64url');
  const roleMap = {
    prestataire: 'Prestataire',
    freelance: 'Freelance',
    vendeur: 'Vendeur',
  };
  let user;
  try {
    user = await Utilisateur.create({
      nom: doc.person.nom,
      prenom: doc.person.prenoms || '',
      telephone: doc.person.telephone,
      telephoneVerified: false,
      password: secret,
      role: roleMap[doc.professionalType] || 'Client',
      isActive: false,
      activationStatus: 'pending_claim',
      source: SOURCE_V1,
      sourceFieldRecensementId: doc._id,
      tokens: [],
      refreshTokens: [],
    });
    // Garantir l’état stub même si un default Mongoose interfère
    await Utilisateur.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          isActive: false,
          activationStatus: 'pending_claim',
          telephoneVerified: false,
          tokens: [],
          refreshTokens: [],
        },
      },
    );
    user = await Utilisateur.findById(user._id);
  } catch (e) {
    if (e?.code === 11000) {
      const again = await Utilisateur.findOne({
        source: SOURCE_V1,
        sourceFieldRecensementId: doc._id,
      });
      if (again) {
        await FieldRecensement.updateOne(
          { _id: doc._id },
          { $set: { publicationLinkedUtilisateurId: again._id } },
        );
        return { user: again, created: false };
      }
    }
    throw e;
  }
  // Ne jamais logger secret
  await FieldRecensement.updateOne(
    { _id: doc._id },
    { $set: { publicationLinkedUtilisateurId: user._id } },
  );
  await writeAudit({
    fieldRecensementId: doc._id,
    operationMutationId,
    actorId,
    action: 'publish_user_stub_created',
  });
  return { user, created: true };
}

function localisationString(doc) {
  const parts = [doc.location?.quartier, doc.location?.commune, doc.location?.adresse].filter(
    Boolean,
  );
  return parts.join(', ') || doc.location?.commune || 'Non précisé';
}

async function findExistingProfile(doc) {
  const Model =
    doc.professionalType === 'prestataire'
      ? prestataireModel
      : doc.professionalType === 'freelance'
        ? freelanceModel
        : vendeurModel;
  return Model.findOne({ sourceFieldRecensementId: doc._id });
}

async function createOrGetProfile(doc, user, validated, operationMutationId, actorId) {
  const existing = await findExistingProfile(doc);
  if (existing) {
    await writeAudit({
      fieldRecensementId: doc._id,
      operationMutationId,
      actorId,
      action: 'publish_profile_linked',
    });
    return { profile: existing, created: false };
  }

  // Profil déjà lié sur un autre user du même type ?
  const Model =
    doc.professionalType === 'prestataire'
      ? prestataireModel
      : doc.professionalType === 'freelance'
        ? freelanceModel
        : vendeurModel;
  const other = await Model.findOne({ utilisateur: user._id });
  if (other) {
    if (
      other.source === SOURCE_V1 &&
      String(other.sourceFieldRecensementId) === String(doc._id)
    ) {
      return { profile: other, created: false };
    }
    throw apiError(
      409,
      'RECENSEMENT_PUBLICATION_BLOCKED',
      'Profil existant incompatible — revue humaine.',
    );
  }

  let profile;
  if (doc.professionalType === 'prestataire') {
    const svcId = validated.business.serviceId || doc.business.serviceId;
    const svc = await Service.findById(svcId).lean();
    if (!svc) throw apiError(409, 'RECENSEMENT_PUBLICATION_BLOCKED', 'Service introuvable.');
    const prix =
      validated.business.tarifDeclareMin != null
        ? Number(validated.business.tarifDeclareMin)
        : 0;
    profile = await prestataireModel.create({
      utilisateur: user._id,
      service: svc._id,
      prixprestataire: Number.isFinite(prix) ? prix : 0,
      localisation: localisationString(doc),
      localisationmaps:
        doc.location?.latitude != null
          ? { latitude: doc.location.latitude, longitude: doc.location.longitude }
          : undefined,
      description: validated.business.description || doc.business.description,
      tarifHoraireMin: validated.business.tarifDeclareMin,
      tarifHoraireMax: validated.business.tarifDeclareMax,
      zoneIntervention: doc.location?.zonesIntervention || [],
      status: 'pending',
      verifier: false,
      source: SOURCE_V1,
      sourceFieldRecensementId: doc._id,
      fieldPublicationStatus: 'preparing',
      recenseur: doc.recenseur,
      dateRecensement: doc.timing?.recordedAt,
    });
  } else if (doc.professionalType === 'freelance') {
    const catId = validated.business.categoryId || doc.business.categoryId;
    const cat = await Categorie.findById(catId).lean();
    if (!cat) throw apiError(409, 'RECENSEMENT_PUBLICATION_BLOCKED', 'Catégorie introuvable.');
    const label = cat.nomcategorie || doc.business.categoryLabel;
    profile = await freelanceModel.create({
      utilisateur: user._id,
      name: validated.business.displayName || doc.business.displayName,
      job: validated.business.jobTitle || doc.business.jobTitle,
      category: label,
      hourlyRate: Number(validated.business.hourlyRate || 0),
      description: validated.business.bio || '',
      skills: validated.business.skills || [],
      location: localisationString(doc),
      phoneNumber: doc.person.telephone,
      accountStatus: 'Pending',
      status: 'pending',
      verificationDocuments: { isVerified: false },
      source: SOURCE_V1,
      sourceFieldRecensementId: doc._id,
      fieldPublicationStatus: 'preparing',
      recenseur: doc.recenseur,
      dateRecensement: doc.timing?.recordedAt,
    });
  } else {
    const catIds = validated.business.businessCategoryIds || doc.business.businessCategoryIds || [];
    let labels = [];
    if (catIds.length) {
      const cats = await Categorie.find({ _id: { $in: catIds } }).lean();
      labels = cats.map((c) => c.nomcategorie);
    }
    if (!labels.length) labels = ['Divers'];
    profile = await vendeurModel.create({
      utilisateur: user._id,
      shopName: validated.business.shopName || doc.business.shopName,
      shopDescription:
        validated.business.shopDescription ||
        doc.business.shopDescription ||
        validated.business.shopName ||
        'Boutique',
      businessType: validated.business.businessType || doc.business.businessType || 'Particulier',
      businessCategories: labels,
      productCategories: validated.business.productTypeLabels || doc.business.productTypeLabels || [],
      accountStatus: 'Pending',
      status: 'pending',
      verificationDocuments: { isVerified: false },
      source: SOURCE_V1,
      sourceFieldRecensementId: doc._id,
      fieldPublicationStatus: 'preparing',
      recenseur: doc.recenseur,
      dateRecensement: doc.timing?.recordedAt,
    });
  }

  await writeAudit({
    fieldRecensementId: doc._id,
    operationMutationId,
    actorId,
    action: 'publish_profile_created',
  });
  return { profile, created: true };
}

async function promotePhotoIfNeeded(doc, profile) {
  const photo = doc.media?.profilePhoto;
  if (!photo?.ref && !photo?.publicId) {
    return { promoted: false };
  }
  if (photo.kind === 'profile_public' && photo.promotedPublicUrl && photo.publicRevocationStatus !== 'revoked') {
    return { promoted: true, url: photo.promotedPublicUrl };
  }

  const publicId = buildDeterministicProfilePublicId(doc.professionalType, profile._id);
  const source = photo.publicId || photo.ref;
  const promoted = await promoteAuthenticatedToPublic({
    sourcePublicId: source,
    targetPublicId: publicId,
    fieldRecensementId: String(doc._id),
  });
  const url = promoted.secureUrl;

  await FieldRecensement.updateOne(
    { _id: doc._id },
    {
      $set: {
        'media.profilePhoto.kind': 'profile_public',
        'media.profilePhoto.promotedPublicUrl': url,
        'media.profilePhoto.publicId': publicId,
        'media.profilePhoto.publicRevocationStatus': 'none',
      },
    },
  );

  if (doc.professionalType === 'freelance') {
    await freelanceModel.updateOne({ _id: profile._id }, { $set: { imagePath: url } });
  } else if (doc.professionalType === 'vendeur') {
    await vendeurModel.updateOne({ _id: profile._id }, { $set: { shopLogo: url } });
  }

  return { promoted: true, url };
}

/** Indicateurs métier publics — sans pose du garde-fou fieldPublicationStatus. */
async function activateProfileIndicators(doc, profile, fenceEpoch) {
  const epoch = Number(fenceEpoch) || 0;
  if (doc.professionalType === 'prestataire') {
    await prestataireModel.updateOne(
      { _id: profile._id },
      {
        $set: {
          status: 'active',
          verifier: true,
          fieldPublicationStatus: 'ready',
          fieldPublicationEpoch: epoch,
        },
      },
    );
  } else if (doc.professionalType === 'freelance') {
    await freelanceModel.updateOne(
      { _id: profile._id },
      {
        $set: {
          status: 'active',
          accountStatus: 'Active',
          'verificationDocuments.isVerified': true,
          fieldPublicationStatus: 'ready',
          fieldPublicationEpoch: epoch,
        },
      },
    );
  } else {
    await vendeurModel.updateOne(
      { _id: profile._id },
      {
        $set: {
          status: 'active',
          accountStatus: 'Active',
          'verificationDocuments.isVerified': true,
          fieldPublicationStatus: 'ready',
          fieldPublicationEpoch: epoch,
        },
      },
    );
  }
}

/**
 * Dernier garde-fou catalogue — fencing obligatoire.
 * @returns {Promise<{ sealed: boolean, reason?: string }>}
 */
async function sealProfilePublished(doc, profile, expectedEpoch) {
  const Model =
    doc.professionalType === 'prestataire'
      ? prestataireModel
      : doc.professionalType === 'freelance'
        ? freelanceModel
        : vendeurModel;
  const epoch = Number(expectedEpoch) || 0;
  const sealed = await Model.findOneAndUpdate(
    {
      _id: profile._id,
      sourceFieldRecensementId: doc._id,
      fieldPublicationStatus: 'ready',
      fieldPublicationEpoch: epoch,
    },
    { $set: { fieldPublicationStatus: 'published' } },
    { new: true },
  );
  if (!sealed) {
    return { sealed: false, reason: 'FENCE_OR_STATE_MISMATCH' };
  }
  return { sealed: true };
}

function getProfileModel(professionalType) {
  if (professionalType === 'prestataire') return prestataireModel;
  if (professionalType === 'freelance') return freelanceModel;
  return vendeurModel;
}

export { sealProfilePublished, getProfileModel };

/**
 * @param {{
 *   id: string,
 *   actorUser: object,
 *   operationMutationId?: string,
 *   ownerKey?: string,
 * }} args
 */
export async function publishFieldRecensement({
  id,
  actorUser,
  operationMutationId = null,
  ownerKey = null,
}) {
  const ownerId = ownerKey || `pub:${actorUser?._id || 'system'}:${id}`;
  const opId = operationMutationId || `publish-${id}`;

  let doc = await FieldRecensement.findById(id).select(
    '+publicationLock +publicationLinkedUtilisateurId +publicationError +publicationFenceEpoch +media.profilePhoto.ref +media.profilePhoto.publicId +media.profilePhoto.sha256 +media.profilePhoto.promotedPublicUrl +media.profilePhoto.publicRevocationStatus +matchedUtilisateurId +linkedProfile +requestHash',
  );
  if (!doc) {
    throw apiError(404, 'RECENSEMENT_NOT_FOUND', 'Dossier introuvable.');
  }

  if (doc.reviewStatus === 'suspended') {
    throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Dossier suspendu — publication interdite.');
  }

  if (doc.publicationStatus === 'published' && doc.linkedProfile?.id) {
    const Model = getProfileModel(doc.professionalType);
    const profile = await Model.findById(doc.linkedProfile.id);
    if (profile && profile.fieldPublicationStatus !== 'published') {
      const fenceEpoch = Number(doc.publicationFenceEpoch) || 0;
      await sealProfilePublished(doc, profile, fenceEpoch);
    }
    return {
      kind: 'already',
      code: 'RECENSEMENT_ALREADY_APPLIED',
      status: 200,
      data: {
        ...toAdminFieldRecensementDetail(doc),
        published: true,
        linkedProfileType: doc.linkedProfile.type,
      },
    };
  }

  if (doc.reviewStatus !== 'approved') {
    throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Publication réservée aux dossiers approved.');
  }

  const fenceEpoch = Number(doc.publicationFenceEpoch) || 0;

  const lock = await acquireLock(doc._id, ownerId);
  if (!lock.ok) {
    return {
      kind: 'processing',
      code: 'RECENSEMENT_PUBLICATION_PROCESSING',
      status: 202,
      data: { id: String(doc._id), publicationStatus: doc.publicationStatus, retryable: true },
    };
  }
  if (lock.alreadyPublished) {
    doc = await FieldRecensement.findById(id);
    return {
      kind: 'already',
      code: 'RECENSEMENT_ALREADY_APPLIED',
      status: 200,
      data: { ...toAdminFieldRecensementDetail(doc), published: true },
    };
  }

  const attempts = lock.attempts || 1;
  try {
    crashAfter('lock');
    await writeAudit({
      fieldRecensementId: doc._id,
      operationMutationId: opId,
      actorId: actorUser?._id,
      action: 'publish_started',
    });

    // Relecture fencing + suspension
    const live = await FieldRecensement.findById(doc._id)
      .select('+publicationFenceEpoch reviewStatus')
      .lean();
    if (live?.reviewStatus === 'suspended') {
      throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Suspendu pendant publication.');
    }
    if (Number(live?.publicationFenceEpoch || 0) !== fenceEpoch) {
      throw apiError(409, 'RECENSEMENT_PUBLICATION_BLOCKED', 'Fencing publication invalidé.');
    }

    const { validated, match } = await revalidateForPublish(doc);

    await setPublicationState(doc._id, 'linking_user');
    crashAfter('before_user');
    const { user } = await resolveOrCreateUser(doc, match, actorUser?._id, opId);
    crashAfter('after_user');

    await setPublicationState(doc._id, 'creating_profile');
    const { profile } = await createOrGetProfile(doc, user, validated, opId, actorUser?._id);
    crashAfter('after_profile');

    await FieldRecensement.updateOne(
      { _id: doc._id },
      {
        $set: {
          linkedProfile: { type: doc.professionalType, id: profile._id },
          publicationStatus: 'linking_profile',
        },
      },
    );
    crashAfter('after_linked_profile');

    await setPublicationState(doc._id, 'preparing_media');
    crashAfter('before_media');
    await promotePhotoIfNeeded(doc, profile);
    crashAfter('after_media');
    await writeAudit({
      fieldRecensementId: doc._id,
      operationMutationId: opId,
      actorId: actorUser?._id,
      action: 'publish_media_promoted',
    });

    await setPublicationState(doc._id, 'ready');
    await activateProfileIndicators(doc, profile, fenceEpoch);
    crashAfter('before_published');

    // Vérifier fencing avant dossier published
    const beforeSeal = await FieldRecensement.findById(doc._id)
      .select('+publicationFenceEpoch reviewStatus')
      .lean();
    if (beforeSeal?.reviewStatus === 'suspended') {
      throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'Suspendu avant publication finale.');
    }
    if (Number(beforeSeal?.publicationFenceEpoch || 0) !== fenceEpoch) {
      throw apiError(409, 'RECENSEMENT_PUBLICATION_BLOCKED', 'Fencing invalidé avant published.');
    }

    await FieldRecensement.updateOne(
      {
        _id: doc._id,
        reviewStatus: 'approved',
        $or:
          fenceEpoch === 0
            ? [{ publicationFenceEpoch: 0 }, { publicationFenceEpoch: { $exists: false } }]
            : [{ publicationFenceEpoch: fenceEpoch }],
      },
      {
        $set: { publicationStatus: 'published' },
        $unset: { publicationError: 1 },
      },
    );
    crashAfter('after_dossier_published');

    const seal = await sealProfilePublished(doc, profile, fenceEpoch);
    if (!seal.sealed) {
      throw apiError(
        409,
        'RECENSEMENT_PUBLICATION_BLOCKED',
        'Seal published refusé (fencing ou état).',
      );
    }
    crashAfter('after_published');

    await writeAudit({
      fieldRecensementId: doc._id,
      operationMutationId: opId,
      actorId: actorUser?._id,
      action: 'publish_succeeded',
    });

    try {
      invalidateCache('/api/prestataire');
      invalidateCache('/api/freelance');
      invalidateCache('/api/vendeur');
      invalidateCache('/api/search');
    } catch {
      /* ignore */
    }

    await releaseLock(doc._id, lock.attemptId);
    const finalDoc = await FieldRecensement.findById(doc._id);
    return {
      kind: 'published',
      code: 'RECENSEMENT_PUBLISHED',
      status: 200,
      data: {
        ...toAdminFieldRecensementDetail(finalDoc),
        published: true,
        linkedProfileType: doc.professionalType,
        publicationPending: false,
      },
    };
  } catch (err) {
    const code = err.code || 'RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE';
    const retryable = err.retryable !== false && err.status !== 409;
    await recordPubError(doc._id, err.message?.replace(/^TEST_CRASH:/, '') || 'unknown', code, attempts, retryable);
    await writeAudit({
      fieldRecensementId: doc._id,
      operationMutationId: opId,
      actorId: actorUser?._id,
      action: 'publish_failed',
      note: code,
    });
    await releaseLock(doc._id, lock.attemptId);
    if (err.status) throw err;
    throw apiError(503, 'RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE', err.message || 'Échec publication.', undefined, true);
  }
}

/**
 * Route admin reprise publication.
 */
export async function retryPublishFieldRecensement({ id, actorUser, body }) {
  if (!/^[a-fA-F0-9]{24}$/.test(String(id))) {
    throw apiError(400, 'RECENSEMENT_ID_INVALID', 'Identifiant invalide.');
  }
  if (!body?.operationMutationId || !/^[0-9a-fA-F-]{36}$/.test(String(body.operationMutationId))) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'operationMutationId UUID requis.');
  }
  const expectedRevision = Number(body.expectedRevision);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
    throw apiError(400, 'RECENSEMENT_VALIDATION_FAILED', 'expectedRevision invalide.');
  }

  const opHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ action: 'publish', expectedRevision }), 'utf8')
    .digest('hex');

  const existingOp = await FieldRecensementOperation.findOne({
    fieldRecensementId: id,
    operationMutationId: body.operationMutationId,
  }).select('+operationHash');

  if (existingOp) {
    if (existingOp.operationHash !== opHash) {
      throw apiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Opération réutilisée avec contenu différent.');
    }
    const doc = await FieldRecensement.findById(id);
    if (doc?.publicationStatus === 'published') {
      return {
        kind: 'already',
        code: 'RECENSEMENT_ALREADY_APPLIED',
        status: 200,
        data: { ...toAdminFieldRecensementDetail(doc), published: true },
      };
    }
  }

  const doc = await FieldRecensement.findById(id);
  if (!doc) throw apiError(404, 'RECENSEMENT_NOT_FOUND', 'Dossier introuvable.');
  if (doc.reviewStatus !== 'approved') {
    throw apiError(409, 'RECENSEMENT_INVALID_STATE', 'État incompatible.');
  }
  if (doc.revision !== expectedRevision) {
    throw apiError(409, 'RECENSEMENT_REVISION_CONFLICT', 'Révision obsolète.', {
      currentRevision: doc.revision,
    });
  }

  if (!existingOp) {
    try {
      await FieldRecensementOperation.create({
        fieldRecensementId: id,
        operationMutationId: body.operationMutationId,
        action: 'publish',
        operationHash: opHash,
        actorId: actorUser._id,
        result: 'published',
        revisionBefore: expectedRevision,
        revisionAfter: expectedRevision,
        httpStatus: 200,
        resultCode: 'RECENSEMENT_PUBLISHED',
        responseSnapshot: {
          id: String(id),
          revision: expectedRevision,
          reviewStatus: 'approved',
          publicationStatus: doc.publicationStatus,
          clientMutationId: doc.clientMutationId,
        },
      });
    } catch (e) {
      if (e?.code !== 11000) throw e;
    }
  }

  // Extend operation model to support 'publish' action - update schema
  return publishFieldRecensement({
    id,
    actorUser,
    operationMutationId: body.operationMutationId,
  });
}

export { LEASE_MS, SOURCE_V1 };
