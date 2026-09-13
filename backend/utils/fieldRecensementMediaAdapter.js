/**
 * R1-09 / R1-08B — Adaptateur Cloudinary FieldRecensement.
 * Promotion authenticated → public déterministe ; révocation dérivé public.
 * Jamais d’URL fictive en production. Mock uniquement si NODE_ENV=test | TEST_CLOUDINARY_MOCK=1.
 */
import { v2 as cloudinary } from 'cloudinary';
import { CLD_AUTH_PREFIX } from './kycAccess.js';
import {
  buildFieldPublicPromoteOptions,
  classifyFieldMediaAsset,
  FIELD_MEDIA_CLASS,
} from './fieldRecensementMediaClassification.js';

export { classifyFieldMediaAsset, FIELD_MEDIA_CLASS };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isMockMode() {
  return process.env.NODE_ENV === 'test' || process.env.TEST_CLOUDINARY_MOCK === '1';
}

export function stripAuthPrefix(refOrId) {
  const s = String(refOrId || '');
  if (s.startsWith(CLD_AUTH_PREFIX)) return s.slice(CLD_AUTH_PREFIX.length);
  return s;
}

export function buildDeterministicProfilePublicId(professionalType, profileId) {
  return `profiles/${professionalType}/${profileId}/main`;
}

/**
 * Options transmises au SDK pour la promotion (contrat testable).
 */
export function buildPromoteUploadOptions(targetPublicId, meta = {}) {
  return buildFieldPublicPromoteOptions(targetPublicId, meta);
}

export function buildRevokeDestroyOptions() {
  return {
    type: 'upload',
    resource_type: 'image',
    invalidate: true,
  };
}

/**
 * @param {{
 *   sourcePublicId: string,
 *   targetPublicId: string,
 *   uploader?: { upload: Function, destroy?: Function },
 *   urlBuilder?: Function,
 * }} args
 */
export async function promoteAuthenticatedToPublic({
  sourcePublicId,
  targetPublicId,
  fieldRecensementId,
  uploader = cloudinary.uploader,
  urlBuilder = cloudinary.url.bind(cloudinary),
}) {
  const source = stripAuthPrefix(sourcePublicId);
  const target = String(targetPublicId || '').trim();
  if (!source || !target) {
    const err = new Error('Source ou cible média manquante');
    err.code = 'RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE';
    err.status = 503;
    err.retryable = true;
    throw err;
  }

  if (isMockMode()) {
    if (process.env.TEST_CLOUDINARY_FAIL === '1') {
      const err = new Error('Échec promotion média (mock)');
      err.code = 'RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE';
      err.status = 503;
      err.retryable = true;
      throw err;
    }
    return {
      publicId: target,
      secureUrl: `https://res.cloudinary.com/test/image/upload/${target}`,
      mocked: true,
    };
  }

  const signedSourceUrl = urlBuilder(source, {
    type: 'authenticated',
    resource_type: 'image',
    sign_url: true,
    secure: true,
  });
  if (!signedSourceUrl || typeof signedSourceUrl !== 'string') {
    const err = new Error('Impossible de signer la source authentifiée');
    err.code = 'RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE';
    err.status = 503;
    err.retryable = true;
    throw err;
  }

  const opts = buildPromoteUploadOptions(target, {
    fieldRecensementId,
    mediaKind: 'profile_public',
  });
  const result = await uploader.upload(signedSourceUrl, opts);
  if (!result?.secure_url || !result?.public_id) {
    const err = new Error('Réponse Cloudinary de promotion invalide');
    err.code = 'RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE';
    err.status = 503;
    err.retryable = true;
    throw err;
  }
  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    mocked: false,
  };
}

/**
 * Supprime uniquement le dérivé public (type upload). Ne touche pas à l’authenticated.
 */
export async function revokePublicDerivative({
  publicId,
  destroyer = cloudinary.uploader.destroy.bind(cloudinary.uploader),
}) {
  const id = String(publicId || '').trim();
  if (!id || id.startsWith(CLD_AUTH_PREFIX)) {
    return { revoked: false, skipped: true };
  }

  if (isMockMode()) {
    if (process.env.TEST_CLOUDINARY_REVOKE_FAIL === '1') {
      const err = new Error('Échec révocation média (mock)');
      err.code = 'RECENSEMENT_SUSPENSION_TEMPORARY_FAILURE';
      err.status = 503;
      err.retryable = true;
      throw err;
    }
    return { revoked: true, mocked: true, publicId: id };
  }

  const opts = buildRevokeDestroyOptions();
  const result = await destroyer(id, opts);
  const ok = result?.result === 'ok' || result?.result === 'not found';
  if (!ok) {
    const err = new Error('Révocation Cloudinary incomplète');
    err.code = 'RECENSEMENT_SUSPENSION_TEMPORARY_FAILURE';
    err.status = 503;
    err.retryable = true;
    throw err;
  }
  return { revoked: true, mocked: false, publicId: id, result: result.result };
}

export default {
  promoteAuthenticatedToPublic,
  revokePublicDerivative,
  buildDeterministicProfilePublicId,
  buildPromoteUploadOptions,
  buildRevokeDestroyOptions,
  classifyFieldMediaAsset,
  FIELD_MEDIA_CLASS,
};
