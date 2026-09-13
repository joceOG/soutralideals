/**
 * R1-06 — DTOs sécurisés FieldRecensement (agent / admin lecture).
 * Défense en profondeur : ne pas compter uniquement sur toJSON / select:false.
 */

function photoDto(media) {
  const photo = media?.profilePhoto;
  if (!photo) {
    return { present: false, status: 'absent' };
  }
  const hasPrivate =
    photo.ref ||
    photo.publicId ||
    photo.kind === 'profile_pending_private' ||
    photo.status === 'uploaded' ||
    photo.present === true;
  // Après projection sans ref : présence via kind/status ou flag explicite
  const present = Boolean(
    hasPrivate || photo.kind === 'profile_public' || photo.status,
  );
  if (!present && photo.kind == null && photo.status == null) {
    return { present: false, status: 'absent' };
  }
  return {
    present: true,
    status: photo.kind === 'profile_public' ? 'public' : 'private_pending',
  };
}

function correctionDto(correction) {
  if (!correction || (!correction.reasonCode && !correction.message)) {
    return undefined;
  }
  const out = {};
  if (correction.reasonCode) out.reasonCode = correction.reasonCode;
  if (correction.message) out.message = correction.message;
  if (Array.isArray(correction.fields)) out.fields = [...correction.fields];
  if (correction.requestedAt) {
    out.requestedAt = new Date(correction.requestedAt).toISOString();
  }
  // Jamais requestedBy / notes internes admin
  return out;
}

function displayLabelFromDoc(doc) {
  const b = doc.business || {};
  if (b.shopName) return b.shopName;
  if (b.displayName) return b.displayName;
  if (b.jobTitle) return b.jobTitle;
  const p = doc.person || {};
  const name = [p.prenoms, p.nom].filter(Boolean).join(' ').trim();
  return name || null;
}

function personSummary(person) {
  if (!person) return undefined;
  return {
    nom: person.nom,
    prenoms: person.prenoms,
    telephone: person.telephone,
  };
}

function personDetail(person) {
  if (!person) return undefined;
  return {
    nom: person.nom,
    prenoms: person.prenoms,
    telephone: person.telephone,
    whatsapp: person.whatsapp ?? null,
    email: person.email ?? null,
  };
}

function businessDetail(business) {
  if (!business || typeof business !== 'object') return {};
  const out = { ...business };
  // Ne jamais exposer d'identifiants dérivés sensibles supplémentaires
  delete out.password;
  return out;
}

function locationDetail(location) {
  if (!location) return undefined;
  return {
    adresse: location.adresse,
    commune: location.commune,
    quartier: location.quartier,
    zonesIntervention: location.zonesIntervention,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracyMeters: location.accuracyMeters,
  };
}

function consentDetail(consent) {
  if (!consent) return undefined;
  return {
    recensementAccepted: consent.recensementAccepted,
    acceptedAt: consent.acceptedAt
      ? new Date(consent.acceptedAt).toISOString()
      : undefined,
    textVersion: consent.textVersion,
    method: consent.method,
    language: consent.language,
    // confirmedByAgent = id utilisateur → masqué
  };
}

function appDetail(app) {
  if (!app) return undefined;
  return {
    version: app.version,
    buildNumber: app.buildNumber,
    // installationId non sensible mais peu utile en détail agent — conservé pour sync
    installationId: app.installationId,
  };
}

function timingDetail(timing) {
  if (!timing) return undefined;
  return {
    recordedAt: timing.recordedAt
      ? new Date(timing.recordedAt).toISOString()
      : undefined,
    serverReceivedAt: timing.serverReceivedAt
      ? new Date(timing.serverReceivedAt).toISOString()
      : undefined,
    deviceTimezone: timing.deviceTimezone,
  };
}

function metadataDetail(metadata) {
  if (!metadata) return undefined;
  return { notes: metadata.notes ?? null };
}

/** Masque téléphone pour listes admin (dernier 4 chiffres). */
export function maskTelephoneForAdminList(telephone) {
  if (telephone == null || telephone === '') return null;
  const digits = String(telephone).replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `••••${digits.slice(-4)}`;
}

function hasCorrectionFlag(correction) {
  return Boolean(
    correction &&
      (correction.reasonCode ||
        correction.message ||
        (Array.isArray(correction.fields) && correction.fields.length)),
  );
}

/**
 * Ligne légère file admin (R3-01) — pas de téléphone complet, pas de KYC.
 * @param {object} doc
 */
