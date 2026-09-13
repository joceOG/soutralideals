/**
 * R1-09 — Garde-fou catalogue public V1 + compat legacy.
 *
 * V1 (source=field_recensement_v1) : fieldPublicationStatus === 'published' obligatoire
 *   en plus des indicateurs métier historiques.
 * Legacy : politique inchangée (pas d’exigence fieldPublicationStatus).
 */
import { isAdmin } from '../middleware/entityAccess.js';

/** Critères Mongo catalogue public — freelance / vendeur (legacy + flags). */
export const FREELANCE_VENDEUR_PUBLIC_MATCH = Object.freeze({
  status: 'active',
  accountStatus: 'Active',
  'verificationDocuments.isVerified': true,
});

/** Critères Mongo catalogue public — prestataire. */
export const PRESTATAIRE_PUBLIC_MATCH = Object.freeze({
  status: 'active',
  verifier: true,
});

/**
 * Clause $or : legacy sans source V1 OU V1 published.
 * @param {object} baseMatch
 */
export function withFieldRecensementPublicationGuard(baseMatch) {
  return {
    $and: [
      baseMatch,
      {
        $or: [
          { source: { $ne: 'field_recensement_v1' } },
          { source: { $exists: false } },
          { source: null },
          {
            source: 'field_recensement_v1',
            fieldPublicationStatus: 'published',
          },
        ],
      },
    ],
  };
}

export function applyPrestatairePublicMatch(filter = {}) {
  const guarded = withFieldRecensementPublicationGuard({ ...PRESTATAIRE_PUBLIC_MATCH });
  return Object.assign(filter, guarded);
}

export function applyFreelanceVendeurPublicMatch(filter = {}) {
  const guarded = withFieldRecensementPublicationGuard({ ...FREELANCE_VENDEUR_PUBLIC_MATCH });
  return Object.assign(filter, guarded);
}

export function applyProPublicFilter(req, filter = {}) {
  const adminUser = isAdmin(req);
  const utilisateur = req.query?.utilisateur;
  const isOwnProfile =
    utilisateur &&
    req.utilisateur &&
    String(utilisateur) === String(req.utilisateur._id);

  if (adminUser) {
    if (req.query?.status) filter.status = req.query.status;
    if (utilisateur) filter.utilisateur = utilisateur;
    return filter;
  }

  if (isOwnProfile) {
    if (req.query?.status) filter.status = req.query.status;
    filter.utilisateur = utilisateur;
    return filter;
  }

  return applyFreelanceVendeurPublicMatch(filter);
}

export function applyPrestatairePublicFilter(req, filter = {}) {
  const adminUser = isAdmin(req);
  const utilisateur = req.query?.utilisateur;
  const isOwnProfile =
    utilisateur &&
    req.utilisateur &&
    String(utilisateur) === String(req.utilisateur._id);

  if (adminUser) {
    if (req.query?.status) filter.status = req.query.status;
    if (req.query?.verifier !== undefined) {
      filter.verifier = req.query.verifier === 'true' || req.query.verifier === true;
    }
    if (utilisateur) filter.utilisateur = utilisateur;
    return filter;
  }

  if (isOwnProfile) {
    if (req.query?.status) filter.status = req.query.status;
    filter.utilisateur = utilisateur;
    return filter;
  }

  return applyPrestatairePublicMatch(filter);
}

function isV1PublishedOrLegacy(doc) {
  if (doc?.source === 'field_recensement_v1') {
    return doc.fieldPublicationStatus === 'published';
  }
  return true;
}

export function isProPubliclyVisible(doc) {
  if (!isV1PublishedOrLegacy(doc)) return false;
  return (
    doc?.status === 'active' &&
    doc?.accountStatus === 'Active' &&
    doc?.verificationDocuments?.isVerified === true
  );
}

export function isPrestatairePubliclyVisible(doc) {
  if (!isV1PublishedOrLegacy(doc)) return false;
  return doc?.status === 'active' && doc?.verifier === true;
}

export function canAccessProProfile(req, doc) {
  if (!doc) return false;
  if (isProPubliclyVisible(doc)) return true;
  if (isAdmin(req)) return true;
  const ownerId = doc.utilisateur?._id ?? doc.utilisateur;
  if (
    req.utilisateur &&
    ownerId &&
    String(ownerId) === String(req.utilisateur._id)
  ) {
    return true;
  }
  return false;
}

export function canAccessPrestataireProfile(req, doc) {
  if (!doc) return false;
  if (isPrestatairePubliclyVisible(doc)) return true;
  if (isAdmin(req)) return true;
  const ownerId = doc.utilisateur?._id ?? doc.utilisateur;
  if (
    req.utilisateur &&
    ownerId &&
    String(ownerId) === String(req.utilisateur._id)
  ) {
    return true;
  }
  return false;
}

export async function findPublicVendeurIds(VendeurModel) {
  const rows = await VendeurModel.find(
    withFieldRecensementPublicationGuard({ ...FREELANCE_VENDEUR_PUBLIC_MATCH }),
  )
    .select('_id')
    .lean();
  return rows.map((r) => r._id);
}

export async function findPublicFreelanceIds(FreelanceModel) {
  const rows = await FreelanceModel.find(
    withFieldRecensementPublicationGuard({ ...FREELANCE_VENDEUR_PUBLIC_MATCH }),
  )
    .select('_id')
    .lean();
  return rows.map((r) => r._id);
}
