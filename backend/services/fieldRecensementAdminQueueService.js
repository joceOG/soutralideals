/**
 * R3-01 — File admin FieldRecensement (liste curseur + compteurs).
 * Lecture seule — aucune mutation.
 */
import mongoose from 'mongoose';
import FieldRecensement, {
  PROFESSIONAL_TYPES,
  PUBLICATION_STATUSES,
  REVIEW_STATUSES,
} from '../models/fieldRecensementModel.js';
import {
  decodeFieldRecensementCursor,
  encodeFieldRecensementCursor,
} from '../utils/fieldRecensementCursor.js';
import {
  ADMIN_QUEUE_LIST_PROJECTION,
  toAdminFieldRecensementQueueItem,
} from '../utils/fieldRecensementDto.js';
import { normalizePhone } from '../utils/phone.js';

const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const MAX_STRING = 120;
const MAX_SEARCH = 64;

const ALLOWED_QUERY_KEYS = new Set([
  'cursor',
  'limit',
  'reviewStatus',
  'publicationStatus',
  'professionalType',
  'recenseurId',
  'commune',
  'quartier',
  'hasPhoto',
  'createdFrom',
  'createdTo',
  'q',
]);

function queryError(message) {
  const err = new Error(message);
  err.status = 400;
  err.code = 'RECENSEMENT_QUERY_INVALID';
  return err;
}

function cursorError(message) {
  const err = new Error(message);
  err.status = 400;
  err.code = 'RECENSEMENT_CURSOR_INVALID';
  return err;
}

function assertPlainString(value, field, maxLen = MAX_STRING) {
  if (typeof value !== 'string') throw queryError(`${field} invalide.`);
  if (value.length > maxLen) throw queryError(`${field} trop long.`);
  return value.trim();
}