export function toAdminFieldRecensementQueueItem(doc) {
  const photo = photoDto(doc.media);
  const publicationFailed = doc.publicationStatus === 'failed';
  return {
    id: String(doc._id),
    professionalType: doc.professionalType,
    reviewStatus: doc.reviewStatus,
    publicationStatus: doc.publicationStatus,
    revision: doc.revision,
    displayLabel: displayLabelFromDoc(doc),
    telephoneMasked: maskTelephoneForAdminList(doc.person?.telephone),
    personLabel: [doc.person?.prenoms, doc.person?.nom].filter(Boolean).join(' ').trim() || null,
    commune: doc.location?.commune ?? null,
    quartier: doc.location?.quartier ?? null,
    hasPhoto: Boolean(photo.present),
    hasCorrection: hasCorrectionFlag(doc.correction),
    publicationFailed,
    recenseur: doc.recenseur ? { id: String(doc.recenseur) } : undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

/**
 * Résumé liste agent (/mine).
 * @param {object} doc lean ou document
 */
export function toAgentFieldRecensementSummary(doc) {
  const correction = correctionDto(doc.correction);
  return {
    id: String(doc._id),
    clientMutationId: doc.clientMutationId,
    professionalType: doc.professionalType,
    reviewStatus: doc.reviewStatus,
    publicationStatus: doc.publicationStatus,
    ingestionStatus: doc.ingestionStatus,
    revision: doc.revision,
    displayLabel: displayLabelFromDoc(doc),
    person: personSummary(doc.person),
    commune: doc.location?.commune ?? null,
    quartier: doc.location?.quartier ?? null,
    profilePhoto: photoDto(doc.media),
    ...(correction ? { correction } : {}),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

/**
 * Détail agent propriétaire.
 * @param {object} doc
 */
export function toAgentFieldRecensementDetail(doc) {
  const correction = correctionDto(doc.correction);
  return {
    id: String(doc._id),
    clientMutationId: doc.clientMutationId,
    professionalType: doc.professionalType,
    reviewStatus: doc.reviewStatus,
    publicationStatus: doc.publicationStatus,
    ingestionStatus: doc.ingestionStatus,
    revision: doc.revision,
    schemaVersion: doc.schemaVersion,
    person: personDetail(doc.person),
    business: businessDetail(doc.business),
    location: locationDetail(doc.location),
    consent: consentDetail(doc.consent),
    app: appDetail(doc.app),
    timing: timingDetail(doc.timing),
    metadata: metadataDetail(doc.metadata),
    profilePhoto: photoDto(doc.media),
    ...(correction ? { correction } : {}),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
  };
}

/**
 * Détail admin — sans KYC / refs privées (parcours KYC distinct).
 * @param {object} doc
 */
export function toAdminFieldRecensementDetail(doc) {
  return {
    ...toAgentFieldRecensementDetail(doc),
    recenseurId: doc.recenseur ? String(doc.recenseur) : undefined,
    // Photo privée : présence uniquement (R3-01 — pas d’URL)
    profilePhoto: photoDto(doc.media),
  };
}

/** Projection Mongo pour liste /mine (pas de secrets). */
export const MINE_LIST_PROJECTION = {
  clientMutationId: 1,
  professionalType: 1,
  reviewStatus: 1,
  publicationStatus: 1,
  ingestionStatus: 1,
  revision: 1,
  'person.nom': 1,
  'person.prenoms': 1,
  'person.telephone': 1,
  'business.shopName': 1,
  'business.displayName': 1,
  'business.jobTitle': 1,
  'location.commune': 1,
  'location.quartier': 1,
  'media.profilePhoto.kind': 1,
  'media.profilePhoto.status': 1,
  'correction.reasonCode': 1,
  'correction.message': 1,
  'correction.fields': 1,
  'correction.requestedAt': 1,
  createdAt: 1,
  updatedAt: 1,
};

/** Projection file admin — légère, sans KYC / hashes / refs. */
export const ADMIN_QUEUE_LIST_PROJECTION = {
  professionalType: 1,
  reviewStatus: 1,
  publicationStatus: 1,
  revision: 1,
  'person.nom': 1,
  'person.prenoms': 1,
  'person.telephone': 1,
  'business.shopName': 1,
  'business.displayName': 1,
  'business.jobTitle': 1,
  'location.commune': 1,
  'location.quartier': 1,
  'media.profilePhoto.kind': 1,
  'media.profilePhoto.status': 1,
  'correction.reasonCode': 1,
  'correction.message': 1,
  'correction.fields': 1,
  recenseur: 1,
  createdAt: 1,
  updatedAt: 1,
};

/** Projection détail — exclut explicitement les secrets. */
export const DETAIL_PROJECTION = {
  clientMutationId: 1,
  schemaVersion: 1,
  professionalType: 1,
  reviewStatus: 1,
  publicationStatus: 1,
  ingestionStatus: 1,
  revision: 1,
  person: 1,
  business: 1,
  location: 1,
  consent: 1,
  app: 1,
  timing: 1,
  metadata: 1,
  'media.profilePhoto.kind': 1,
  'media.profilePhoto.status': 1,
  'correction.reasonCode': 1,
  'correction.message': 1,
  'correction.fields': 1,
  'correction.requestedAt': 1,
  recenseur: 1,
  createdAt: 1,
  updatedAt: 1,
};

export default {
  toAgentFieldRecensementSummary,
  toAgentFieldRecensementDetail,
  toAdminFieldRecensementDetail,
  toAdminFieldRecensementQueueItem,
  maskTelephoneForAdminList,
  MINE_LIST_PROJECTION,
  DETAIL_PROJECTION,
  ADMIN_QUEUE_LIST_PROJECTION,
};
