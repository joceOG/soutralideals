import mongoose from 'mongoose';

const MAX_EXPERIENCE_YEARS = 60;
const MAX_DESCRIPTION_LENGTH = 5000;

export function parsePrestataireNumber(value, { allowEmpty = false } = {}) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return allowEmpty ? undefined : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateGeoMaps(maps) {
  if (!maps || typeof maps !== 'object') return { ok: true, value: null };
  const lat = Number(maps.latitude);
  const lng = Number(maps.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'Coordonnées géographiques invalides.' };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: 'Coordonnées hors limites.' };
  }
  return { ok: true, value: { latitude: lat, longitude: lng } };
}

/**
 * Validation création admin / self-service avant upload Cloudinary.
 */
export function validatePrestataireCreateBody({
  body,
  isAdminUser,
  requesterId,
  finalServiceId,
}) {
  const errors = [];

  if (!finalServiceId || !mongoose.Types.ObjectId.isValid(String(finalServiceId))) {
    errors.push('service ou category invalide');
  }

  const localisation = typeof body.localisation === 'string' ? body.localisation.trim() : '';
  if (!localisation) {
    errors.push('localisation requise');
  }

  const prix = parsePrestataireNumber(body.prixprestataire, { allowEmpty: true });
  if (prix === null || prix < 0) {
    errors.push('prixprestataire invalide');
  }

  let ownerId = requesterId;
  if (isAdminUser && body.utilisateur) {
    if (!mongoose.Types.ObjectId.isValid(String(body.utilisateur))) {
      errors.push('utilisateur invalide');
    } else {
      ownerId = String(body.utilisateur);
    }
  } else if (isAdminUser && !body.utilisateur) {
    errors.push('utilisateur requis pour la création admin');
  }

  if (body.anneeExperience) {
    const exp = parsePrestataireNumber(body.anneeExperience, { allowEmpty: true });
    if (exp === null || exp < 0 || exp > MAX_EXPERIENCE_YEARS) {
      errors.push('anneeExperience invalide');
    }
  }

  if (body.description && String(body.description).length > MAX_DESCRIPTION_LENGTH) {
    errors.push('description trop longue');
  }

  const geo = validateGeoMaps(
    typeof body.localisationmaps === 'string'
      ? (() => {
          try {
            return JSON.parse(body.localisationmaps);
          } catch {
            return null;
          }
        })()
      : body.localisationmaps,
  );
  if (!geo.ok) errors.push(geo.error);

  const tarifMin = parsePrestataireNumber(body.tarifHoraireMin, { allowEmpty: true });
  const tarifMax = parsePrestataireNumber(body.tarifHoraireMax, { allowEmpty: true });
  if (tarifMin !== undefined && tarifMin !== null && tarifMin < 0) errors.push('tarifHoraireMin invalide');
  if (tarifMax !== undefined && tarifMax !== null && tarifMax < 0) errors.push('tarifHoraireMax invalide');
  if (
    tarifMin != null &&
    tarifMax != null &&
    tarifMin > 0 &&
    tarifMax > 0 &&
    tarifMin > tarifMax
  ) {
    errors.push('tarif horaire incohérent');
  }

  return {
    ok: errors.length === 0,
    errors,
    ownerId,
    localisation,
    prixprestataire: prix ?? 0,
    parsedLocalisation: geo.value,
  };
}

export function mongooseValidationTo400(err) {
  if (err?.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return { status: 400, error: messages.join(' ; ') || 'Données invalides' };
  }
  if (err?.name === 'CastError') {
    return { status: 400, error: 'Identifiant ou type invalide' };
  }
  return null;
}
