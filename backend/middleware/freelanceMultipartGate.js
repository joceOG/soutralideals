import fs from 'fs';
import freelanceModel from '../models/freelanceModel.js';
import { isAdmin, isSelf, isStrictObjectId } from './entityAccess.js';
import {
  isRecensementRequest,
  userCanCreateRecensement,
} from '../utils/recensementPolicy.js';

export const FREELANCE_UPLOAD_FIELD_NAMES = new Set([
  'profileImage',
  'cni1',
  'cni2',
  'selfie',
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
          /* ignore */
        }
      }
    }
  }
}

export function requireFreelanceCreatePreUpload(req, res, next) {
  if (isAdmin(req)) return next();
  if (isRecensementRequest(req)) {
    if (userCanCreateRecensement(req.utilisateur)) return next();
    return res.status(403).json({
      error: 'Accès refusé : permission de recensement requise.',
    });
  }
  return next();
}

export function requireFreelanceCreatePostUpload(req, res, next) {
  if (isAdmin(req)) return next();
  if (isRecensementRequest(req)) {
    if (userCanCreateRecensement(req.utilisateur)) return next();
    cleanupMulterFiles(req.files);
    return res.status(403).json({ error: 'Accès refusé : permission de recensement requise.' });
  }
  const targetId = req.body?.utilisateur;
  if (targetId && !isSelf(req, targetId)) {
    cleanupMulterFiles(req.files);
    return res.status(403).json({ error: 'Accès refusé : profil utilisateur invalide.' });
  }
  return next();
}

export async function requireFreelanceUpdatePreUpload(req, res, next) {
  try {
    const { id } = req.params;
    if (!isStrictObjectId(id)) {
      return res.status(400).json({ error: 'Identifiant freelance invalide' });
    }
    const doc = await freelanceModel.findById(id).select('utilisateur');
    if (!doc) return res.status(404).json({ error: 'Freelance non trouvé' });
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

export function rejectUnknownFreelanceUploadFields(req, res, next) {
  if (!req.files || typeof req.files !== 'object') return next();
  for (const key of Object.keys(req.files)) {
    if (!FREELANCE_UPLOAD_FIELD_NAMES.has(key)) {
      cleanupMulterFiles(req.files);
      return res.status(400).json({ error: `Champ fichier non autorisé : ${key}` });
    }
  }
  return next();
}
