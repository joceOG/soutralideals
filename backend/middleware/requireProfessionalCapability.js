/**
 * DASH-8E.2 — Autorisation fondée sur profils réels (read-only, pas de confiance JWT pro).
 */
import { isAdmin } from './entityAccess.js';
import {
  resolveProfessionalCapabilities,
  PROFESSIONAL_CAPABILITY_LABELS,
} from '../services/professionalCapabilitiesService.js';

const VALID_TYPES = new Set(PROFESSIONAL_CAPABILITY_LABELS);

function profileKeyForType(profileType) {
  if (profileType === 'Prestataire') return 'prestataire';
  if (profileType === 'Freelance') return 'freelance';
  if (profileType === 'Vendeur') return 'vendeur';
  return null;
}

function hasDuplicateConflict(resolved, profileType) {
  return resolved.inconsistencies.some(
    (item) =>
      item &&
      typeof item === 'object' &&
      item.code === 'MULTIPLE_PROFILES_OF_SAME_TYPE' &&
      item.profileType === profileType,
  );
}

async function getResolvedForRequest(req) {
  if (req._professionalCapabilitiesResolved) {
    return req._professionalCapabilitiesResolved;
  }
  const resolved = await resolveProfessionalCapabilities(req.utilisateur._id);
  req._professionalCapabilitiesResolved = resolved;
  return resolved;
}

/**
 * @param {'Prestataire'|'Freelance'|'Vendeur'} profileType
 * @param {{ requireOperational?: boolean, allowAdmin?: boolean }} [options]
 */
export function requireProfessionalCapability(profileType, options = {}) {
  const requireOperational = options.requireOperational !== false;
  const allowAdmin = options.allowAdmin === true;

  return async (req, res, next) => {
    try {
      if (!req.utilisateur?._id) {
        return res.status(401).json({
          success: false,
          code: 'AUTH_REQUIRED',
          message: 'Authentification requise.',
        });
      }

      if (!VALID_TYPES.has(profileType)) {
        return res.status(500).json({
          success: false,
          code: 'SERVER_MISCONFIGURATION',
          message: 'Configuration serveur incorrecte.',
        });
      }

      if (allowAdmin && isAdmin(req)) {
        return next();
      }

      const resolved = await getResolvedForRequest(req);
      const key = profileKeyForType(profileType);
      const internal = resolved.profilesInternal?.[key];
      const publicProfile = resolved.profiles?.[key];

      if (hasDuplicateConflict(resolved, profileType)) {
        return res.status(403).json({
          success: false,
          code: 'PROFESSIONAL_PROFILE_CONFLICT',
          message: 'Plusieurs profils professionnels du même type nécessitent une régularisation.',
        });
      }

      if (!internal?.exists) {
        return res.status(403).json({
          success: false,
          code: 'PROFESSIONAL_PROFILE_REQUIRED',
          message: 'Un profil professionnel correspondant est requis.',
        });
      }

      if (requireOperational && !internal.canOperate) {
        return res.status(403).json({
          success: false,
          code: 'PROFESSIONAL_PROFILE_NOT_OPERATIONAL',
          message: "Ce profil professionnel n'est pas autorisé à exercer.",
        });
      }

      req.professionalAccess = {
        profileType,
        exists: Boolean(publicProfile?.exists),
        status: publicProfile?.status ?? null,
        canOperate: Boolean(internal.canOperate),
      };

      return next();
    } catch (err) {
      if (err.status === 404) {
        return res.status(404).json({
          success: false,
          code: err.code || 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable.',
        });
      }
      if (err.status === 400) {
        return res.status(400).json({
          success: false,
          code: err.code || 'USER_ID_INVALID',
          message: err.message,
        });
      }
      console.error('requireProfessionalCapability:', err.message);
      return res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Erreur serveur.',
      });
    }
  };
}

export default requireProfessionalCapability;

/**
 * DASH-8E.2.1 — Désactivation self-service : opérationnel ou déjà en pause volontaire (idempotence).
 */
export function requirePrestataireSelfDeactivateGate() {
  return async (req, res, next) => {
    try {
      if (!req.utilisateur?._id) {
        return res.status(401).json({
          success: false,
          code: 'AUTH_REQUIRED',
          message: 'Authentification requise.',
        });
      }

      const resolved = await getResolvedForRequest(req);
      if (hasDuplicateConflict(resolved, 'Prestataire')) {
        return res.status(403).json({
          success: false,
          code: 'PROFESSIONAL_PROFILE_CONFLICT',
          message: 'Plusieurs profils professionnels du même type nécessitent une régularisation.',
        });
      }

      const internal = resolved.profilesInternal?.prestataire;
      if (!internal?.exists) {
        return res.status(403).json({
          success: false,
          code: 'PROFESSIONAL_PROFILE_REQUIRED',
          message: 'Un profil professionnel correspondant est requis.',
        });
      }

      if (internal.canOperate) {
        req.professionalAccess = {
          profileType: 'Prestataire',
          exists: true,
          status: resolved.profiles.prestataire.status,
          canOperate: true,
        };
        return next();
      }

      const prestataireModel = (await import('../models/prestataireModel.js')).default;
      const doc = await prestataireModel.findById(req.params.id).select('ownerSelfPaused').lean();
      if (doc?.ownerSelfPaused === true) {
        req.professionalAccess = {
          profileType: 'Prestataire',
          exists: true,
          status: resolved.profiles.prestataire.status,
          canOperate: false,
        };
        return next();
      }

      return res.status(403).json({
        success: false,
        code: 'PROFESSIONAL_PROFILE_NOT_OPERATIONAL',
        message: "Ce profil professionnel n'est pas autorisé à exercer.",
      });
    } catch (err) {
      console.error('requirePrestataireSelfDeactivateGate:', err.message);
      return res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        message: 'Erreur serveur.',
      });
    }
  };
}
