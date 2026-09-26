/**
 * DASH-8E.2.1 — Pause volontaire vs suspension admin (Prestataire self-service).
 */
import mongoose from 'mongoose';

export class PrestatairePauseTransitionError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function canOwnerDeactivate(prestataire) {
  if (!prestataire) {
    throw new PrestatairePauseTransitionError(404, 'PRESTATAIRE_NOT_FOUND', 'Prestataire non trouvé');
  }
  if (prestataire.ownerSelfPaused === true) {
    return { idempotent: true };
  }
  if (prestataire.status === 'rejected') {
    throw new PrestatairePauseTransitionError(
      409,
      'INVALID_PROFESSIONAL_STATE_TRANSITION',
      'Profil rejeté — désactivation impossible.',
    );
  }
  if (prestataire.status === 'suspended' && prestataire.ownerSelfPaused !== true) {
    throw new PrestatairePauseTransitionError(
      409,
      'INVALID_PROFESSIONAL_STATE_TRANSITION',
      'Profil suspendu administrativement.',
    );
  }
  if (prestataire.status !== 'active' || prestataire.verifier !== true) {
    throw new PrestatairePauseTransitionError(
      409,
      'INVALID_PROFESSIONAL_STATE_TRANSITION',
      'Seul un profil actif et vérifié peut être désactivé volontairement.',
    );
  }
  return { idempotent: false };
}

export function applyOwnerDeactivate(prestataire) {
  prestataire.ownerSelfPaused = true;
  prestataire.disponible = false;
}

export function canOwnerReactivate(prestataire) {
  if (!prestataire) {
    throw new PrestatairePauseTransitionError(404, 'PRESTATAIRE_NOT_FOUND', 'Prestataire non trouvé');
  }
  if (prestataire.status === 'rejected') {
    throw new PrestatairePauseTransitionError(
      403,
      'PROFESSIONAL_REACTIVATION_FORBIDDEN',
      'Profil rejeté — contactez le support pour une nouvelle validation.',
    );
  }
  if (prestataire.status === 'pending' || prestataire.status === 'incomplete') {
    throw new PrestatairePauseTransitionError(
      409,
      'INVALID_PROFESSIONAL_STATE_TRANSITION',
      'Profil en cours de modération — réactivation self-service impossible.',
    );
  }
  if (prestataire.status === 'suspended' && prestataire.ownerSelfPaused !== true) {
    throw new PrestatairePauseTransitionError(
      403,
      'PROFESSIONAL_REACTIVATION_FORBIDDEN',
      'Suspension administrative — réactivation self-service impossible.',
    );
  }
  if (prestataire.verifier !== true) {
    throw new PrestatairePauseTransitionError(
      403,
      'PROFESSIONAL_REACTIVATION_FORBIDDEN',
      'Vérification requise avant réactivation.',
    );
  }
  if (prestataire.ownerSelfPaused !== true) {
    if (prestataire.status === 'active') {
      return { idempotent: true };
    }
    throw new PrestatairePauseTransitionError(
      409,
      'INVALID_PROFESSIONAL_STATE_TRANSITION',
      'Aucune pause volontaire à lever.',
    );
  }
  return { idempotent: false };
}

export function applyOwnerReactivate(prestataire) {
  prestataire.ownerSelfPaused = false;
  prestataire.disponible = true;
}

export function assertPrestataireRouteId(id) {
  if (
    !id ||
    !mongoose.Types.ObjectId.isValid(String(id)) ||
    String(new mongoose.Types.ObjectId(String(id))) !== String(id)
  ) {
    throw new PrestatairePauseTransitionError(400, 'PRESTATAIRE_ID_INVALID', 'ID invalide');
  }
}
