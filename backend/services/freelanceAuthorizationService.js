/**
 * DASH-8E.3B — Autorisation Freelance : profil vs exercice (read-only).
 */
import { resolveProfessionalCapabilities } from './professionalCapabilitiesService.js';

export const FREELANCE_OWNER_PROFILE_FIELDS = Object.freeze([
  'name',
  'job',
  'category',
  'hourlyRate',
  'description',
  'location',
  'phoneNumber',
  'experienceLevel',
  'availabilityStatus',
  'workingHours',
  'skills',
  'preferredCategories',
  'minimumProjectBudget',
  'maxProjectsPerMonth',
  'portfolioItems',
]);

export const FREELANCE_ADMIN_MODERATION_FIELDS = Object.freeze([
  'isTopRated',
  'isFeatured',
  'accountStatus',
  'status',
  'isVerified',
]);

export class FreelanceAuthorizationError extends Error {
  constructor(code, httpStatus, message) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function isAdminUser(user) {
  return String(user?.role || '').toUpperCase() === 'ADMIN';
}

export function isFreelanceProfileOwner(utilisateur, freelance) {
  if (!utilisateur?._id || !freelance?.utilisateur) return false;
  return freelance.utilisateur.toString() === utilisateur._id.toString();
}

/**
 * Modification profil (pending / correction autorisée sans canOperate).
 */
export async function authorizeFreelanceProfileUpdate({ utilisateur, freelance, payload, isAdmin }) {
  if (!freelance) {
    throw new FreelanceAuthorizationError('RESOURCE_ACCESS_FORBIDDEN', 404, 'Freelance introuvable.');
  }

  if (!isAdmin && !isFreelanceProfileOwner(utilisateur, freelance)) {
    throw new FreelanceAuthorizationError(
      'RESOURCE_ACCESS_FORBIDDEN',
      403,
      'Accès refusé à ce profil.',
    );
  }

  const caps = await resolveProfessionalCapabilities(utilisateur._id);
  const dup = caps.inconsistencies?.some(
    (i) => i?.code === 'MULTIPLE_PROFILES_OF_SAME_TYPE' && i.profileType === 'Freelance',
  );
  if (dup && !isAdmin) {
    throw new FreelanceAuthorizationError(
      'PROFESSIONAL_PROFILE_CONFLICT',
      403,
      'Conflit profil Freelance.',
    );
  }

  const allowed = isAdmin
    ? [...FREELANCE_OWNER_PROFILE_FIELDS, ...FREELANCE_ADMIN_MODERATION_FIELDS]
    : [...FREELANCE_OWNER_PROFILE_FIELDS];

  const forbidden = Object.keys(payload).filter(
    (k) => payload[k] !== undefined && !allowed.includes(k),
  );
  if (forbidden.length) {
    throw new FreelanceAuthorizationError(
      'UPDATE_FIELD_FORBIDDEN',
      403,
      'Champ non autorisé.',
    );
  }

  const internal = caps.profilesInternal?.freelance;
  if (!isAdmin && !internal?.exists) {
    throw new FreelanceAuthorizationError(
      'PROFESSIONAL_PROFILE_REQUIRED',
      403,
      'Profil Freelance requis.',
    );
  }

  return { actor: isAdmin ? 'admin' : 'freelance', allowedFields: allowed };
}

/**
 * Offre / activité commerciale (exercice) — canOperate obligatoire.
 */
export async function authorizeFreelanceServiceExercise({ utilisateur, freelance, operation, isAdmin }) {
  if (!freelance) {
    throw new FreelanceAuthorizationError('RESOURCE_ACCESS_FORBIDDEN', 404, 'Freelance introuvable.');
  }

  if (!isAdmin && !isFreelanceProfileOwner(utilisateur, freelance)) {
    throw new FreelanceAuthorizationError(
      'RESOURCE_ACCESS_FORBIDDEN',
      403,
      'Accès refusé.',
    );
  }

  const caps = await resolveProfessionalCapabilities(utilisateur._id);
  const internal = caps.profilesInternal?.freelance;
  const dup = caps.inconsistencies?.some(
    (i) => i?.code === 'MULTIPLE_PROFILES_OF_SAME_TYPE' && i.profileType === 'Freelance',
  );

  if (dup) {
    throw new FreelanceAuthorizationError(
      'PROFESSIONAL_PROFILE_CONFLICT',
      403,
      'Conflit profil Freelance.',
    );
  }

  if (!isAdmin) {
    if (!internal?.exists) {
      throw new FreelanceAuthorizationError(
        'PROFESSIONAL_PROFILE_REQUIRED',
        403,
        'Profil Freelance requis.',
      );
    }
    if (!internal.canOperate) {
      throw new FreelanceAuthorizationError(
        'PROFESSIONAL_PROFILE_NOT_OPERATIONAL',
        403,
        "Ce profil Freelance n'est pas autorisé à exercer.",
      );
    }
  }

  return { actor: isAdmin ? 'admin' : 'freelance', operation };
}
