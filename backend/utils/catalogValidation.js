import mongoose from 'mongoose';
import groupeModel from '../models/groupeModel.js';
import categorieModel from '../models/categorieModel.js';

/**
 * Valide une référence Groupe (obligatoire pour Catégorie).
 * @returns {{ id: mongoose.Types.ObjectId } | { status: number, error: string }}
 */
export async function resolveGroupeRef(groupe) {
  if (groupe === undefined || groupe === null || String(groupe).trim() === '') {
    return { status: 400, error: 'Groupe parent requis.' };
  }
  if (!mongoose.Types.ObjectId.isValid(String(groupe))) {
    return { status: 400, error: 'Identifiant de groupe invalide.' };
  }
  const id = new mongoose.Types.ObjectId(String(groupe));
  const doc = await groupeModel.findById(id).select('_id');
  if (!doc) {
    return { status: 404, error: 'Groupe non trouvé.' };
  }
  return { id };
}

/** Validation création / mise à jour Service (nom + catégorie existante). */
export async function validateServicePayload({ nomservice, categorie }) {
  if (!nomservice || !String(nomservice).trim()) {
    return { status: 400, error: 'Nom du service requis.' };
  }
  if (categorie === undefined || categorie === null || String(categorie).trim() === '') {
    return { status: 400, error: 'Catégorie requise.' };
  }
  if (!mongoose.Types.ObjectId.isValid(String(categorie))) {
    return { status: 400, error: 'Identifiant de catégorie invalide.' };
  }
  const cat = await categorieModel.findById(categorie).select('_id');
  if (!cat) {
    return { status: 404, error: 'Catégorie non trouvée.' };
  }
  return { ok: true };
}

export function mongooseValidationMessage(err) {
  if (err?.name !== 'ValidationError') return null;
  const first = Object.values(err.errors || {})[0];
  return first?.message || err.message;
}

export function sendControllerError(res, err, logLabel) {
  const validationMsg = mongooseValidationMessage(err);
  if (validationMsg) {
    return res.status(400).json({ error: validationMsg });
  }
  console.error(logLabel, err.message);
  return res.status(500).json({ error: err.message });
}
