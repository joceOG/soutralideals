import mongoose from 'mongoose';
import Service from '../models/serviceModel.js';
import { getServiceIdsUnderServicesGenerauxCategories } from './catalogFilters.js';
import { applyPrestatairePublicFilter } from './proPublicFilter.js';

function asObjectId(value, label) {
  if (value == null || String(value).trim() === '') return { empty: true };
  if (!mongoose.Types.ObjectId.isValid(String(value))) {
    return { error: `Identifiant ${label} invalide.` };
  }
  return { id: new mongoose.Types.ObjectId(String(value)) };
}

/**
 * Construit le filtre Mongo prestataire : service/catégorie AVANT skip/limit.
 * Public : publication (dont recensement V1). Admin / propriétaire inchangés.
 */
export async function buildPrestataireListFilter(req) {
  const { service, categorie } = req.query || {};
  const excluded = await getServiceIdsUnderServicesGenerauxCategories();
  const filter = applyPrestatairePublicFilter(req, {});

  const serviceRef = asObjectId(service, 'de service');
  if (serviceRef.error) return { error: serviceRef.error, status: 400 };
  const categorieRef = asObjectId(categorie, 'de catégorie');
  if (categorieRef.error) return { error: categorieRef.error, status: 400 };

  let allowedServiceIds = null;

  if (categorieRef.id) {
    const inCat = await Service.find({ categorie: categorieRef.id }).select('_id').lean();
    allowedServiceIds = inCat.map((s) => s._id);
    if (!allowedServiceIds.length) {
      return { filter: null, empty: true };
    }
  }

  if (serviceRef.id) {
    const sid = serviceRef.id;
    if (excluded.some((id) => String(id) === String(sid))) {
      return { filter: null, empty: true };
    }
    if (allowedServiceIds && !allowedServiceIds.some((id) => String(id) === String(sid))) {
      return { filter: null, empty: true };
    }
    filter.service = sid;
  } else if (allowedServiceIds) {
    const filteredIds = excluded.length
      ? allowedServiceIds.filter((id) => !excluded.some((ex) => String(ex) === String(id)))
      : allowedServiceIds;
    if (!filteredIds.length) return { filter: null, empty: true };
    filter.service = { $in: filteredIds };
  } else if (excluded.length) {
    filter.service = { $nin: excluded };
  }

  return { filter, empty: false };
}

export function prestataireListPagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 50));
  return { page, limit, skip: (page - 1) * limit };
}
