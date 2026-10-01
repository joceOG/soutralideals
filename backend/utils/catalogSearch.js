import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import Service from '../models/serviceModel.js';
import {
  isEmarketGroupName,
  isFreelanceGroupName,
  isMetiersGroupName,
  rankCatalogServices,
  resolveSearchScope,
} from './catalogText.js';

async function groupeIdsForScope(scope) {
  const groupes = await Groupe.find().select('_id nomgroupe').lean();
  if (scope === 'metiers') {
    return groupes.filter((g) => isMetiersGroupName(g.nomgroupe)).map((g) => g._id);
  }
  if (scope === 'freelance') {
    return groupes.filter((g) => isFreelanceGroupName(g.nomgroupe)).map((g) => g._id);
  }
  if (scope === 'emarket') {
    return groupes.filter((g) => isEmarketGroupName(g.nomgroupe)).map((g) => g._id);
  }
  return groupes.map((g) => g._id);
}

/**
 * Charge les services d'un scope (catalogue borné, pas un scan prestataires).
 */
export async function loadCatalogServicesForScope(scope) {
  const resolved = resolveSearchScope(scope);
  const groupeIds = await groupeIdsForScope(resolved);
  if (!groupeIds.length) return { scope: resolved, services: [] };
  const categories = await Categorie.find({ groupe: { $in: groupeIds } }).select('_id').lean();
  const catIds = categories.map((c) => c._id);
  if (!catIds.length) return { scope: resolved, services: [] };
  const services = await Service.find({ categorie: { $in: catIds } })
    .select('nomservice aliases needs imageservice prixmoyen categorie shortcutRank')
    .populate({ path: 'categorie', select: 'nomcategorie groupe', populate: { path: 'groupe', select: 'nomgroupe' } })
    .lean();
  return { scope: resolved, services };
}

export async function matchCatalogServices(query, scope, { limit = 24 } = {}) {
  const { scope: resolved, services } = await loadCatalogServicesForScope(scope);
  const ranked = rankCatalogServices(query, services, { limit });
  return {
    scope: resolved,
    matches: ranked,
    serviceIds: ranked.map((m) => m.service._id),
  };
}
