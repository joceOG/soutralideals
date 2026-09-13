/**
 * R1-03 / 3C-BIS — Validation payload create FieldRecensement (pre-recensement, sans KYC).
 */
import validator from 'validator';
import mongoose from 'mongoose';
import { PROFESSIONAL_TYPES } from '../models/fieldRecensementModel.js';
import { normalizeEmail } from './emailIdentity.js';
import {
  canonicalizePhone,
  isInternationalInput,
  PhoneValidationError,
} from './phone.js';
import { isTempEmail } from '../services/fieldRecensementUserMatcher.js';

const PASSWORD_KEYS = new Set(['password', 'motDePasse', 'mot_de_passe', 'secret']);

const TOP_LEVEL_FORBIDDEN = new Set([
  'recenseur',
  'requestHash',
  'reviewStatus',
  'publicationStatus',
  'matchedUtilisateurId',
  'linkedProfile',
  'details',
  'password',
  'ingestionStatus',
  'kyc',
  'kycCniRecto',
  'kycCniVerso',
  'kycSelfie',
  'kycDocuments',
]);

const TOP_LEVEL_ALLOWED = new Set([
  'clientMutationId',
  'operationMutationId',
  'schemaVersion',
  'professionalType',
  'recordedAt',
  'app',
  'person',
  'business',
  'location',
  'consent',
  'metadata',
]);

/** Clés business autorisées (union) — toute autre clé → VALIDATION_FAILED. */
const BUSINESS_KEYS_ALLOWED = new Set([
  'serviceId',
  'description',
  'tarifDeclareMin',
  'tarifDeclareMax',
  'devise',
  'horairesTexte',
  'disponibilite',
  'displayName',
  'jobTitle',
  'categoryId',
  'skills',
  'hourlyRate',
  'bio',
  'shopName',
  'shopDescription',
  'businessType',
  'businessCategoryIds',
  'productTypeLabels',
]);

/** Interdits côté client même s’ils existent en schéma (dérivés serveur). */
const BUSINESS_CLIENT_FORBIDDEN = new Set([
  'categorieId',
  'derivedCategorieId',
  'categoryLabel',
  'productTypeIds',
]);

const MAX_BUSINESS_CATEGORY_IDS = 10;
const MAX_PRODUCT_TYPE_LABELS = 20;
const MAX_SKILLS = 30;

function err(field, code, message) {
  return { field, code, message };
}

