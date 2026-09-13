/**
 * R1-12 — Tags, contextes, classification médias Field Recensement V1.
 * Classification par défaut : unknown_protected (conservation).
 */
export const FIELD_MEDIA_TAGS = Object.freeze([
  'sdeals_field_recensement_v1',
  'sdeals_managed_media',
]);

export const FIELD_MEDIA_PRIVATE_PREFIX = 'field/';
export const FIELD_MEDIA_PUBLIC_PREFIX_RE =
  /^profiles\/(prestataire|freelance|vendeur)\/[a-fA-F0-9]{24}\/main$/;

export const FIELD_MEDIA_CLASS = Object.freeze({
  MANAGED_FIELD_PRIVATE: 'managed_field_private',
  MANAGED_FIELD_PUBLIC: 'managed_field_public',
  KYC_PROTECTED: 'kyc_protected',
  LEGACY_PROTECTED: 'legacy_protected',
  UNKNOWN_PROTECTED: 'unknown_protected',
});

const KYC_PREFIX_RE =
  /^(prestataires\/(cni|selfies|assurance|diplomes)|freelances\/verification|vendeurs\/verification|kyc\/)/i;

/**
 * @param {string|string[]|undefined} tags
 * @returns {Set<string>}
 */
export function normalizeTagSet(tags) {
  if (!tags) return new Set();
  if (tags instanceof Set) return new Set([...tags].map((t) => String(t).trim()).filter(Boolean));
  const arr = Array.isArray(tags) ? tags : String(tags).split(',');
  return new Set(arr.map((t) => String(t).trim()).filter(Boolean));
}

/**
 * @param {string|Record<string,string>|undefined} context
 * @returns {Record<string, string>}
 */
export function parseCloudinaryContext(context) {
  if (!context) return {};
  if (typeof context === 'object' && !Array.isArray(context)) {
    const out = {};
    for (const [k, v] of Object.entries(context)) {
      if (v != null) out[String(k)] = String(v);
    }
    return out;
  }
  const s = String(context);
  // Formats : "key=value|key2=value2" ou "custom.key=value|..."
  const out = {};
  for (const part of s.split('|')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    let key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key.startsWith('custom.')) key = key.slice(7);
    out[key] = val;
  }
  return out;
}

export function hasManagedFieldTags(tags) {
  const set = normalizeTagSet(tags);
  return FIELD_MEDIA_TAGS.every((t) => set.has(t));
}

export function isAllowedPrivatePublicId(publicId) {
  const id = String(publicId || '');
  return id.startsWith(FIELD_MEDIA_PRIVATE_PREFIX) && !id.includes('..') && id.length < 200;
}

export function isAllowedPublicDerivativeId(publicId) {
  return FIELD_MEDIA_PUBLIC_PREFIX_RE.test(String(publicId || ''));
}

/**
 * Construit options upload Cloudinary pour médias Field V1 (tags + context idempotents).
 * Pas de PII.
 */
export function buildFieldMediaCloudinaryOptions({
  publicId,
  overwrite = false,
  mediaKind,
  fieldRecensementId,
  uploadSessionId,
  schemaVersion = 1,
}) {
  const ctxParts = [
    `schemaVersion=${schemaVersion}`,
    `mediaKind=${mediaKind || 'profile_pending_private'}`,
  ];
  if (fieldRecensementId) ctxParts.push(`fieldRecensementId=${fieldRecensementId}`);
  if (uploadSessionId) ctxParts.push(`uploadSessionId=${uploadSessionId}`);

  return {
    public_id: publicId,
    type: 'authenticated',
    resource_type: 'image',
    overwrite: Boolean(overwrite),
    tags: [...FIELD_MEDIA_TAGS],
    context: ctxParts.join('|'),
  };
}

