/**
 * R1-06 — Lecture FieldRecensement (mine + getById).
 */
import FieldRecensement, {
  PROFESSIONAL_TYPES,
  REVIEW_STATUSES,
} from '../models/fieldRecensementModel.js';
import { isAdmin } from '../utils/accessControl.js';
import {
  decodeFieldRecensementCursor,
  encodeFieldRecensementCursor,
} from '../utils/fieldRecensementCursor.js';
import {
  DETAIL_PROJECTION,
  MINE_LIST_PROJECTION,
  toAdminFieldRecensementDetail,
  toAgentFieldRecensementDetail,
  toAgentFieldRecensementSummary,
} from '../utils/fieldRecensementDto.js';

const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

const ALLOWED_QUERY_KEYS = new Set(['cursor', 'limit', 'reviewStatus', 'professionalType']);

function queryError(message) {
  const err = new Error(message);
  err.status = 400;
  err.code = 'RECENSEMENT_QUERY_INVALID';
  return err;
}

/**
 * Valide et normalise la query /mine.
 * @param {Record<string, unknown>} query
 */
export function parseMineQuery(query) {
  const q = query && typeof query === 'object' ? query : {};

  for (const key of Object.keys(q)) {
    if (key.startsWith('$')) {
      throw queryError(`Paramètre interdit : ${key}`);
    }
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      throw queryError(`Paramètre non autorisé : ${key}`);
    }
  }

  const out = { limit: DEFAULT_LIMIT, reviewStatus: undefined, professionalType: undefined, cursor: null };

  if (q.limit != null && q.limit !== '') {
    if (typeof q.limit === 'object') throw queryError('limit invalide.');
    const n = Number(q.limit);
    if (!Number.isInteger(n) || n < MIN_LIMIT || n > MAX_LIMIT) {
      throw queryError(`limit doit être un entier entre ${MIN_LIMIT} et ${MAX_LIMIT}.`);
    }
    out.limit = n;
  }

  if (q.reviewStatus != null && q.reviewStatus !== '') {
    if (typeof q.reviewStatus !== 'string') {
      throw queryError('reviewStatus invalide.');
    }
    if (!REVIEW_STATUSES.includes(q.reviewStatus)) {
      throw queryError('reviewStatus inconnu.');
    }
    out.reviewStatus = q.reviewStatus;
  }

  if (q.professionalType != null && q.professionalType !== '') {
    if (typeof q.professionalType !== 'string') {
      throw queryError('professionalType invalide.');
    }
    if (!PROFESSIONAL_TYPES.includes(q.professionalType)) {
      throw queryError('professionalType inconnu.');
    }
    out.professionalType = q.professionalType;
  }

  if (q.cursor != null && q.cursor !== '') {
    if (typeof q.cursor !== 'string') {
      const err = new Error('Curseur invalide.');
      err.status = 400;
      err.code = 'RECENSEMENT_CURSOR_INVALID';
      throw err;
    }
    out.cursor = decodeFieldRecensementCursor(q.cursor);
  }

  return out;
}

/**
 * @param {{ agentUser: object, query: object }} args
 */
export async function listMineFieldRecensements({ agentUser, query }) {
  const parsed = parseMineQuery(query);
  const filter = {
    recenseur: agentUser._id,
  };
  if (parsed.reviewStatus) filter.reviewStatus = parsed.reviewStatus;
  if (parsed.professionalType) filter.professionalType = parsed.professionalType;

  if (parsed.cursor) {
    filter.$or = [
      { createdAt: { $lt: parsed.cursor.createdAt } },
      {
        createdAt: parsed.cursor.createdAt,
        _id: { $lt: parsed.cursor.id },
      },
    ];
  }

  const rows = await FieldRecensement.find(filter)
    .select(MINE_LIST_PROJECTION)
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
    items: items.map((d) => toAgentFieldRecensementSummary(d)),
    nextCursor,
    limit: parsed.limit,
  };
}

/**
 * @param {{ id: string, actorUser: object, req: object }} args
 */
export async function getFieldRecensementForActor({ id, actorUser, req }) {
  if (!/^[a-fA-F0-9]{24}$/.test(String(id))) {
    const err = new Error('Identifiant dossier invalide.');
    err.status = 400;
    err.code = 'RECENSEMENT_ID_INVALID';
    throw err;
  }

  const doc = await FieldRecensement.findById(id).select(DETAIL_PROJECTION).lean();
  if (!doc) {
    const err = new Error('Dossier introuvable.');
    err.status = 404;
    err.code = 'RECENSEMENT_NOT_FOUND';
    throw err;
  }

  const admin = isAdmin(req);
  const owner = String(doc.recenseur) === String(actorUser._id);

  if (admin) {
    return { data: toAdminFieldRecensementDetail(doc), kind: 'admin' };
  }
  if (owner) {
    return { data: toAgentFieldRecensementDetail(doc), kind: 'owner' };
  }

  const err = new Error('Dossier introuvable.');
  err.status = 404;
  err.code = 'RECENSEMENT_NOT_FOUND';
  throw err;
}

export { DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT };
