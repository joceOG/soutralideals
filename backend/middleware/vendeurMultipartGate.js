import fs from 'fs';
import vendeurModel from '../models/vendeurModel.js';
import { isAdmin, isSelf, isStrictObjectId } from './entityAccess.js';
import {
  isRecensementRequest,
  userCanCreateRecensement,
} from '../utils/recensementPolicy.js';

export const VENDEUR_UPLOAD_FIELD_NAMES = new Set([
  'shopLogo',
  'cni1',
  'cni2',
  'selfie',
  'businessLicense',
  'taxDocument',
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

export function requireVendeurCreatePreUpload(req, res, next) {
  if (isAdmin(req)) return next();
  if (isRecensementRequest(req)) {
    if (userCanCreateRecensement(req.utilisateur)) return next();
    return res.status(403).json({
      error: 'Accès refusé : permission de recensement requise.',
    });
  }
  return next();
}

export function requireVendeurCreatePostUpload(req, res, next) {
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

export async function requireVendeurUpdatePreUpload(req, res, next) {
  try {
    const { id } = req.params;
    if (!isStrictObjectId(id)) {
      return res.status(400).json({ error: 'Identifiant vendeur invalide' });
    }
    const doc = await vendeurModel.findById(id).select('utilisateur');
    if (!doc) return res.status(404).json({ error: 'Vendeur non trouvé' });
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

export function rejectUnknownVendeurUploadFields(req, res, next) {
  if (!req.files || typeof req.files !== 'object') return next();
  for (const key of Object.keys(req.files)) {
    if (!VENDEUR_UPLOAD_FIELD_NAMES.has(key)) {
      cleanupMulterFiles(req.files);
      return res.status(400).json({ error: `Champ fichier non autorisé : ${key}` });
    }
  }
  return next();
}
