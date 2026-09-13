/**
 * R1-02 — Correspondance utilisateur FieldRecensement (LECTURE SEULE).
 *
 * Ne crée / ne modifie / ne vérifie jamais un compte.
 * Ne produit matchedUtilisateurId que pour un téléphone vérifié unique et admissible.
 * Email : aucun indicateur emailVerified dans Utilisateur → jamais verified_match par email seul.
 */
import validator from 'validator';
import Utilisateur from '../models/utilisateurModel.js';
import { normalizeEmail } from '../utils/emailIdentity.js';
import {
  canonicalizePhone,
  isInternationalInput,
  normalizePhone,
  PhoneValidationError,
} from '../utils/phone.js';

const MATCH_SELECT = '_id telephone telephoneVerified email isActive deactivatedAt';

/** @typedef {'none'|'verified_match'|'ambiguous'|'conflict'|'blocked_candidate'|'unverified_signal'|'validation_error'} MatchStatus */

/**
 * @returns {{
 *   status: MatchStatus,
 *   matchedUtilisateurId: import('mongoose').Types.ObjectId|null,
 *   confidence: null|'verified_phone'|'verified_email'|'verified_phone_and_email',
 *   reasonCodes: string[],
 * }}
 */
function result(status, extras = {}) {
  return {
    status,
    matchedUtilisateurId: extras.matchedUtilisateurId ?? null,
    confidence: extras.confidence ?? null,
    reasonCodes: extras.reasonCodes ?? [],
  };
}

export function isTempEmail(email) {
  const n = normalizeEmail(email);
  return Boolean(n && n.endsWith('@temp.com'));
}

/**
 * Variantes de lookup limitées pour un E.164 déjà canonique (legacy safe).
 * Pas de fuzzy / derniers chiffres.
 * @param {string} e164
 * @returns {string[]}
 */
export function buildSafePhoneLookupVariants(e164) {
  if (!e164 || !e164.startsWith('+')) return e164 ? [e164] : [];
  const digits = e164.slice(1);
  const variants = new Set([e164, `00${digits}`]);
  // CI : espaces courants autour de l’indicatif
  if (e164.startsWith('+225') && digits.length >= 12) {
    const nn = digits.slice(3);
    variants.add(`+225 ${nn}`);
    if (nn.length === 10) {
      variants.add(`+225 ${nn.slice(0, 2)} ${nn.slice(2, 4)} ${nn.slice(4, 6)} ${nn.slice(6, 8)} ${nn.slice(8, 10)}`);
    }
  }
  return [...variants];
}

/**
 * Normalise l’entrée téléphone pour matching.
 * @returns {{ e164: string|null, error: string|null }}
 */
export function normalizeMatcherPhone(raw, defaultCountry = 'CI') {
  if (raw == null || String(raw).trim() === '') {
    return { e164: null, error: null };
  }
  try {
    const opts = {};
    if (!isInternationalInput(raw)) {
      opts.defaultCountry = defaultCountry || 'CI';
    }
    const { e164 } = canonicalizePhone(raw, opts);
    return { e164, error: null };
  } catch (err) {
    if (err instanceof PhoneValidationError || err?.code === 'INVALID_PHONE') {
      return { e164: null, error: 'INVALID_PHONE' };
    }
    // Tentative soft via normalizePhone
    const soft = normalizePhone(raw, defaultCountry || 'CI');
    if (soft) return { e164: soft, error: null };
    return { e164: null, error: 'INVALID_PHONE' };
  }
}

function normalizeMatcherEmail(raw) {
  if (raw == null || String(raw).trim() === '') {
    return { email: null, error: null, ignored: false };
  }
  const n = normalizeEmail(raw);
  if (!n) return { email: null, error: 'INVALID_EMAIL', ignored: false };
  if (n.endsWith('@temp.com')) {
    return { email: null, error: null, ignored: true, reason: 'TEMP_EMAIL_IGNORED' };
  }
  if (!validator.isEmail(n)) {
    return { email: null, error: 'INVALID_EMAIL', ignored: false };
  }
  return { email: n, error: null, ignored: false };
}

function isBlockedAccount(user) {
  if (!user) return false;
  if (user.isActive === false) return true;
  return false;
}

/**
 * Projection publique pour futurs agents — anti-énumération.
 * Ne révèle jamais l’existence d’un compte.
 */
export function toAgentSafeMatchResult(_internalResult) {
  return {
    matchStatus: 'no_public_information',
  };
}

/**
 * Correspondance interne lecture seule.
 * @param {{ telephone?: string|null, email?: string|null, defaultCountry?: string }} input
 */
