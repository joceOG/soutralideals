#!/usr/bin/env node
/**
 * Diagnostic lecture seule : 19 IDs, recoupement propositions, dump Métiers.
 * N’écrit pas le catalogue. Affiche l’URI masquée.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import Service from '../models/serviceModel.js';
import Prestataire from '../models/prestataireModel.js';
import FreelanceService from '../models/freelanceServiceModel.js';
import Prestation from '../models/prestationModel.js';
import FieldRecensement from '../models/fieldRecensementModel.js';
import { getCategorieIdsUnderServicesGenerauxGroupe } from '../utils/catalogFilters.js';
import { isMetiersGroupName, isFreelanceGroupName, normalizeCatalogText } from '../utils/catalogText.js';
import { PROPOSALS } from '../catalog/metiersCatalogPlan.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const ORPHAN_IDS = [
  '68d6a41c40b8a717973dd400',
  '68d6a42040b8a717973dd417',
  '68d6a74a8d705907be738abf',
  '68d6a74b8d705907be738ac9',
  '68d6a74f8d705907be738ae3',
  '68d6a7528d705907be738af5',
  '68d6a7548d705907be738aff',
  '68d6a75b8d705907be738b2a',
  '68d6a7748d705907be738bc4',
  '68d6a7768d705907be738bce',
  '68d6a77b8d705907be738bf0',
  '68d6a77c8d705907be738bfa',
  '68d6a852490b63f4b89feec0',
  '68d6a85e490b63f4b89fef0a',
  '68d6a862490b63f4b89fef24',
  '68d6a868490b63f4b89fef46',
  '68d6a86b490b63f4b89fef6c',
  '68d6a871490b63f4b89fefb5',
  '68d6a876490b63f4b89fefe2',
];

function redact(url) {
  return String(url || '').replace(/\/\/[^@]+@/, '//***:***@');
}

function oid(v) {
  if (v == null) return null;
  if (typeof v === 'object' && v._id) return String(v._id);
  return String(v);
}

async function countRefs(serviceId) {
  const id = new mongoose.Types.ObjectId(serviceId);
  const [prestataires, freelanceServices, prestations, recensements] = await Promise.all([
    Prestataire.countDocuments({ service: id }),
    FreelanceService.countDocuments({ service: id }),
    Prestation.countDocuments({ service: id }),
    FieldRecensement.countDocuments({ 'business.serviceId': id }),
  ]);
  return { prestataires, freelanceServices, prestations, recensements };
}

async function main() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!mongoUrl) {
    console.error('MONGO_URL manquant');
    process.exit(1);
  }
  console.error('READ-ONLY URI:', redact(mongoUrl));
  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 20000 });

  const excludedCatIds = await getCategorieIdsUnderServicesGenerauxGroupe();
  const excludedSet = new Set(excludedCatIds.map((id) => String(id)));

  const coll = mongoose.connection.collection('services');
  const orphanRows = [];
  for (const id of ORPHAN_IDS) {
    const raw = await coll.findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (!raw) {
      orphanRows.push({
        serviceId: id,
        nom: null,
        cause: 'document_absent',
        decision: 'A_REVOIR',
      });
      continue;
    }
    const rawCatId = raw.categorie == null ? null : String(raw.categorie);
    const catExists = rawCatId
      ? await Categorie.findById(rawCatId).lean()
      : null;
    const rawGroupeId = catExists?.groupe ? String(catExists.groupe) : null;
    const groupeExists = rawGroupeId ? await Groupe.findById(rawGroupeId).lean() : null;
    const populated = await Service.findById(id).populate({
      path: 'categorie',
      populate: { path: 'groupe' },
    });
    const excludedByFilter = rawCatId ? excludedSet.has(rawCatId) : false;
    let cause = 'indetermine';
    if (raw.categorie == null || raw.categorie === undefined) {
      cause = 'reference_absente';
    } else if (!catExists) {
      cause = 'reference_non_nulle_cassee';
    } else if (!rawGroupeId) {
      cause = 'groupe_manquant_sur_categorie';
    } else if (!groupeExists) {
      cause = 'groupe_reference_cassee';
    } else if (excludedByFilter) {
      cause = 'categorie_exclue_filtre_services_generaux';
    } else if (!populated?.categorie) {
      cause = 'populate_ou_serialisation';
    } else if (!populated.categorie.groupe?.nomgroupe) {
      cause = 'groupe_non_resolu_apres_populate';
    } else {
      cause = 'resolu_hors_api_ou_autre';
    }
    const refs = await countRefs(id);
    orphanRows.push({
      serviceId: id,
      nom: raw.nomservice,
      categorieIdBrut: rawCatId,
      categorieExistante: Boolean(catExists),
      nomcategorie: catExists?.nomcategorie || null,
      groupeId: rawGroupeId,
      groupeExistant: Boolean(groupeExists),
      nomgroupe: groupeExists?.nomgroupe || null,
      populateCategorieNull: !populated?.categorie,
      excludedByFilter,
      cause,
      refs,
      decision: 'A_REVOIR',
    });
  }

  const groupes = await Groupe.find().lean();
  const metiersG = groupes.find((g) => isMetiersGroupName(g.nomgroupe));
  const freeG = groupes.find((g) => isFreelanceGroupName(g.nomgroupe));
  const metiersCats = metiersG
    ? await Categorie.find({ groupe: metiersG._id }).lean()
    : [];
  const metiersServices = metiersG
    ? await Service.find({ categorie: { $in: metiersCats.map((c) => c._id) } })
      .populate({ path: 'categorie', populate: { path: 'groupe' } })
      .lean()
    : [];
  const freeCats = freeG
    ? await Categorie.find({ groupe: freeG._id }).lean()
    : [];
  const freeServices = freeG
    ? await Service.find({ categorie: { $in: freeCats.map((c) => c._id) } })
      .populate({ path: 'categorie', populate: { path: 'groupe' } })
      .lean()
    : [];

  const allForSearch = [...metiersServices, ...freeServices];
  const searchHints = [
    'professeur', 'cours', 'coach', 'sport', 'photographe', 'photo',
    'menuisier', 'ebenist', 'ferron', 'informatique', 'dj', 'elag',
    'jardin', 'nage', 'piscine', 'decorat', 'vulgar', 'vulcan',
  ];
  const hintHits = {};
  for (const h of searchHints) {
    hintHits[h] = allForSearch
      .filter((s) => normalizeCatalogText(s.nomservice).includes(h)
        || (s.aliases || []).some((a) => normalizeCatalogText(a).includes(h)))
      .map((s) => ({
        id: String(s._id),
        nom: s.nomservice,
        cat: s.categorie?.nomcategorie,
        groupe: s.categorie?.groupe?.nomgroupe,
      }));
  }

  const proposalMatches = PROPOSALS.map((p) => {
    const n = normalizeCatalogText(p.title);
    const hits = allForSearch.filter((s) => {
      const sn = normalizeCatalogText(s.nomservice);
      return sn === n || sn.includes(n.split(' ')[0]) && n.split(' ').some((t) => t.length > 4 && sn.includes(t));
    }).slice(0, 8).map((s) => ({
      id: String(s._id),
      nom: s.nomservice,
      cat: s.categorie?.nomcategorie,
      groupe: s.categorie?.groupe?.nomgroupe,
    }));
    return { n: p.n, title: p.title, hits };
  });

  console.log(JSON.stringify({
    metiersCount: metiersServices.length,
    freelanceCount: freeServices.length,
    categoriesMetiers: metiersCats.map((c) => c.nomcategorie),
    orphans: orphanRows,
    hintHits,
    proposalMatches,
    metiersInventory: metiersServices.map((s) => ({
      id: String(s._id),
      nom: s.nomservice,
      cat: s.categorie?.nomcategorie,
      aliases: s.aliases || [],
      needs: s.needs || [],
      shortcutRank: s.shortcutRank ?? null,
    })),
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
