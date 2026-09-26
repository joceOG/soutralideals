/**
 * DASH-8E.3A.1 — Exclusion recherche publique des profils en doublon par utilisateur.
 */
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';

async function conflictedUtilisateurIds(Model) {
  const groups = await Model.aggregate([
    { $match: { utilisateur: { $exists: true, $ne: null } } },
    { $group: { _id: '$utilisateur', n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ]);
  return groups.map((g) => g._id);
}

/**
 * @returns {Promise<{ prestataire: import('mongoose').Types.ObjectId[], freelance: [], vendeur: [] }>}
 */
export async function loadPublicSearchConflictUtilisateurIds() {
  const [prestataire, freelance, vendeur] = await Promise.all([
    conflictedUtilisateurIds(prestataireModel),
    conflictedUtilisateurIds(freelanceModel),
    conflictedUtilisateurIds(vendeurModel),
  ]);
  return { prestataire, freelance, vendeur };
}

export function applyUtilisateurConflictExclusion(baseFilter, conflictIds) {
  if (!conflictIds?.length) return baseFilter;
  return {
    $and: [baseFilter, { utilisateur: { $nin: conflictIds } }],
  };
}
