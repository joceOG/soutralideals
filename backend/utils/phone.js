/**
 * STAB-07 — Normalisation téléphone E.164 (backend).
 *
 * Règle : jamais déduire le pays d'un numéro national seul.
 * - International (+ / 00) → parse sans defaultCountry
 * - National → defaultCountry OBLIGATOIRE (ISO 3166-1 alpha-2)
 */
import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
} from 'libphonenumber-js';

export class PhoneValidationError extends Error {
  constructor(message = 'Numéro de téléphone invalide pour le pays sélectionné.') {
    super(message);
    this.name = 'PhoneValidationError';
    this.code = 'INVALID_PHONE';
  }
}

/**
 * Prépare la chaîne brute (espaces/tirets → 00 → +).
 * Ne déduit aucun pays.
 */
export function preprocessPhoneInput(raw) {
  if (raw == null) return '';
  let s = String(raw).trim().replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  return s;
}

/**
 * Indique si la saisie est déjà internationale (+ ou 00).
 */
export function isInternationalInput(raw) {
  const s = String(raw ?? '').trim();
  return s.startsWith('+') || s.startsWith('00');
}

/**
 * Parse + valide + retourne E.164 (+<cc><national>).
 *
 * @param {string} raw
 * @param {{ defaultCountry?: string, allowInvalid?: boolean }} [options]
 * @returns {{ e164: string, country: string|undefined, nationalNumber: string }}
 * @throws {PhoneValidationError}
 */
export function canonicalizePhone(raw, options = {}) {
  const { defaultCountry, allowInvalid = false } = options;
  const cleaned = preprocessPhoneInput(raw);

  if (!cleaned) {
    throw new PhoneValidationError(
      'Numéro de téléphone invalide pour le pays sélectionné.',
    );
  }

  const international = cleaned.startsWith('+');
  if (!international && !defaultCountry) {
    throw new PhoneValidationError(
      'Numéro de téléphone invalide pour le pays sélectionné.',
    );
  }

  const countryHint =
    !international && defaultCountry
      ? String(defaultCountry).toUpperCase()
      : undefined;

  let phone;
  try {
    phone = countryHint
      ? parsePhoneNumberFromString(cleaned, countryHint)
      : parsePhoneNumberFromString(cleaned);
  } catch (_) {
    throw new PhoneValidationError(
      'Numéro de téléphone invalide pour le pays sélectionné.',
    );
  }

  if (!phone) {
    throw new PhoneValidationError(
      'Numéro de téléphone invalide pour le pays sélectionné.',
    );
  }

  if (!allowInvalid) {
    const valid = countryHint
      ? isValidPhoneNumber(cleaned, countryHint)
      : isValidPhoneNumber(cleaned);
    if (!valid || !phone.isValid()) {
      throw new PhoneValidationError(
        'Numéro de téléphone invalide pour le pays sélectionné.',
      );
    }
  }

  const e164 = phone.format('E.164');
  // Canonique : pas d'espaces / tirets / 00
  if (!/^\+[1-9]\d{6,14}$/.test(e164)) {
    throw new PhoneValidationError(
      'Numéro de téléphone invalide pour le pays sélectionné.',
    );
  }

  return {
    e164,
    country: phone.country,
    nationalNumber: phone.nationalNumber,
  };
}

/**
 * Compat otpService / controllers : retourne E.164 ou "".
 * @param {string} raw
 * @param {string} [defaultCountry] ISO country (ex: 'TN', 'CI')
 */
export function normalizePhone(raw, defaultCountry) {
  if (raw == null || String(raw).trim() === '') return '';
  try {
    const opts = {};
    if (defaultCountry) opts.defaultCountry = defaultCountry;
    // Si international, pas besoin de pays
    if (!isInternationalInput(raw) && !defaultCountry) {
      // Ancien comportement CI retiré — refus sans contexte
      return '';
    }
    return canonicalizePhone(raw, opts).e164;
  } catch (_) {
    return '';
  }
}

/**
 * Normalise pour login : email inchangé ; téléphone → E.164 si possible.
 * Accepte formats alternatifs d'un numéro déjà en base.
 *
 * @param {string} identifiant
 * @param {string} [defaultCountry]
 * @returns {string} email OU e164 OU identifiant trimmé
 */
export function normalizeLoginIdentifiant(identifiant, defaultCountry) {
  const id = String(identifiant ?? '').trim();
  if (!id) return '';
  if (id.includes('@')) return id.toLowerCase();

  try {
    const opts = {};
    if (defaultCountry) opts.defaultCountry = defaultCountry;
    if (isInternationalInput(id)) {
      return canonicalizePhone(id).e164;
    }
    if (defaultCountry) {
      return canonicalizePhone(id, opts).e164;
    }
    // National sans pays : ne pas inventer +225 — laisser tel quel
    // (le login échouera proprement si non trouvé)
    return id;
  } catch (_) {
    return id;
  }
}

/**
 * Proposition de migration (dry-run) pour un numéro stocké.
 * Ne déduit le pays que si le numéro est déjà international valide.
 *
 * @param {string} current
 * @returns {{ current, proposed, status, country, reason }}
 */
export function proposePhoneMigration(current) {
  const raw = String(current ?? '').trim();
  if (!raw) {
    return {
      current: raw,
      proposed: null,
      status: 'invalid',
      country: null,
      reason: 'vide',
    };
  }

  if (isInternationalInput(raw)) {
    try {
      const { e164, country } = canonicalizePhone(raw);
      // Comparer à la forme stockée sans espaces/tirets seulement
      const compactStored = String(raw).trim().replace(/[\s\-().]/g, '');
      const status = e164 === compactStored ? 'ok' : 'normalize';
      return {
        current: raw,
        proposed: e164,
        status,
        country: country ?? null,
        reason: 'international_parse',
      };
    } catch (_) {
      return {
        current: raw,
        proposed: null,
        status: 'invalid',
        country: null,
        reason: 'international_invalid',
      };
    }
  }

  // National seul : ambigu — ne pas écrire automatiquement
  return {
    current: raw,
    proposed: null,
    status: 'ambiguous',
    country: null,
    reason: 'national_without_country',
  };
}
