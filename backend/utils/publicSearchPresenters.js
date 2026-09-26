/**
 * DASH-8E.3A.1 — DTO publics recherche (liste blanche stricte).
 */

const PUBLIC_SEARCH_KEYS = {
  prestataire: new Set(['_id', 'name', 'job', 'imagePath', 'ville', 'rating', 'type']),
  freelance: new Set(['_id', 'name', 'job', 'imagePath', 'ville', 'rating', 'type']),
  vendeur: new Set([
    '_id',
    'shopName',
    'shopDescription',
    'shopLogo',
    'businessCategories',
    'ville',
    'rating',
    'type',
  ]),
};

function pickWhitelist(obj, allowed) {
  const out = {};
  for (const key of allowed) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

export function presentPublicPrestataireSearchItem(doc) {
  const u = doc.utilisateur;
  const item = {
    _id: doc._id,
    name: `${u?.prenom ?? ''} ${u?.nom ?? ''}`.trim() || 'Prestataire',
    job: doc.service?.nomservice || 'Prestataire',
    imagePath: u?.photoProfil ?? null,
    ville: doc.ville || doc.localisation || null,
    rating: doc.note ?? 0,
    type: 'Prestataire',
  };
  return pickWhitelist(item, PUBLIC_SEARCH_KEYS.prestataire);
}

export function presentPublicFreelanceSearchItem(doc) {
  const item = {
    _id: doc._id,
    name: doc.name ?? doc.displayName ?? '',
    job: doc.job ?? doc.jobTitle ?? '',
    imagePath: doc.imagePath ?? null,
    ville: doc.ville || doc.location || null,
    rating: doc.rating ?? 0,
    type: 'Freelance',
  };
  return pickWhitelist(item, PUBLIC_SEARCH_KEYS.freelance);
}

export function presentPublicVendeurSearchItem(doc) {
  const categories = Array.isArray(doc.businessCategories)
    ? doc.businessCategories.map((c) => (typeof c === 'object' ? c?.name ?? String(c) : String(c)))
    : [];
  const item = {
    _id: doc._id,
    shopName: doc.shopName ?? '',
    shopDescription: doc.shopDescription ?? '',
    shopLogo: doc.shopLogo ?? null,
    businessCategories: categories,
    ville: doc.ville ?? null,
    rating: doc.rating ?? 0,
    type: 'Vendeur',
  };
  return pickWhitelist(item, PUBLIC_SEARCH_KEYS.vendeur);
}

export function assertPublicSearchDtoKeys(item, type) {
  const allowed = PUBLIC_SEARCH_KEYS[type];
  for (const key of Object.keys(item)) {
    if (!allowed.has(key)) {
      throw new Error(`Clé publique interdite: ${type}.${key}`);
    }
  }
}

export { PUBLIC_SEARCH_KEYS };
