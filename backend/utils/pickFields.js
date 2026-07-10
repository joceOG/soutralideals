/** Extrait uniquement les champs autorisés d'un objet source. */
export function pickFields(source, allowedFields) {
  if (!source || typeof source !== 'object') return {};
  const result = {};
  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}
