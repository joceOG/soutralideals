/**
 * DASH-8E.3A — Intégrité profils professionnels (read-only checks, codes 409).
 */
import mongoose from 'mongoose';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';

export const PROFILE_TYPE_TO_MODEL = {
  prestataire: prestataireModel,
  freelance: freelanceModel,
  vendeur: vendeurModel,
};

export const PROFILE_TYPE_LABEL = {
  prestataire: 'Prestataire',
  freelance: 'Freelance',
  vendeur: 'Vendeur',
};

export function assertObjectId(value) {
  if (
    !value ||
    !mongoose.Types.ObjectId.isValid(String(value)) ||
    String(new mongoose.Types.ObjectId(String(value))) !== String(value)
  ) {
    return false;
  }
  return true;
}

/**
 * @param {'prestataire'|'freelance'|'vendeur'} professionalType
 */
export async function loadProfileSampleForUser(utilisateurId, professionalType) {
  const Model = PROFILE_TYPE_TO_MODEL[professionalType];
  if (!Model || !assertObjectId(utilisateurId)) {
    return { count: 0, docs: [] };
  }
  const uid = new mongoose.Types.ObjectId(String(utilisateurId));
  const docs = await Model.find({ utilisateur: uid })
    .select('_id source sourceFieldRecensementId')
    .limit(2)
    .lean();
  return { count: docs.length, docs };
}

/**
 * Décide création / idempotence / conflit sans écrire.
 */
export function resolveProfileAttachDecision(sample, options = {}) {
  const { sourceFieldRecensementId, source } = options;
  const { count, docs } = sample;
  if (count === 0) {
    return { action: 'create' };
  }
  if (count > 1) {
    return {
      action: 'reject',
      httpStatus: 409,
      code: 'PROFESSIONAL_PROFILE_CONFLICT',
      message: 'Plusieurs profils professionnels du même type nécessitent une régularisation.',
    };
  }
  const doc = docs[0];
  if (
    sourceFieldRecensementId &&
    doc.sourceFieldRecensementId &&
    String(doc.sourceFieldRecensementId) === String(sourceFieldRecensementId)
  ) {
    return { action: 'idempotent', profileId: doc._id };
  }
  if (source && doc.source === source && sourceFieldRecensementId && String(doc.sourceFieldRecensementId) === String(sourceFieldRecensementId)) {
    return { action: 'idempotent', profileId: doc._id };
  }
  return {
    action: 'reject',
    httpStatus: 409,
    code: 'PROFESSIONAL_PROFILE_ALREADY_EXISTS',
    message: 'Un profil professionnel de ce type existe déjà pour cet utilisateur.',
  };
}

export function mustPreserveUserRole(existingUser) {
  if (!existingUser) return 'Client';
  if (existingUser.role === 'Admin') return 'Admin';
  return existingUser.role;
}

export function roleForNewAccountFromImportOrRecensement() {
  return 'Client';
}

/**
 * Audit read-only des doublons par utilisateur.
 */
export async function auditProfessionalProfileDuplicates() {
  const summary = {};
  for (const [key, Model] of Object.entries(PROFILE_TYPE_TO_MODEL)) {
    const dupGroups = await Model.aggregate([
      { $group: { _id: '$utilisateur', n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
    ]);
    const duplicateUsers = dupGroups.length;
    const duplicateDocuments = dupGroups.reduce((acc, g) => acc + g.n, 0);
    summary[`${key}s`] = { duplicateUsers, duplicateDocuments };
  }
  return summary;
}
