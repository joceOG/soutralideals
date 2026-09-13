/**
 * STAB-11b / R0-06 — Accès documents d'identité (KYC).
 * Propriétaire / admin / agent recenseur du dossier — jamais « tout JWT ».
 * CREATE et UPDATE doivent passer par uploadKycToCloudinary uniquement.
 */
import { v2 as cloudinary } from 'cloudinary';
import { isAdmin as isAdminReq } from './accessControl.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const KYC_FIELD_NAMES = [
  'cni1',
  'cni2',
  'selfie',
  'attestationAssurance',
];

/** Champs sous verificationDocuments (freelance / vendeur). */
export const VERIFICATION_DOC_KEYS = [
  'cni1',
  'cni2',
  'selfie',
  'businessLicense',
  'taxDocument',
];

/** Préfixe stocké pour assets Cloudinary authentifiés (non publics). */
export const CLD_AUTH_PREFIX = 'cld:auth:';

export function isSensitiveUploadPath(urlPath) {
  const p = String(urlPath || '').toLowerCase();
  return (
    p.includes('/cni') ||
    p.includes('cni') ||
    p.includes('selfie') ||
    p.includes('/verification') ||
    p.includes('kyc') ||
    p.includes('attestation') ||
    p.includes('/prestataires/documents') ||
    p.includes('/freelances/verification') ||
    p.includes('/vendeurs/verification')
  );
}

export function canAccessKyc({ req, ownerUserId, recenseurId = null }) {
  if (!req?.utilisateur) return false;
  if (isAdminReq(req)) return true;
  const uid = req.utilisateur._id?.toString();
  if (ownerUserId && uid === String(ownerUserId)) return true;
  if (recenseurId && uid === String(recenseurId)) return true;
  return false;
}

export function redactKycFromPlain(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const o = { ...obj };
  for (const f of KYC_FIELD_NAMES) {
    if (o[f] !== undefined) o[f] = Boolean(o[f]);
  }
  if (o.verificationDocuments && typeof o.verificationDocuments === 'object') {
    const vd = { ...o.verificationDocuments };
    for (const k of VERIFICATION_DOC_KEYS) {
      if (vd[k] !== undefined) vd[k] = Boolean(vd[k]);
    }
    o.verificationDocuments = vd;
  }
  if (Array.isArray(o.diplomeCertificat)) {
    o.diplomeCertificat = o.diplomeCertificat.map(() => true);
  }
  return o;
}

export function redactKycDocument(doc) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  return redactKycFromPlain(plain);
}

/**
 * Upload Cloudinary en type authenticated.
 * Retourne ref opaque cld:auth: — jamais secure_url publique ni URL signée.
 */
export async function uploadKycToCloudinary(filePath, folder, options = {}) {
  const {
    publicId,
    overwrite = false,
    tags,
    context,
  } = options;
  const uploadOpts = {
    type: 'authenticated',
    resource_type: 'image',
    overwrite,
  };
  if (publicId) {
    uploadOpts.public_id = publicId;
  } else if (folder) {
    uploadOpts.folder = folder;
  }
  // Tags/context uniquement si fournis (Field V1) — KYC legacy inchangé
  if (Array.isArray(tags) && tags.length) uploadOpts.tags = tags;
  if (typeof context === 'string' && context.trim()) uploadOpts.context = context;
  const result = await cloudinary.uploader.upload(filePath, uploadOpts);
  return {
    ref: `${CLD_AUTH_PREFIX}${result.public_id}`,
    publicId: result.public_id,
  };
}

/**
 * Remplacement KYC sans perte : upload d’abord.
 * Suppression ancienne ref différée (pas avant succès Mongo).
 */
export async function prepareKycReplacement(filePath, folder, previousRef = null) {
  const { ref } = await uploadKycToCloudinary(filePath, folder);
  return {
    ref,
    previousRef: typeof previousRef === 'string' ? previousRef : null,
    destroyDeferred: true,
  };
}