export function buildFieldPublicPromoteOptions(targetPublicId, {
  fieldRecensementId,
  mediaKind = 'profile_public',
  schemaVersion = 1,
} = {}) {
  const ctxParts = [`schemaVersion=${schemaVersion}`, `mediaKind=${mediaKind}`];
  if (fieldRecensementId) ctxParts.push(`fieldRecensementId=${fieldRecensementId}`);
  return {
    public_id: targetPublicId,
    type: 'upload',
    overwrite: true,
    invalidate: true,
    resource_type: 'image',
    tags: [...FIELD_MEDIA_TAGS],
    context: ctxParts.join('|'),
  };
}

/**
 * Classification fail-closed.
 * @param {{
 *   publicId: string,
 *   deliveryType?: string,
 *   resourceType?: string,
 *   tags?: string[]|string,
 *   context?: string|object,
 * }} asset
 */
export function classifyFieldMediaAsset(asset = {}) {
  const publicId = String(asset.publicId || '').trim();
  const deliveryType = String(asset.deliveryType || asset.type || '').trim();
  const resourceType = String(asset.resourceType || 'image').trim();
  const tags = normalizeTagSet(asset.tags);
  const ctx = parseCloudinaryContext(asset.context);

  if (!publicId || resourceType !== 'image') {
    return { class: FIELD_MEDIA_CLASS.UNKNOWN_PROTECTED, reason: 'INVALID_IDENTITY' };
  }

  if (KYC_PREFIX_RE.test(publicId) || tags.has('kyc') || ctx.mediaKind === 'kyc') {
    return { class: FIELD_MEDIA_CLASS.KYC_PROTECTED, reason: 'KYC_SCOPE' };
  }

  const managedTags = hasManagedFieldTags(asset.tags);
  const hasCtx =
    ctx.schemaVersion === '1' ||
    ctx.mediaKind === 'profile_pending_private' ||
    ctx.mediaKind === 'profile_public' ||
    Boolean(ctx.fieldRecensementId);

  if (!managedTags) {
    // Préfixe seul → legacy/unknown protégé (médias antérieurs sans tags)
    if (isAllowedPrivatePublicId(publicId) || isAllowedPublicDerivativeId(publicId)) {
      return {
        class: FIELD_MEDIA_CLASS.LEGACY_PROTECTED,
        reason: 'MISSING_MANAGED_TAGS',
      };
    }
    return { class: FIELD_MEDIA_CLASS.UNKNOWN_PROTECTED, reason: 'UNMANAGED' };
  }

  if (!hasCtx) {
    return { class: FIELD_MEDIA_CLASS.UNKNOWN_PROTECTED, reason: 'MISSING_CONTEXT' };
  }

  if (deliveryType === 'authenticated' && isAllowedPrivatePublicId(publicId)) {
    return {
      class: FIELD_MEDIA_CLASS.MANAGED_FIELD_PRIVATE,
      reason: 'OK',
      context: ctx,
    };
  }

  if (
    (deliveryType === 'upload' || deliveryType === '') &&
    isAllowedPublicDerivativeId(publicId)
  ) {
    return {
      class: FIELD_MEDIA_CLASS.MANAGED_FIELD_PUBLIC,
      reason: 'OK',
      context: ctx,
    };
  }

  return { class: FIELD_MEDIA_CLASS.UNKNOWN_PROTECTED, reason: 'PREFIX_OR_TYPE_MISMATCH' };
}

export function isGcDeletableClass(cls) {
  return (
    cls === FIELD_MEDIA_CLASS.MANAGED_FIELD_PRIVATE ||
    cls === FIELD_MEDIA_CLASS.MANAGED_FIELD_PUBLIC
  );
}

export function fingerprintPublicId(publicId) {
  const s = String(publicId || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `fp_${(h >>> 0).toString(16)}_${s.length}`;
}

export default {
  classifyFieldMediaAsset,
  buildFieldMediaCloudinaryOptions,
  buildFieldPublicPromoteOptions,
  FIELD_MEDIA_TAGS,
  FIELD_MEDIA_CLASS,
};
