/**
 * STAB-12D — Identité téléphone : pending vs vérifié.
 * Un numéro non prouvé par OTP ne doit jamais bloquer le vrai propriétaire.
 */
import Utilisateur from '../models/utilisateurModel.js';

/** Propriétaire vérifié d'un numéro E.164 (identité canonique). */
export async function findVerifiedPhoneOwner(e164) {
  if (!e164) return null;
  return Utilisateur.findOne({
    telephone: e164,
    telephoneVerified: true,
  });
}

/** Retire pendingTelephone obsolète chez les autres comptes après vérification OTP. */
export async function clearStalePendingPhone(e164, excludeUserId) {
  if (!e164) return;
  await Utilisateur.updateMany(
    {
      pendingTelephone: e164,
      ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
    },
    { $unset: { pendingTelephone: '' } },
  );
}

/**
 * Résout stockage téléphone à l'inscription.
 * @returns {{ telephone?: string, pendingTelephone?: string, telephoneVerified: boolean }}
 */
export function resolveDeferredSignupPhone({
  normalizedPhone,
  phoneVerificationToken,
  usePendingStorage,
}) {
  if (!normalizedPhone) {
    return { telephoneVerified: false };
  }

  if (phoneVerificationToken) {
    return {
      telephone: normalizedPhone,
      telephoneVerified: true,
    };
  }

  if (usePendingStorage) {
    return {
      pendingTelephone: normalizedPhone,
      telephoneVerified: false,
    };
  }

  // Legacy OTP_REQUIRED=false (hors mode deferred explicite)
  return {
    telephone: normalizedPhone,
    telephoneVerified: false,
  };
}