export function isInjectedKycValue(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return true;
  if (v.startsWith(CLD_AUTH_PREFIX)) return true;
  if (v.includes('res.cloudinary.com')) return true;
  return false;
}

/** Retire du body les affectations KYC (seul multipart autorisé). */
export function stripInjectedKycFromBody(body = {}) {
  if (!body || typeof body !== 'object') return {};
  const cleaned = { ...body };
  for (const f of KYC_FIELD_NAMES) {
    if (cleaned[f] !== undefined) delete cleaned[f];
  }
  for (const k of VERIFICATION_DOC_KEYS) {
    const dotted = `verificationDocuments.${k}`;
    if (cleaned[dotted] !== undefined) delete cleaned[dotted];
  }
  if (cleaned.verificationDocuments && typeof cleaned.verificationDocuments === 'object') {
    const vd = { ...cleaned.verificationDocuments };
    for (const k of VERIFICATION_DOC_KEYS) {
      if (vd[k] !== undefined) delete vd[k];
    }
    cleaned.verificationDocuments = vd;
  }
  return cleaned;
}

export function signKycCloudinaryRef(refOrPublicId, { expiresInSec = 300 } = {}) {
  let publicId = String(refOrPublicId || '');
  if (publicId.startsWith(CLD_AUTH_PREFIX)) {
    publicId = publicId.slice(CLD_AUTH_PREFIX.length);
  } else if (publicId.startsWith('http')) {
    return null;
  }
  if (!publicId) return null;

  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSec;
  return cloudinary.url(publicId, {
    type: 'authenticated',
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
  });
}

export function isCloudinaryAuthRef(value) {
  return typeof value === 'string' && value.startsWith(CLD_AUTH_PREFIX);
}

/** Classifie une valeur stockée pour inventaire dry-run (sans exposer le contenu). */
export function classifyKycStoredValue(value) {
  if (value == null || value === '') return 'missing';
  if (typeof value !== 'string') return 'malformed';
  if (isCloudinaryAuthRef(value)) return 'authenticated_ref';
  if (/^https?:\/\//i.test(value)) return 'legacy_http_url';
  return 'malformed';
}

export function resolveKycFieldsForAuthorizedViewer(plain) {
  if (!plain) return plain;
  const o = { ...plain };
  for (const f of KYC_FIELD_NAMES) {
    if (typeof o[f] === 'string' && o[f]) {
      if (isCloudinaryAuthRef(o[f])) {
        o[f] = signKycCloudinaryRef(o[f]) || null;
      }
    }
  }
  if (o.verificationDocuments && typeof o.verificationDocuments === 'object') {
    const vd = { ...o.verificationDocuments };
    for (const k of VERIFICATION_DOC_KEYS) {
      if (typeof vd[k] === 'string' && isCloudinaryAuthRef(vd[k])) {
        vd[k] = signKycCloudinaryRef(vd[k]) || null;
      }
    }
    o.verificationDocuments = vd;
  }
  return o;
}

/**
 * Présentation API : redaction pour le public, URLs signées temporaires si autorisé.
 * N’écrit jamais en base. Pose Cache-Control: no-store si KYC révélé.
 */
export function presentProDocForViewer(req, doc, res = null) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const ownerId = plain.utilisateur?._id ?? plain.utilisateur;
  const allowed = canAccessKyc({
    req,
    ownerUserId: ownerId,
    recenseurId: plain.recenseur,
  });
  if (allowed) {
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('Cache-Control', 'no-store');
    }
    return resolveKycFieldsForAuthorizedViewer(plain);
  }
  return redactKycFromPlain(plain);
}

/** Inventaire dry-run : compte les classes de refs sans exposer les valeurs. */
export function countKycRefClasses(values) {
  const counts = {
    authenticated_ref: 0,
    legacy_http_url: 0,
    missing: 0,
    malformed: 0,
  };
  for (const v of values) {
    const cls = classifyKycStoredValue(v);
    counts[cls] = (counts[cls] || 0) + 1;
  }
  return counts;
}