export async function matchFieldRecensementUser(input = {}) {
  const reasonCodes = [];
  const phoneIn = input.telephone;
  const emailIn = input.email;
  const defaultCountry = input.defaultCountry || 'CI';

  const hasPhone = phoneIn != null && String(phoneIn).trim() !== '';
  const hasEmail = emailIn != null && String(emailIn).trim() !== '';

  if (!hasPhone && !hasEmail) {
    return result('validation_error', { reasonCodes: ['MISSING_CONTACT'] });
  }

  const phoneNorm = hasPhone
    ? normalizeMatcherPhone(phoneIn, defaultCountry)
    : { e164: null, error: null };
  const emailNorm = hasEmail
    ? normalizeMatcherEmail(emailIn)
    : { email: null, error: null, ignored: false };

  if (hasPhone && phoneNorm.error && !hasEmail) {
    return result('validation_error', { reasonCodes: [phoneNorm.error] });
  }
  if (hasEmail && emailNorm.error && !hasPhone) {
    return result('validation_error', { reasonCodes: [emailNorm.error] });
  }
  if (hasPhone && phoneNorm.error) reasonCodes.push(phoneNorm.error);
  if (hasEmail && emailNorm.error) reasonCodes.push(emailNorm.error);
  if (emailNorm.ignored) reasonCodes.push(emailNorm.reason || 'TEMP_EMAIL_IGNORED');

  // Si téléphone fourni mais invalide et email aussi invalide/absent → validation
  if (hasPhone && !phoneNorm.e164 && hasEmail && !emailNorm.email && !emailNorm.ignored) {
    return result('validation_error', {
      reasonCodes: [...new Set([...reasonCodes, phoneNorm.error || 'INVALID_PHONE'])].filter(Boolean),
    });
  }

  /** @type {object|null} */
  let phoneMatch = null;
  /** @type {'verified_match'|'ambiguous'|'blocked_candidate'|'unverified_signal'|null} */
  let phoneOutcome = null;

  if (phoneNorm.e164) {
    const variants = buildSafePhoneLookupVariants(phoneNorm.e164);
    const verified = await Utilisateur.find({
      telephone: { $in: variants },
      telephoneVerified: true,
    })
      .select(MATCH_SELECT)
      .lean();

    // Filtre : téléphone stocké normalisé équivalent (évite faux positifs variantes)
    const verifiedExact = verified.filter((u) => {
      if (!u.telephone) return false;
      if (u.telephone === phoneNorm.e164) return true;
      try {
        const stored = normalizeMatcherPhone(u.telephone, defaultCountry).e164;
        return stored === phoneNorm.e164;
      } catch {
        return false;
      }
    });

    if (verifiedExact.length > 1) {
      phoneOutcome = 'ambiguous';
      reasonCodes.push('AMBIGUOUS_VERIFIED_PHONE');
    } else if (verifiedExact.length === 1) {
      const u = verifiedExact[0];
      if (isBlockedAccount(u)) {
        phoneOutcome = 'blocked_candidate';
        reasonCodes.push('BLOCKED_OR_INACTIVE_ACCOUNT');
      } else {
        phoneMatch = u;
        phoneOutcome = 'verified_match';
        reasonCodes.push('VERIFIED_PHONE_UNIQUE');
      }
    } else {
      // Présent mais non vérifié ?
      const unverified = await Utilisateur.find({
        telephone: { $in: variants },
        telephoneVerified: { $ne: true },
      })
        .select(MATCH_SELECT)
        .lean()
        .limit(5);

      const unverifiedExact = unverified.filter((u) => {
        if (!u.telephone) return false;
        if (u.telephone === phoneNorm.e164) return true;
        const stored = normalizeMatcherPhone(u.telephone, defaultCountry).e164;
        return stored === phoneNorm.e164;
      });

      if (unverifiedExact.length > 0) {
        phoneOutcome = 'unverified_signal';
        reasonCodes.push('PHONE_PRESENT_UNVERIFIED');
      }
    }
  }

  /** @type {object|null} */
  let emailOwner = null;
  if (emailNorm.email) {
    // Pas d’emailVerified dans le modèle — signal non liant uniquement
    const emailUsers = await Utilisateur.find({ email: emailNorm.email })
      .select(MATCH_SELECT)
      .lean();

    if (emailUsers.length > 1) {
      reasonCodes.push('AMBIGUOUS_EMAIL');
    } else if (emailUsers.length === 1) {
      emailOwner = emailUsers[0];
      reasonCodes.push('EMAIL_CANDIDATE_UNVERIFIED');
      // Jamais verified_match par email seul (absence de preuve de vérification)
    }
  }

  // Conflit : téléphone vérifié → A, email unique → B≠A
  if (phoneMatch && emailOwner && String(phoneMatch._id) !== String(emailOwner._id)) {
    return result('conflict', {
      reasonCodes: [...reasonCodes, 'PHONE_EMAIL_DIFFERENT_USERS'],
    });
  }

  if (phoneOutcome === 'ambiguous') {
    return result('ambiguous', { reasonCodes });
  }

  if (phoneOutcome === 'blocked_candidate') {
    return result('blocked_candidate', { reasonCodes });
  }

  if (phoneMatch && phoneOutcome === 'verified_match') {
    // Email sans preuve de vérif → confidence reste verified_phone
    return result('verified_match', {
      matchedUtilisateurId: phoneMatch._id,
      confidence: 'verified_phone',
      reasonCodes,
    });
  }

  if (phoneOutcome === 'unverified_signal' && !emailOwner) {
    return result('unverified_signal', { reasonCodes });
  }

  if (emailOwner && !phoneMatch) {
    // Email seul : jamais de lien auto
    return result('unverified_signal', { reasonCodes });
  }

  if (reasonCodes.includes('INVALID_PHONE') && !phoneNorm.e164 && !emailNorm.email) {
    return result('validation_error', { reasonCodes });
  }

  return result('none', { reasonCodes });
}

export default matchFieldRecensementUser;