function hasPasswordKey(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return [...PASSWORD_KEYS].some((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

function validateGps(location, errors) {
  if (!location || typeof location !== 'object') return;
  if (location.latitude != null) {
    const lat = Number(location.latitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.push(err('location.latitude', 'INVALID_GPS', 'Latitude hors bornes.'));
    }
  }
  if (location.longitude != null) {
    const lng = Number(location.longitude);
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      errors.push(err('location.longitude', 'INVALID_GPS', 'Longitude hors bornes.'));
    }
  }
  if (location.accuracyMeters != null && Number(location.accuracyMeters) < 0) {
    errors.push(err('location.accuracyMeters', 'INVALID', 'accuracyMeters >= 0.'));
  }
}

function validatePerson(person, errors, defaultCountry) {
  if (!person || typeof person !== 'object') {
    errors.push(err('person', 'REQUIRED', 'person requis.'));
    return null;
  }
  if (hasPasswordKey(person)) {
    errors.push(err('person.password', 'FORBIDDEN_FIELD', 'Mot de passe interdit.'));
  }
  if (!person.nom || String(person.nom).trim().length < 2) {
    errors.push(err('person.nom', 'INVALID', 'Nom requis (min 2 caractères).'));
  }
  if (!person.telephone || String(person.telephone).trim() === '') {
    errors.push(err('person.telephone', 'REQUIRED', 'Téléphone requis.'));
  } else {
    try {
      const opts = {};
      if (!isInternationalInput(person.telephone)) opts.defaultCountry = defaultCountry;
      canonicalizePhone(person.telephone, opts);
    } catch (e) {
      if (e instanceof PhoneValidationError || e?.code === 'INVALID_PHONE') {
        errors.push(err('person.telephone', 'INVALID_PHONE', 'Téléphone invalide.'));
      }
    }
  }
  if (person.email != null && String(person.email).trim() !== '') {
    const email = normalizeEmail(person.email);
    if (!email || !validator.isEmail(email)) {
      errors.push(err('person.email', 'INVALID_EMAIL', 'Email invalide.'));
    } else if (isTempEmail(email)) {
      errors.push(err('person.email', 'TEMP_EMAIL', 'Email @temp.com interdit.'));
    }
  }
  return person;
}

function validateBusinessKeys(business, errors) {
  for (const key of Object.keys(business || {})) {
    if (BUSINESS_CLIENT_FORBIDDEN.has(key)) {
      errors.push(err(`business.${key}`, 'FORBIDDEN_FIELD', `Champ business interdit : ${key}.`));
    } else if (!BUSINESS_KEYS_ALLOWED.has(key)) {
      errors.push(err(`business.${key}`, 'UNKNOWN_FIELD', `Clé business inconnue : ${key}.`));
    }
  }
}

function validateObjectIdArray(field, values, errors, { max, required = false } = {}) {
  if (values == null) {
    if (required) errors.push(err(field, 'REQUIRED', `${field} requis.`));
    return;
  }
  if (!Array.isArray(values)) {
    errors.push(err(field, 'INVALID', `${field} doit être un tableau.`));
    return;
  }
  if (values.length > max) {
    errors.push(err(field, 'TOO_LONG', `${field} max ${max} éléments.`));
  }
  for (let i = 0; i < values.length; i++) {
    if (!mongoose.Types.ObjectId.isValid(String(values[i]))) {
      errors.push(err(`${field}[${i}]`, 'INVALID', 'ObjectId invalide.'));
    }
  }
}

function validateStringArray(field, values, errors, { max }) {
  if (values == null) return;
  if (!Array.isArray(values)) {
    errors.push(err(field, 'INVALID', `${field} doit être un tableau.`));
    return;
  }
  if (values.length > max) {
    errors.push(err(field, 'TOO_LONG', `${field} max ${max} éléments.`));
  }
  for (let i = 0; i < values.length; i++) {
    const s = values[i];
    if (typeof s !== 'string' || !s.trim()) {
      errors.push(err(`${field}[${i}]`, 'INVALID', 'Chaîne non vide requise.'));
    }
  }
}

function validateBusinessPrestataire(business, errors) {
  if (!business?.serviceId) {
    errors.push(err('business.serviceId', 'REQUIRED', 'serviceId requis pour prestataire.'));
  } else if (!mongoose.Types.ObjectId.isValid(String(business.serviceId))) {
    errors.push(err('business.serviceId', 'INVALID', 'serviceId invalide.'));
  }
}

function validateBusinessFreelance(business, errors) {
  for (const f of ['displayName', 'jobTitle']) {
    if (!business?.[f] || String(business[f]).trim() === '') {
      errors.push(err(`business.${f}`, 'REQUIRED', `${f} requis pour freelance.`));
    }
  }
  if (!business?.categoryId) {
    errors.push(err('business.categoryId', 'REQUIRED', 'categoryId requis pour freelance.'));
  } else if (!mongoose.Types.ObjectId.isValid(String(business.categoryId))) {
    errors.push(err('business.categoryId', 'INVALID', 'categoryId invalide.'));
  }
  validateStringArray('business.skills', business?.skills, errors, { max: MAX_SKILLS });
}

function validateBusinessVendeur(business, errors) {
  for (const f of ['shopName', 'businessType']) {
    if (!business?.[f] || String(business[f]).trim() === '') {
      errors.push(err(`business.${f}`, 'REQUIRED', `${f} requis pour vendeur.`));
    }
  }
  validateObjectIdArray('business.businessCategoryIds', business?.businessCategoryIds, errors, {
    max: MAX_BUSINESS_CATEGORY_IDS,
  });
  validateStringArray('business.productTypeLabels', business?.productTypeLabels, errors, {
    max: MAX_PRODUCT_TYPE_LABELS,
  });
}

export function validateCreatePayload(raw) {
  const errors = [];
  const defaultCountry = 'CI';

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      errors: [err('payload', 'INVALID', 'Payload objet requis.')],
    };
  }

  for (const key of Object.keys(raw)) {
    if (TOP_LEVEL_FORBIDDEN.has(key)) {
      errors.push(err(key, 'FORBIDDEN_FIELD', `Champ interdit : ${key}.`));
    } else if (!TOP_LEVEL_ALLOWED.has(key)) {
      errors.push(err(key, 'UNKNOWN_FIELD', `Champ inconnu : ${key}.`));
    }
  }

  if (raw.schemaVersion !== 1) {
    errors.push(err('schemaVersion', 'INVALID', 'schemaVersion doit être 1.'));
  }

  if (!raw.clientMutationId || !validator.isUUID(String(raw.clientMutationId), 4)) {
    errors.push(err('clientMutationId', 'INVALID', 'clientMutationId UUID v4 requis.'));
  }

  if (raw.operationMutationId && !validator.isUUID(String(raw.operationMutationId), 4)) {
    errors.push(err('operationMutationId', 'INVALID', 'operationMutationId UUID invalide.'));
  }

  if (!PROFESSIONAL_TYPES.includes(raw.professionalType)) {
    errors.push(err('professionalType', 'INVALID', 'professionalType invalide.'));
  }

  if (!raw.consent || raw.consent.recensementAccepted !== true) {
    errors.push(err('consent.recensementAccepted', 'REQUIRED', 'Consentement recensement requis.'));
  }

  if (!raw.consent?.textVersion) {
    errors.push(err('consent.textVersion', 'REQUIRED', 'consent.textVersion requis.'));
  }

  if (!raw.recordedAt) {
    errors.push(err('recordedAt', 'REQUIRED', 'recordedAt requis.'));
  } else if (Number.isNaN(Date.parse(raw.recordedAt))) {
    errors.push(err('recordedAt', 'INVALID', 'recordedAt ISO invalide.'));
  }

  if (!raw.app?.version || raw.app?.buildNumber == null) {
    errors.push(err('app', 'REQUIRED', 'app.version et app.buildNumber requis.'));
  }

  validatePerson(raw.person, errors, defaultCountry);
  validateGps(raw.location, errors);

  const business = raw.business;
  if (!business || typeof business !== 'object') {
    errors.push(err('business', 'REQUIRED', 'business requis.'));
  } else {
    validateBusinessKeys(business, errors);
    if (raw.professionalType === 'prestataire') {
      validateBusinessPrestataire(business, errors);
    } else if (raw.professionalType === 'freelance') {
      validateBusinessFreelance(business, errors);
    } else if (raw.professionalType === 'vendeur') {
      validateBusinessVendeur(business, errors);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, errors: [], value: raw };
}

/**
 * @param {unknown} raw
 * @param {{
 *   findService?: (id: string) => Promise<object|null>,
 *   findCategorie?: (id: string) => Promise<object|null>,
 *   findCategoriesByIds?: (ids: string[]) => Promise<object[]>,
 * }} [deps]
 */
export async function validateCreatePayloadAsync(raw, deps = {}) {
  const base = validateCreatePayload(raw);
  if (!base.ok) return base;

  const value = { ...base.value, business: { ...base.value.business } };
  const errors = [];

  if (value.professionalType === 'prestataire' && deps.findService) {
    const svc = await deps.findService(String(value.business.serviceId));
    if (!svc) {
      errors.push(err('business.serviceId', 'NOT_FOUND', 'Service introuvable.'));
    } else {
      value.business.derivedCategorieId = svc.categorie;
    }
  }

  if (value.professionalType === 'freelance' && deps.findCategorie) {
    const cat = await deps.findCategorie(String(value.business.categoryId));
    if (!cat) {
      errors.push(err('business.categoryId', 'NOT_FOUND', 'Catégorie freelance introuvable.'));
    } else {
      value.business.categoryLabel = cat.nomcategorie;
    }
  }

  if (
    value.professionalType === 'vendeur' &&
    Array.isArray(value.business.businessCategoryIds) &&
    value.business.businessCategoryIds.length > 0 &&
    deps.findCategoriesByIds
  ) {
    const ids = [...new Set(value.business.businessCategoryIds.map(String))];
    const found = await deps.findCategoriesByIds(ids);
    const foundSet = new Set(found.map((c) => String(c._id)));
    for (const id of ids) {
      if (!foundSet.has(id)) {
        errors.push(err('business.businessCategoryIds', 'NOT_FOUND', `Catégorie introuvable: ${id}`));
      }
    }
    value.business.businessCategoryIds = ids;
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, errors: [], value };
}
