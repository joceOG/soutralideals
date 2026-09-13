/**
 * R1-03 — Canonicalisation payload create FieldRecensement + requestHash.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { normalizeEmail } from './emailIdentity.js';
import {
  canonicalizePhone,
  isInternationalInput,
  normalizePhone,
} from './phone.js';

const SERVER_ONLY_KEYS = new Set([
  'recenseur',
  'requestHash',
  'reviewStatus',
  'publicationStatus',
  'matchedUtilisateurId',
  'linkedProfile',
  'details',
  'ingestionStatus',
  'ingestionErrorCode',
  'revision',
  'lastOperationMutationId',
  'operationHashes',
  'internalMatch',
  'decisionHistory',
  'attemptLogEmbedded',
  'correction',
  'kyc',
]);

/**
 * Tableaux traités comme ensembles (ordre sans signification métier) :
 * skills, zonesIntervention, businessCategoryIds, productTypeLabels.
 * Autres tableaux : ordre préservé.
 */
const SET_LIKE_ARRAY_PATHS = new Set([
  'business.skills',
  'location.zonesIntervention',
  'business.businessCategoryIds',
  'business.productTypeLabels',
]);

function normalizeSetLikeArray(arr) {
  const cleaned = arr
    .map((v) => (typeof v === 'string' ? v.trim() : String(v)))
    .filter((v) => v !== '');
  const seen = new Set();
  const unique = [];
  for (const v of cleaned) {
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(v);
  }
  return unique.sort((a, b) => a.localeCompare(b));
}

/**
 * Tri récursif des clés d'un objet.
 * @param {unknown} obj
 * @param {string} [path]
 * @returns {unknown}
 */
export function sortKeysDeep(obj, path = '') {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    if (SET_LIKE_ARRAY_PATHS.has(path)) {
      return normalizeSetLikeArray(obj).map((item) => sortKeysDeep(item, path));
    }
    return obj.map((item, i) => sortKeysDeep(item, `${path}[${i}]`));
  }
  if (typeof obj !== 'object') return obj;
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    const childPath = path ? `${path}.${key}` : key;
    sorted[key] = sortKeysDeep(obj[key], childPath);
  }
  return sorted;
}

function normalizePhoneField(raw, defaultCountry) {
  if (raw == null || String(raw).trim() === '') return undefined;
  try {
    const opts = {};
    if (!isInternationalInput(raw)) opts.defaultCountry = defaultCountry;
    return canonicalizePhone(raw, opts).e164;
  } catch {
    const soft = normalizePhone(raw, defaultCountry);
    return soft || undefined;
  }
}

function stripServerFields(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SERVER_ONLY_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Normalise le payload create pour hash / persistance (sans champs serveur).
 * @param {object} payload
 * @param {{ defaultCountry?: string }} [opts]
 */
export function canonicalizeCreatePayload(payload, opts = {}) {
  const defaultCountry = opts.defaultCountry || 'CI';
  const raw = stripServerFields(payload && typeof payload === 'object' ? { ...payload } : {});

  const person = raw.person && typeof raw.person === 'object' ? { ...raw.person } : {};
  if (person.telephone != null) {
    person.telephone = normalizePhoneField(person.telephone, defaultCountry) ?? person.telephone;
  }
  if (person.whatsapp != null && String(person.whatsapp).trim() !== '') {
    person.whatsapp = normalizePhoneField(person.whatsapp, defaultCountry) ?? person.whatsapp;
  } else {
    delete person.whatsapp;
  }
  const email = normalizeEmail(person.email);
  if (email) person.email = email;
  else delete person.email;

  // business : retirer dérivés serveur / interdits du hash client
  let business = raw.business && typeof raw.business === 'object' ? { ...raw.business } : {};
  delete business.derivedCategorieId;
  delete business.categoryLabel; // dérivé serveur
  delete business.categorieId;

  const canonical = {
    clientMutationId: raw.clientMutationId,
    operationMutationId: raw.operationMutationId,
    schemaVersion: raw.schemaVersion,
    professionalType: raw.professionalType,
    recordedAt: raw.recordedAt,
    app: raw.app,
    person,
    business,
    location: raw.location,
    consent: raw.consent,
    metadata: raw.metadata,
  };

  // Retire clés undefined pour stabilité JSON
  for (const k of Object.keys(canonical)) {
    if (canonical[k] === undefined) delete canonical[k];
  }

  return sortKeysDeep(canonical);
}

/**
 * @param {object} canonicalPayload
 * @param {Array<{ kind: string, sha256: string }>} mediaParts
 */
export function computeRequestHash(canonicalPayload, mediaParts = []) {
  const sortedMedia = [...mediaParts].sort((a, b) => a.kind.localeCompare(b.kind));
  const mediaSegment = sortedMedia.map((p) => `${p.kind}:${p.sha256}`).join('|');
  const body = JSON.stringify(sortKeysDeep(canonicalPayload));
  const input = mediaSegment ? `${body}|${mediaSegment}` : body;
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * @param {string} filePath
 * @returns {Promise<string>} hex sha256
 */
export function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
