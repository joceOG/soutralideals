/**
 * R1-07 — Allowlist et application sécurisée des changements de correction.
 */
export const CORRECTION_FIELD_ALLOWLIST = Object.freeze([
  'person.nom',
  'person.prenoms',
  'person.telephone',
  'person.whatsapp',
  'person.email',
  'business.serviceId',
  'business.description',
  'business.tarifDeclareMin',
  'business.tarifDeclareMax',
  'business.horairesTexte',
  'business.devise',
  'business.disponibilite',
  'business.displayName',
  'business.jobTitle',
  'business.categoryId',
  'business.skills',
  'business.hourlyRate',
  'business.bio',
  'business.shopName',
  'business.shopDescription',
  'business.businessType',
  'business.businessCategoryIds',
  'business.productTypeLabels',
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

const FORBIDDEN_PATH_FRAGMENTS = Object.freeze([
  '__proto__',
  'prototype',
  'constructor',
  'recenseur',
  'reviewStatus',
  'publicationStatus',
  'ingestionStatus',
  'matchedUtilisateurId',
  'linkedProfile',
  'internalMatch',
  'requestHash',
  'currentContentHash',
  'clientMutationId',
  'kyc',
  'decisionHistory',
  'attemptLog',
  'operationHashes',
  'revision',
]);

/**
 * @param {unknown} changes
 * @returns {{ ok: true, paths: Record<string, unknown> } | { ok: false, code: string, message: string }}
 */
export function sanitizeCorrectionChanges(changes) {
  if (changes == null) {
    return { ok: true, paths: {} };
  }
  if (typeof changes !== 'object' || Array.isArray(changes)) {
    return { ok: false, code: 'RECENSEMENT_VALIDATION_FAILED', message: 'changes objet requis.' };
  }

  const paths = {};
  for (const rawKey of Object.keys(changes)) {
    const key = String(rawKey);
    if (key.startsWith('$') || key.includes('.$') || key.includes('[')) {
      return {
        ok: false,
        code: 'RECENSEMENT_VALIDATION_FAILED',
        message: 'Opérateur ou chemin interdit.',
      };
    }
    const lower = key.toLowerCase();
    if (FORBIDDEN_PATH_FRAGMENTS.some((f) => lower.includes(f.toLowerCase()))) {
      return {
        ok: false,
        code: 'RECENSEMENT_VALIDATION_FAILED',
        message: `Champ serveur interdit : ${key}`,
      };
    }
    if (!CORRECTION_FIELD_ALLOWLIST.includes(key) && key !== 'consent') {
      // consent as whole object allowed if in allowlist
      if (!CORRECTION_FIELD_ALLOWLIST.includes(key)) {
        return {
          ok: false,
          code: 'RECENSEMENT_VALIDATION_FAILED',
          message: `Chemin non autorisé : ${key}`,
        };
      }
    }
    if (Object.prototype.hasOwnProperty.call(changes, key)) {
      paths[key] = changes[key];
    }
  }
  return { ok: true, paths };
}

/**
 * @param {Record<string, unknown>} paths
 * @param {string[]} allowedFields correction.fields
 */
export function assertChangesWithinCorrectionFields(paths, allowedFields) {
  const allowed = new Set(allowedFields || []);
  for (const key of Object.keys(paths)) {
    if (key === 'profilePhoto') continue; // handled via file
    if (!allowed.has(key)) {
      return {
        ok: false,
        code: 'RECENSEMENT_CORRECTION_FIELD_FORBIDDEN',
        message: `Champ non demandé en correction : ${key}`,
      };
    }
  }
  return { ok: true };
}

/**
 * Applique des chemins « a.b » sur une copie plain object.
 * @param {object} target
 * @param {Record<string, unknown>} paths
 */
export function applyPathChanges(target, paths) {
  const out = structuredClone
    ? structuredClone(target)
    : JSON.parse(JSON.stringify(target));
  for (const [pathKey, value] of Object.entries(paths)) {
    if (pathKey === 'profilePhoto') continue;
    if (pathKey === 'consent' && value && typeof value === 'object') {
      out.consent = {
        recensementAccepted: value.recensementAccepted,
        acceptedAt: value.acceptedAt,
        textVersion: value.textVersion,
        method: value.method,
        language: value.language,
      };
      continue;
    }
    const parts = pathKey.split('.');
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return out;
}

export default {
  CORRECTION_FIELD_ALLOWLIST,
  sanitizeCorrectionChanges,
  assertChangesWithinCorrectionFields,
  applyPathChanges,
};
