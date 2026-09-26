import fs from 'fs';
import prestataireModel from '../models/prestataireModel.js';
import {
  isAdmin,
  isSelf,
  isStrictObjectId,
} from './entityAccess.js';
import {
  isRecensementRequest,
  userCanCreateRecensement,
} from '../utils/recensementPolicy.js';

/** Champs fichiers autorisés (alignés Multer prestataireRoutes). */
export const PRESTATAIRE_UPLOAD_FIELD_NAMES = new Set([
  'cni1',
  'cni2',
  'selfie',
  'diplomeCertificat',
  'attestationAssurance',
]);

export function cleanupMulterFiles(files) {
  if (!files || typeof files !== 'object') return;
  for (const arr of Object.values(files)) {
    if (!Array.isArray(arr)) continue;
    for (const f of arr) {
      if (f?.path) {
        try {
          fs.unlinkSync(f.path);
        } catch {
          /* temp déjà supprimé */
        }
      }
    }
  }
}

/**
 * POST /prestataire — avant Multer.
 * Admin : OK sans lire le body.
 * Recensement autorisé : OK.
 * Self-service : JWT suffit (utilisateur forcé côté contrôleur).
 */
export function requirePrestataireCreatePreUpload(req, res, next) {
  if (isAdmin(req)) return next();
  if (isRecensementRequest(req)) {
    if (userCanCreateRecensement(req.utilisateur)) return next();
    return res.status(403).json({
      error: 'Accès refusé : permission de recensement requise.',
    });
  }
  return next();
}

/**
 * POST — après Multer, avant contrôleur (donc avant Cloudinary).
 * Rejette l’usurpation du champ `utilisateur` par un non-Admin.
 */
export function requirePrestataireCreatePostUpload(req, res, next) {
  if (isAdmin(req)) return next();

  if (isRecensementRequest(req)) {
    if (userCanCreateRecensement(req.utilisateur)) return next();
    cleanupMulterFiles(req.files);
    return res.status(403).json({
      error: 'Accès refusé : permission de recensement requise.',
    });
  }

  const targetId = req.body?.utilisateur;
  if (targetId && !isSelf(req, targetId)) {
    cleanupMulterFiles(req.files);
    return res.status(403).json({
      error: 'Accès refusé : profil utilisateur invalide.',
    });
  }
  return next();
}

/**
 * PUT /prestataire/:id — avant Multer.
 * Autorisation via :id uniquement ; 404 si inexistant (y compris Admin).
 */
export async function requirePrestataireUpdatePreUpload(req, res, next) {
  try {
    const { id } = req.params;
    if (!isStrictObjectId(id)) {
      return res.status(400).json({ error: 'Identifiant prestataire invalide' });
    }

    const doc = await prestataireModel.findById(id).select('utilisateur');
    if (!doc) {
      return res.status(404).json({ error: 'Prestataire non trouvé' });
    }

    if (isAdmin(req)) return next();

    const ownerId = doc.utilisateur?.toString?.() ?? String(doc.utilisateur);
    if (!isSelf(req, ownerId)) {
      return res.status(403).json({
        error: 'Accès refusé : vous ne pouvez modifier que votre propre profil.',
      });
    }
    return next();
  } catch {
    return res.status(500).json({ error: 'Erreur interne' });
  }
}

/** Rejette les champs fichiers hors liste autorisée. */
export function rejectUnknownPrestataireUploadFields(req, res, next) {
  if (!req.files || typeof req.files !== 'object') return next();
  for (const key of Object.keys(req.files)) {
    if (!PRESTATAIRE_UPLOAD_FIELD_NAMES.has(key)) {
      cleanupMulterFiles(req.files);
      return res.status(400).json({ error: `Champ fichier non autorisé : ${key}` });
    }
  }
  return next();
}