/** Échappe les métacaractères regex — jamais de regex client brut. */
export function escapeRegexLiteral(raw) {
  return String(raw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Valide et normalise la query admin queue / stats.
 * @param {Record<string, unknown>} query
 * @param {{ allowCursor?: boolean }} [opts]
 */
export function parseAdminQueueQuery(query, opts = {}) {
  const allowCursor = opts.allowCursor !== false;
  const q = query && typeof query === 'object' && !Array.isArray(query) ? query : {};

  for (const key of Object.keys(q)) {
    if (key.startsWith('$')) throw queryError(`Paramètre interdit : ${key}`);
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      throw queryError(`Paramètre non autorisé : ${key}`);
    }
    const val = q[key];
    if (val != null && typeof val === 'object') {
      throw queryError(`Paramètre objet interdit : ${key}`);
    }
  }

  const out = {
    limit: DEFAULT_LIMIT,
    reviewStatus: undefined,
    publicationStatus: undefined,
    professionalType: undefined,
    recenseurId: undefined,
    commune: undefined,
    quartier: undefined,
    hasPhoto: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    searchPhone: undefined,
    searchText: undefined,
    cursor: null,
  };

  if (allowCursor && q.cursor != null && q.cursor !== '') {
    if (typeof q.cursor !== 'string') throw cursorError('Curseur invalide.');
    out.cursor = decodeFieldRecensementCursor(q.cursor);
  } else if (!allowCursor && q.cursor != null && q.cursor !== '') {
    throw queryError('cursor non autorisé sur cet endpoint.');
  }

  if (q.limit != null && q.limit !== '') {
    if (typeof q.limit === 'object') throw queryError('limit invalide.');
    const n = Number(q.limit);
    if (!Number.isInteger(n) || n < MIN_LIMIT || n > MAX_LIMIT) {
      throw queryError(`limit doit être un entier entre ${MIN_LIMIT} et ${MAX_LIMIT}.`);
    }
    out.limit = n;
  }

  if (q.reviewStatus != null && q.reviewStatus !== '') {
    const v = assertPlainString(q.reviewStatus, 'reviewStatus', 64);
    if (!REVIEW_STATUSES.includes(v)) throw queryError('reviewStatus inconnu.');
    out.reviewStatus = v;
  }

  if (q.publicationStatus != null && q.publicationStatus !== '') {
    const v = assertPlainString(q.publicationStatus, 'publicationStatus', 64);
    if (!PUBLICATION_STATUSES.includes(v)) {
      throw queryError('publicationStatus inconnu.');
    }
    out.publicationStatus = v;
  }

  if (q.professionalType != null && q.professionalType !== '') {
    const v = assertPlainString(q.professionalType, 'professionalType', 32);
    if (!PROFESSIONAL_TYPES.includes(v)) {
      throw queryError('professionalType inconnu.');
    }
    out.professionalType = v;
  }

  if (q.recenseurId != null && q.recenseurId !== '') {
    const v = assertPlainString(q.recenseurId, 'recenseurId', 24);
    if (!/^[a-fA-F0-9]{24}$/.test(v)) throw queryError('recenseurId invalide.');
    out.recenseurId = new mongoose.Types.ObjectId(v);
  }

  if (q.commune != null && q.commune !== '') {
    out.commune = assertPlainString(q.commune, 'commune');
  }
  if (q.quartier != null && q.quartier !== '') {
    out.quartier = assertPlainString(q.quartier, 'quartier');
  }

  if (q.hasPhoto != null && q.hasPhoto !== '') {
    const raw = String(q.hasPhoto).toLowerCase();
    if (raw !== 'true' && raw !== 'false' && raw !== '1' && raw !== '0') {
      throw queryError('hasPhoto invalide.');
    }
    out.hasPhoto = raw === 'true' || raw === '1';
  }

  if (q.createdFrom != null && q.createdFrom !== '') {
    const d = new Date(String(q.createdFrom));
    if (Number.isNaN(d.getTime())) throw queryError('createdFrom invalide.');
    out.createdFrom = d;
  }
  if (q.createdTo != null && q.createdTo !== '') {
    const d = new Date(String(q.createdTo));
    if (Number.isNaN(d.getTime())) throw queryError('createdTo invalide.');
    out.createdTo = d;
  }
  if (out.createdFrom && out.createdTo && out.createdFrom > out.createdTo) {
    throw queryError('Intervalle de dates inversé.');
  }

  if (q.q != null && q.q !== '') {
    const raw = assertPlainString(q.q, 'q', MAX_SEARCH);
    const phone = normalizePhone(raw, 'CI') || (raw.startsWith('+') ? normalizePhone(raw) : '');
    if (phone) {
      out.searchPhone = phone;
    } else {
      out.searchText = raw;
    }
  }

  return out;
}

/**
 * Filtre Mongo partagé liste + compteurs (sans curseur).
 * @param {ReturnType<typeof parseAdminQueueQuery>} parsed
 */
export function buildAdminQueueFilter(parsed) {
  const filter = {};

  if (parsed.reviewStatus) filter.reviewStatus = parsed.reviewStatus;
  if (parsed.publicationStatus) filter.publicationStatus = parsed.publicationStatus;
  if (parsed.professionalType) filter.professionalType = parsed.professionalType;
  if (parsed.recenseurId) filter.recenseur = parsed.recenseurId;
  if (parsed.commune) {
    filter['location.commune'] = {
      $regex: `^${escapeRegexLiteral(parsed.commune)}$`,
      $options: 'i',
    };
  }
  if (parsed.quartier) {
    filter['location.quartier'] = {
      $regex: `^${escapeRegexLiteral(parsed.quartier)}$`,
      $options: 'i',
    };
  }

  if (parsed.hasPhoto === true) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { 'media.profilePhoto.status': { $exists: true, $nin: [null, '', 'absent'] } },
        { 'media.profilePhoto.kind': { $exists: true, $nin: [null, ''] } },
      ],
    });
  } else if (parsed.hasPhoto === false) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { 'media.profilePhoto': { $exists: false } },
        { 'media.profilePhoto.status': { $in: [null, '', 'absent'] } },
        {
          $and: [
            { 'media.profilePhoto.kind': { $in: [null, ''] } },
            { 'media.profilePhoto.status': { $in: [null, '', 'absent'] } },
          ],
        },
      ],
    });
  }

  if (parsed.createdFrom || parsed.createdTo) {
    filter.createdAt = {};
    if (parsed.createdFrom) filter.createdAt.$gte = parsed.createdFrom;
    if (parsed.createdTo) filter.createdAt.$lte = parsed.createdTo;
  }

  if (parsed.searchPhone) {
    filter['person.telephone'] = parsed.searchPhone;
  } else if (parsed.searchText) {
    const lit = escapeRegexLiteral(parsed.searchText);
    filter.$or = [
      { 'person.nom': { $regex: lit, $options: 'i' } },
      { 'person.prenoms': { $regex: lit, $options: 'i' } },
      { 'business.shopName': { $regex: lit, $options: 'i' } },
      { 'business.displayName': { $regex: lit, $options: 'i' } },
      { 'business.jobTitle': { $regex: lit, $options: 'i' } },
    ];
  }

  return filter;
}

/**
 * @param {{ query: object }} args
 */
