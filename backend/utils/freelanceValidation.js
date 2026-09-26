import mongoose from 'mongoose';
import { mongooseValidationTo400 } from './prestataireValidation.js';

export { mongooseValidationTo400 };

const MAX_DESCRIPTION = 8000;
const EXPERIENCE_LEVELS = ['Débutant', 'Intermédiaire', 'Expert'];
const AVAILABILITY = ['Disponible', 'Occupé', 'En pause'];
const WORKING_HOURS = ['Temps plein', 'Temps partiel', 'Ponctuel'];

export function parseJsonArrayField(v) {
  if (v == null || v === '') return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.map(String) : [String(p)];
    } catch {
      return [v];
    }
  }
  return [String(v)];
}

export function validateFreelanceCreateBody({ body, isAdminUser, requesterId }) {
  const errors = [];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const job = typeof body.job === 'string' ? body.job.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const location = typeof body.location === 'string' ? body.location.trim() : '';

  if (!name) errors.push('name requis');
  if (!job) errors.push('job requis');
  if (!category) errors.push('category requise');
  if (!location) errors.push('location requise');

  const rate = Number(body.hourlyRate);
  if (!Number.isFinite(rate) || rate <= 0) errors.push('hourlyRate invalide');

  if (body.description && String(body.description).length > MAX_DESCRIPTION) {
    errors.push('description trop longue');
  }

  if (body.experienceLevel && !EXPERIENCE_LEVELS.includes(body.experienceLevel)) {
    errors.push('experienceLevel invalide');
  }
  if (body.availabilityStatus && !AVAILABILITY.includes(body.availabilityStatus)) {
    errors.push('availabilityStatus invalide');
  }
  if (body.workingHours && !WORKING_HOURS.includes(body.workingHours)) {
    errors.push('workingHours invalide');
  }

  let ownerId = requesterId;
  if (isAdminUser) {
    if (!body.utilisateur || !mongoose.Types.ObjectId.isValid(String(body.utilisateur))) {
      errors.push('utilisateur requis pour la création admin');
    } else {
      ownerId = String(body.utilisateur);
    }
  }

  return { ok: errors.length === 0, errors, ownerId, name, job, category, location, hourlyRate: rate };
}
