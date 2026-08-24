/**
 * STAB-12F — Normalisation email (trim + lowercase). Absence = undefined, jamais "null".
 */

/** Filtre partiel Mongo pour index email unique (emails réels uniquement). */
export const EMAIL_UNIQUE_PARTIAL_FILTER = Object.freeze({
  email: { $exists: true, $type: 'string', $gt: '' },
});

export const EMAIL_UNIQUE_INDEX_NAME = 'email_unique_nonempty';

/**
 * @param {unknown} raw
 * @returns {string|undefined} email normalisé ou undefined si absent/vide
 */
export function normalizeEmail(raw) {
  if (raw == null) return undefined;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === 'null' || s === 'undefined') return undefined;
  return s;
}

/** @param {unknown} raw */
export function isNonemptyEmail(raw) {
  return normalizeEmail(raw) !== undefined;
}

/**
 * Détecte un index email legacy (unique global sans filtre partiel STAB-12F).
 * @param {Array<{ name?: string, key?: object, unique?: boolean, partialFilterExpression?: object }>} indexes
 */
export function findLegacyEmailIndex(indexes) {
  if (!Array.isArray(indexes)) return null;
  return (
    indexes.find(
      (idx) =>
        idx.key?.email === 1 &&
        idx.unique === true &&
        idx.name !== EMAIL_UNIQUE_INDEX_NAME &&
        (!idx.partialFilterExpression ||
          !Object.prototype.hasOwnProperty.call(
            idx.partialFilterExpression,
            'email',
          )),
    ) ?? null
  );
}
