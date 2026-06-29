import { isAdmin } from "../middleware/entityAccess.js";

/** Filtre catalogue public pour freelance / vendeur (aligné prestataire). */
export function applyProPublicFilter(req, filter = {}) {
  const adminUser = isAdmin(req);
  const utilisateur = req.query.utilisateur;
  const isOwnProfile =
    utilisateur &&
    req.utilisateur &&
    String(utilisateur) === String(req.utilisateur._id);

  if (adminUser) {
    if (req.query.status) filter.status = req.query.status;
    if (utilisateur) filter.utilisateur = utilisateur;
    return filter;
  }

  if (isOwnProfile) {
    if (req.query.status) filter.status = req.query.status;
    filter.utilisateur = utilisateur;
    return filter;
  }

  filter.status = "active";
  filter.accountStatus = "Active";
  filter["verificationDocuments.isVerified"] = true;
  return filter;
}

export function isProPubliclyVisible(doc) {
  return (
    doc?.status === "active" &&
    doc?.accountStatus === "Active" &&
    doc?.verificationDocuments?.isVerified === true
  );
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
