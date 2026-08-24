/**
 * STAB-11b — Accès documents d'identité (KYC).
 * Propriétaire / admin / agent recenseur du dossier — jamais « tout JWT ».
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

const VERIFICATION_DOC_KEYS = ['cni1', 'cni2', 'selfie', 'businessLicense', 'taxDocument'];

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

/**
 * @param {object} opts
 * @param {object} opts.req
 * @param {string|null} opts.ownerUserId
 * @param {string|null} [opts.recenseurId]
 */
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
    if (o[f] !== undefined) o[f] = Boolean(o[f]); // présence sans URL
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
 * Upload Cloudinary en type authenticated (pas de lecture publique par URL).
 * Stocke une référence `cld:auth:<public_id>` plutôt qu'une URL ouverte.
 */
export async function uploadKycToCloudinary(filePath, folder) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    type: 'authenticated',
    resource_type: 'image',
  });
  return {
    ref: `${CLD_AUTH_PREFIX}${result.public_id}`,
    publicId: result.public_id,
  };
}

/**
 * Génère une URL signée courte durée pour un ref cld:auth: ou un public_id.
 */
export function signKycCloudinaryRef(refOrPublicId, { expiresInSec = 300 } = {}) {
  let publicId = String(refOrPublicId || '');
  if (publicId.startsWith(CLD_AUTH_PREFIX)) {
    publicId = publicId.slice(CLD_AUTH_PREFIX.length);
  } else if (publicId.startsWith('http')) {
    // Ancienne URL publique Cloudinary — ne pas re-signer en ouvert ;
    // on refuse de la « légitimer » : le client doit passer par redaction.
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

/**
 * Pour une réponse autorisée : remplace refs auth par URLs signées ;
 * pour anciennes URLs http publiques, les laisse uniquement si authorized
 * (appelant doit déjà avoir vérifié canAccessKyc) — mais on préfère
 * ne pas les renvoyer au catalogue public (redact).
 */
export function resolveKycFieldsForAuthorizedViewer(plain) {
  if (!plain) return plain;
  const o = { ...plain };
  for (const f of KYC_FIELD_NAMES) {
    if (typeof o[f] === 'string' && o[f]) {
      if (isCloudinaryAuthRef(o[f])) {
        o[f] = signKycCloudinaryRef(o[f]) || null;
      }
      // anciennes URLs publiques : renvoyées seulement au viewer autorisé
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
