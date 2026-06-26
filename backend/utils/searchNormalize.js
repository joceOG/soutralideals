/**
 * Normalisation de requête pour la recherche tolérante aux fautes
 * Gère les variantes orthographiques courantes en Côte d'Ivoire.
 */

/**
 * Retire les accents et normalise la casse
 */
export function removeAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Génère un pattern regex tolérant aux fautes courantes
 * ex: "plombier" → "plomb(i|ie|ier|ié|iér)?" OU "plomber" → même résultat
 * ex: "coiffeur" → "coiff(eur|er|eure|euse|euses)?"
 * ex: "electr" → cherche "électr" et "electr"
 */
export function buildFuzzyRegex(query) {
  // 1. Normaliser (enlever accents, minuscules)
  let normalized = removeAccents(query);

  // 2. Table des substitutions courantes (français ivoirien)
  const substitutions = [
    // Accents manquants ou inversés
    [/e/g, '[eéèêë]'],
    [/a/g, '[aàâä]'],
    [/i/g, '[iîï]'],
    [/u/g, '[uùûü]'],
    [/o/g, '[oôö]'],
    // Terminaisons de métiers (plombier/plomber/plombié/plombié)
    [/(ier|ié|ièr|iere|ière|er|é)$/g, '(ier|ié|ière|iere|er|é|e)?'],
    // Finales -eur/-euse/-eux
    [/(eur|euse|eux)$/g, '(eur|euse|eux|er|eu)?'],
    // Double consonne optionnelle (coiffeur/coifeur)
    [/([bcdfghjklmnpqrstvwxyz])\1/g, '$1$1?'],
    // -in/-en confusion (électricien/electricien)
    [/(ien|ian|yen)$/g, '(ien|ian|yen|in|en)?'],
    // -eau/-eau confusion
    [/eau/g, '(eau|o|au)'],
    // -ph/-f confusion (téléphone)
    [/ph/g, '(ph|f)'],
    // c/s/ç confusion
    [/([cs])/g, '[csç]'],
  ];

  // 3. Échapper les caractères spéciaux regex SAUF ceux qu'on va injecter
  let escaped = normalized.replace(/[.+*?^$()|[\]{}\\]/g, '\\$&');

  // 4. Appliquer les substitutions dans l'ordre
  for (const [from, to] of substitutions) {
    escaped = escaped.replace(from, to);
  }

  // 5. Le pattern doit matcher n'importe où dans la chaîne (pour préfixe/milieu)
  // On retourne deux patterns: début de mot ET contient
  return {
    // Commence par le terme (autocomplétion)
    startsWith: new RegExp(`^${escaped}`, 'i'),
    // Contient le terme (recherche générale)
    contains: new RegExp(escaped, 'i'),
    // Aussi le regex simple pour le cas où le mot est bien orthographié
    exact: new RegExp(query, 'i'),
  };
}

/**
 * Construit un filtre MongoDB multi-champs avec fuzzy matching
 */
export function buildFuzzyFilter(query, fields) {
  const { contains, exact } = buildFuzzyRegex(query);

  // Combine: cherche avec la regex exacte ET la regex tolérante
  const orClauses = [];

  for (const field of fields) {
    orClauses.push({ [field]: exact });
    orClauses.push({ [field]: contains });
  }

  return { $or: orClauses };
}

