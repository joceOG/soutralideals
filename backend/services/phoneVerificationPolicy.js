/**
 * STAB-12D — Politique de vérification téléphone (autorité backend).
 *
 * PHONE_VERIFICATION_MODE=required|deferred
 * - required : comportement STAB-08/09 (OTP bloquant inscription + Google)
 * - deferred : bêta Google Play — comptes telephoneVerified=false autorisés
 *
 * Legacy (PHONE_VERIFICATION_MODE absent) :
 * - inscription : OTP_REQUIRED=true/false
 * - Google : toujours téléphone requis (STAB-09)
 */

export const PHONE_VERIFICATION_MODES = Object.freeze(['required', 'deferred']);

/** @returns {'required'|'deferred'|null} null = legacy */
export function getPhoneVerificationMode() {
  const explicit = process.env.PHONE_VERIFICATION_MODE?.trim().toLowerCase();
  if (explicit === 'deferred' || explicit === 'required') return explicit;
  return null;
}

export function isPhoneVerificationRequiredForSignup() {
  const mode = getPhoneVerificationMode();
  if (mode === 'deferred') return false;
  if (mode === 'required') return true;
  return process.env.OTP_REQUIRED === 'true';
}

export function isPhoneVerificationRequiredForGoogle() {
  const mode = getPhoneVerificationMode();
  if (mode === 'deferred') return false;
  if (mode === 'required') return true;
  return true;
}

/**
 * Opérations sensibles nécessitant telephoneVerified=true.
 * Bêta : ne bloque pas catalogue, panier, messagerie, profils, etc.
 */
const VERIFIED_PHONE_ACTIONS = new Set([
  'wallet_withdraw',
  'wallet_transfer',
  'payment_checkout',
]);

export function requiresVerifiedPhone(action) {
  if (!action || typeof action !== 'string') return false;
  return VERIFIED_PHONE_ACTIONS.has(action.trim().toLowerCase());
}

export function getPublicPhoneVerificationConfig() {
  const mode = getPhoneVerificationMode();
  return {
    mode: mode ?? (process.env.OTP_REQUIRED === 'true' ? 'required' : 'legacy'),
    signupRequiresOtp: isPhoneVerificationRequiredForSignup(),
    googleRequiresPhone: isPhoneVerificationRequiredForGoogle(),
  };
}