export async function listAdminFieldRecensementQueue({ query }) {
  const parsed = parseAdminQueueQuery(query, { allowCursor: true });
  const filter = buildAdminQueueFilter(parsed);

  if (parsed.cursor) {
    const cursorClause = {
      $or: [
        { createdAt: { $lt: parsed.cursor.createdAt } },
        {
          createdAt: parsed.cursor.createdAt,
          _id: { $lt: parsed.cursor.id },
        },
      ],
    };
    if (filter.$and) {
      filter.$and.push(cursorClause);
    } else if (filter.$or && !parsed.searchText) {
      filter.$and = [{ $or: filter.$or }, cursorClause];
      delete filter.$or;
    } else if (filter.$or && parsed.searchText) {
      filter.$and = [{ $or: filter.$or }, cursorClause];
      delete filter.$or;
    } else {
      Object.assign(filter, cursorClause);
    }
  }

  const rows = await FieldRecensement.find(filter)
    .select(ADMIN_QUEUE_LIST_PROJECTION)
    .sort({ createdAt: -1, _id: -1 })
    .limit(parsed.limit + 1)
    .lean();

  let nextCursor = null;
  let items = rows;
  if (rows.length > parsed.limit) {
    items = rows.slice(0, parsed.limit);
    const last = items[items.length - 1];
    nextCursor = encodeFieldRecensementCursor({
      createdAt: last.createdAt,
      id: last._id,
    });
  }

  return {
    items: items.map((d) => toAdminFieldRecensementQueueItem(d)),
    nextCursor,
    limit: parsed.limit,
  };
}

/** Expression d’incohérence review/publication (prudence). */
export function inconsistentStatusExpr() {
  return {
    $or: [
      {
        $and: [
          { $eq: ['$reviewStatus', 'rejected'] },
          { $eq: ['$publicationStatus', 'published'] },
        ],
      },
      {
        $and: [
          { $eq: ['$reviewStatus', 'pending_review'] },
          { $eq: ['$publicationStatus', 'published'] },
        ],
      },
      {
        $and: [
          { $eq: ['$reviewStatus', 'needs_correction'] },
          { $eq: ['$publicationStatus', 'published'] },
        ],
      },
      {
        $and: [
          { $eq: ['$reviewStatus', 'suspended'] },
          { $eq: ['$publicationStatus', 'published'] },
        ],
      },
      {
        $and: [
          { $eq: ['$reviewStatus', 'approved'] },
          { $eq: ['$publicationStatus', 'suspended'] },
        ],
      },
    ],
  };
}

/**
 * Compteurs via une seule agrégation ($facet / $group).
 * @param {{ query: object }} args
 */
export async function getAdminFieldRecensementQueueStats({ query }) {
  const parsed = parseAdminQueueQuery(query, { allowCursor: false });
  // Les compteurs globaux de modération ne doivent pas être réduits
  // par reviewStatus/publicationStatus de la liste — sauf filtres « scope »
  // (type, geo, dates, recenseur, photo, recherche).
  const scope = { ...parsed };
  scope.reviewStatus = undefined;
  scope.publicationStatus = undefined;
  const filter = buildAdminQueueFilter(scope);

  const [row] = await FieldRecensement.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending_review: {
          $sum: { $cond: [{ $eq: ['$reviewStatus', 'pending_review'] }, 1, 0] },
        },
        needs_correction: {
          $sum: { $cond: [{ $eq: ['$reviewStatus', 'needs_correction'] }, 1, 0] },
        },
        approved_awaiting_publication: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$reviewStatus', 'approved'] },
                  { $ne: ['$publicationStatus', 'published'] },
                  { $ne: ['$publicationStatus', 'suspended'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        published: {
          $sum: {
            $cond: [{ $eq: ['$publicationStatus', 'published'] }, 1, 0],
          },
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$reviewStatus', 'rejected'] }, 1, 0] },
        },
        suspended: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$reviewStatus', 'suspended'] },
                  { $eq: ['$publicationStatus', 'suspended'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        publication_failed: {
          $sum: {
            $cond: [{ $eq: ['$publicationStatus', 'failed'] }, 1, 0],
          },
        },
        attention_required: {
          $sum: { $cond: [inconsistentStatusExpr(), 1, 0] },
        },
      },
    },
  ]);

  const empty = {
    total: 0,
    pending_review: 0,
    needs_correction: 0,
    approved_awaiting_publication: 0,
    published: 0,
    rejected: 0,
    suspended: 0,
    publication_failed: 0,
    attention_required: 0,
  };

  if (!row) return empty;
  const { _id, ...counts } = row;
  return counts;
}

export {
  DEFAULT_LIMIT,
  MIN_LIMIT,
  MAX_LIMIT,
  ALLOWED_QUERY_KEYS,
};

export default {
  parseAdminQueueQuery,
  listAdminFieldRecensementQueue,
  getAdminFieldRecensementQueueStats,
  buildAdminQueueFilter,
};
