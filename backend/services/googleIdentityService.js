/**
 * STAB-12E — Résolution Google vs compte local (sans liaison silencieuse par email).
 */
import Utilisateur from '../models/utilisateurModel.js';
import { normalizeEmail } from '../utils/emailIdentity.js';

export const GOOGLE_IDENTITY_STATUS = Object.freeze({
  KNOWN_GOOGLE: 'KNOWN_GOOGLE',
  NEW: 'NEW',
  ACCOUNT_LINK_REQUIRED: 'ACCOUNT_LINK_REQUIRED',
  GOOGLE_ID_MISMATCH: 'GOOGLE_ID_MISMATCH',
});

/**
 * 1. Recherche par googleId (sub).
 * 2. Sinon email uniquement pour détecter un conflit — jamais pour fusionner.
 *
 * @param {{ googleId: string, email: string }} profile
 * @param {typeof Utilisateur} [Model]
 */
export async function resolveGoogleIdentity(profile, Model = Utilisateur) {
  const byGoogleId = await Model.findOne({ googleId: profile.googleId });
  if (byGoogleId) {
    return { status: GOOGLE_IDENTITY_STATUS.KNOWN_GOOGLE, user: byGoogleId };
  }

  const emailNorm = normalizeEmail(profile.email);
  const byEmail = emailNorm
    ? await Model.findOne({ email: emailNorm })
    : null;
  if (!byEmail) {
    return { status: GOOGLE_IDENTITY_STATUS.NEW, user: null };
  }

  if (!byEmail.googleId) {
    return {
      status: GOOGLE_IDENTITY_STATUS.ACCOUNT_LINK_REQUIRED,
      user: byEmail,
    };
  }

  if (byEmail.googleId !== profile.googleId) {
    return {
      status: GOOGLE_IDENTITY_STATUS.GOOGLE_ID_MISMATCH,
      user: byEmail,
    };
  }

  return { status: GOOGLE_IDENTITY_STATUS.KNOWN_GOOGLE, user: byEmail };
}

export function accountLinkRequiredPayload() {
  return {
    error:
      'Un compte existe déjà avec cette adresse email. Connectez-vous avec votre email et votre mot de passe.',
    code: 'ACCOUNT_LINK_REQUIRED',
    message:
      'Un compte existe déjà avec cette adresse email. Connectez-vous avec votre email et votre mot de passe.',
    hint: 'Vous pourrez associer Google à votre compte après connexion.',
  };
}

export function googleIdMismatchPayload() {
  return {
    error:
      'Ce compte Google ne correspond pas au compte Soutrali associé à cette adresse email.',
    code: 'GOOGLE_ID_MISMATCH',
    message:
      'Ce compte Google ne correspond pas au compte Soutrali associé à cette adresse email.',
  };
}
