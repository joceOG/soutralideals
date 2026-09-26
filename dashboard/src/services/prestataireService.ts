import type { AxiosError } from 'axios';

/** Taille max alignée sur Multer documentUpload (10 Mo). */
export const PRESTATAIRE_MAX_FILE_BYTES = 10 * 1024 * 1024;

export const PRESTATAIRE_ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp,image/gif';

export interface PrestataireUtilisateurRef {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
}

export interface PrestataireServiceRef {
  _id: string;
  nomservice: string;
  categorie?: { nomcategorie?: string };
}

export interface PrestataireFormValues {
  utilisateurId: string;
  utilisateurLabel: string;
  serviceId: string;
  prixprestataire: number;
  localisation: string;
  latitude: string;
  longitude: string;
  numeroCNI: string;
  specialite: string[];
  anneeExperience: string;
  description: string;
  rayonIntervention: number;
  zoneInterventionText: string;
  tarifHoraireMin: number;
  tarifHoraireMax: number;
  numeroRCCM: string;
  numeroAssurance: string;
  verifier: boolean;
  status: string;
  note: number;
  nbMission: number;
}

export interface PrestataireKycFiles {
  cni1: File | null;
  cni2: File | null;
  selfie: File | null;
  attestationAssurance: File | null;
}

export interface PrestataireExistingKyc {
  cni1: boolean;
  cni2: boolean;
  selfie: boolean;
  attestationAssurance: boolean;
}

export const PRESTATAIRE_FORM_STEPS = [
  'Identité',
  'Activité professionnelle',
  'Localisation',
  'Vérification',
  'Confirmation',
] as const;

export type PrestataireFormStep = (typeof PRESTATAIRE_FORM_STEPS)[number];

export function emptyPrestataireFormValues(): PrestataireFormValues {
  return {
    utilisateurId: '',
    utilisateurLabel: '',
    serviceId: '',
    prixprestataire: 0,
    localisation: '',
    latitude: '',
    longitude: '',
    numeroCNI: '',
    specialite: [],
    anneeExperience: '',
    description: '',
    rayonIntervention: 10,
    zoneInterventionText: '',
    tarifHoraireMin: 0,
    tarifHoraireMax: 0,
    numeroRCCM: '',
    numeroAssurance: '',
    verifier: false,
    status: 'incomplete',
    note: 0,
    nbMission: 0,
  };
}

export function documentPresent(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === 'string' && value.trim().length > 0) return true;
  return false;
}

export function normalizePrestataireForEdit(raw: Record<string, unknown>): {
  values: PrestataireFormValues;
  existingKyc: PrestataireExistingKyc;
} {
  const u = raw.utilisateur as PrestataireUtilisateurRef | undefined;
  const s = raw.service as PrestataireServiceRef | undefined;
  const maps = raw.localisationmaps as { latitude?: number; longitude?: number } | undefined;
  const zones = Array.isArray(raw.zoneIntervention) ? (raw.zoneIntervention as string[]) : [];

  const values: PrestataireFormValues = {
    utilisateurId: u?._id ? String(u._id) : '',
    utilisateurLabel: u ? `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() : '',
    serviceId: s?._id ? String(s._id) : '',
    prixprestataire: Number(raw.prixprestataire) || 0,
    localisation: String(raw.localisation ?? ''),
    latitude:
      maps?.latitude != null && Number.isFinite(Number(maps.latitude))
        ? String(maps.latitude)
        : '',
    longitude:
      maps?.longitude != null && Number.isFinite(Number(maps.longitude))
        ? String(maps.longitude)
        : '',
    numeroCNI: String(raw.numeroCNI ?? ''),
    specialite: Array.isArray(raw.specialite) ? (raw.specialite as string[]) : [],
    anneeExperience: raw.anneeExperience != null ? String(raw.anneeExperience) : '',
    description: String(raw.description ?? ''),
    rayonIntervention: Number(raw.rayonIntervention) || 10,
    zoneInterventionText: zones.join(', '),
    tarifHoraireMin: Number(raw.tarifHoraireMin) || 0,
    tarifHoraireMax: Number(raw.tarifHoraireMax) || 0,
    numeroRCCM: String(raw.numeroRCCM ?? ''),
    numeroAssurance: String(raw.numeroAssurance ?? ''),
    verifier: Boolean(raw.verifier),
    status: String(raw.status ?? 'incomplete'),
    note: Number(raw.note) || 0,
    nbMission: Number(raw.nbMission) || 0,
  };

  return {
    values,
    existingKyc: {
      cni1: documentPresent(raw.cni1),
      cni2: documentPresent(raw.cni2),
      selfie: documentPresent(raw.selfie),
      attestationAssurance: documentPresent(raw.attestationAssurance),
    },
  };
}

function parseCoord(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function validatePrestataireFile(file: File | null): string | null {
  if (!file) return null;
  if (!file.type.startsWith('image/')) {
    return 'Seules les images sont autorisées (JPEG, PNG, WebP, GIF).';
  }
  if (file.size > PRESTATAIRE_MAX_FILE_BYTES) {
    return 'Fichier trop volumineux (maximum 10 Mo).';
  }
  return null;
}

export function validatePrestataireStep(
  stepIndex: number,
  values: PrestataireFormValues,
  files: PrestataireKycFiles,
  existingKyc: PrestataireExistingKyc,
  isUpdate: boolean,
): Record<string, string> {
  const err: Record<string, string> = {};

  if (stepIndex === 0) {
    if (!values.utilisateurId) err.utilisateurId = 'Sélectionnez un utilisateur associé.';
  }

  if (stepIndex === 1) {
    if (!values.serviceId) err.serviceId = 'Sélectionnez un métier / service.';
    if (!values.prixprestataire || values.prixprestataire <= 0) {
      err.prixprestataire = 'Indiquez un tarif de base supérieur à 0.';
    }
    if (values.anneeExperience) {
      const exp = Number(values.anneeExperience);
      if (!Number.isFinite(exp) || exp < 0 || exp > 60) {
        err.anneeExperience = 'Expérience entre 0 et 60 ans.';
      }
    }
    if (values.description.length > 5000) err.description = 'Maximum 5000 caractères.';
    if (
      values.tarifHoraireMin > 0 &&
      values.tarifHoraireMax > 0 &&
      values.tarifHoraireMin > values.tarifHoraireMax
    ) {
      err.tarifHoraireMax = 'Le tarif max doit être ≥ au min.';
    }
  }

  if (stepIndex === 2) {
    if (!values.localisation.trim()) err.localisation = 'La localisation est requise.';
    const lat = parseCoord(values.latitude);
    const lng = parseCoord(values.longitude);
    const hasLat = values.latitude.trim() !== '';
    const hasLng = values.longitude.trim() !== '';
    if (hasLat !== hasLng) {
      err.latitude = 'Renseignez latitude et longitude, ou laissez les deux vides.';
    }
    if (lat != null && (lat < -90 || lat > 90)) err.latitude = 'Latitude entre -90 et 90.';
    if (lng != null && (lng < -180 || lng > 180)) err.longitude = 'Longitude entre -180 et 180.';
  }

  if (stepIndex === 3) {
    for (const [key, file] of Object.entries(files) as [keyof PrestataireKycFiles, File | null][]) {
      const msg = validatePrestataireFile(file);
      if (msg) err[key] = msg;
    }
    if (!isUpdate) {
      if (!files.cni1 && !existingKyc.cni1) err.cni1 = 'CNI recto requis à la création.';
      if (!files.cni2 && !existingKyc.cni2) err.cni2 = 'CNI verso requis à la création.';
      if (!files.selfie && !existingKyc.selfie) err.selfie = 'Selfie requis à la création.';
    }
  }

  return err;
}

export function collectPrestataireMissingFields(
  values: PrestataireFormValues,
  files: PrestataireKycFiles,
  existingKyc: PrestataireExistingKyc,
  isUpdate: boolean,
): string[] {
  const missing: string[] = [];
  const allErrors = [0, 1, 2, 3].flatMap((i) =>
    Object.values(validatePrestataireStep(i, values, files, existingKyc, isUpdate)),
  );
  if (!values.utilisateurId) missing.push('Utilisateur associé');
  if (!values.serviceId) missing.push('Service / métier');
  if (!values.prixprestataire || values.prixprestataire <= 0) missing.push('Tarif de base');
  if (!values.localisation.trim()) missing.push('Localisation');
  if (!isUpdate) {
    if (!files.cni1 && !existingKyc.cni1) missing.push('CNI recto');
    if (!files.cni2 && !existingKyc.cni2) missing.push('CNI verso');
    if (!files.selfie && !existingKyc.selfie) missing.push('Selfie');
  }
  for (const e of allErrors) {
    if (!missing.includes(e)) missing.push(e);
  }
  return [...new Set(missing)];
}

export function buildPrestataireFormData(
  values: PrestataireFormValues,
  files: PrestataireKycFiles,
  options: { isUpdate: boolean },
): FormData {
  const form = new FormData();
  const { isUpdate } = options;

  if (values.utilisateurId) form.append('utilisateur', values.utilisateurId);
  if (values.serviceId) form.append('service', values.serviceId);

  if (!isUpdate || values.prixprestataire > 0) {
    form.append('prixprestataire', String(values.prixprestataire));
  }

  if (values.localisation.trim()) {
    form.append('localisation', values.localisation.trim());
  }

  const lat = parseCoord(values.latitude);
  const lng = parseCoord(values.longitude);
  if (lat != null && lng != null) {
    form.append('localisationmaps', JSON.stringify({ latitude: lat, longitude: lng }));
  }

  if (values.numeroCNI.trim()) form.append('numeroCNI', values.numeroCNI.trim());
  if (values.numeroRCCM.trim()) form.append('numeroRCCM', values.numeroRCCM.trim());
  if (values.numeroAssurance.trim()) form.append('numeroAssurance', values.numeroAssurance.trim());

  if (values.specialite.length) {
    form.append('specialite', JSON.stringify(values.specialite));
  }
  if (values.anneeExperience.trim()) {
    form.append('anneeExperience', values.anneeExperience.trim());
  }
  if (values.description.trim()) {
    form.append('description', values.description.trim());
  }

  form.append('rayonIntervention', String(values.rayonIntervention || 10));

  const zones = values.zoneInterventionText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (zones.length) form.append('zoneIntervention', JSON.stringify(zones));

  if (values.tarifHoraireMin > 0) {
    form.append('tarifHoraireMin', String(values.tarifHoraireMin));
  }
  if (values.tarifHoraireMax > 0) {
    form.append('tarifHoraireMax', String(values.tarifHoraireMax));
  }

  form.append('verifier', values.verifier ? 'true' : 'false');
  if (values.status) form.append('status', values.status);
  if (values.note > 0) form.append('note', String(values.note));
  if (values.nbMission > 0) form.append('nbMission', String(values.nbMission));

  if (files.cni1) form.append('cni1', files.cni1);
  if (files.cni2) form.append('cni2', files.cni2);
  if (files.selfie) form.append('selfie', files.selfie);
  if (files.attestationAssurance) form.append('attestationAssurance', files.attestationAssurance);

  return form;
}

export function stripKycForListRow<T extends { cni1?: unknown; cni2?: unknown; selfie?: unknown }>(
  row: T,
): T {
  return {
    ...row,
    cni1: documentPresent(row.cni1),
    cni2: documentPresent(row.cni2),
    selfie: documentPresent(row.selfie),
  };
}

export function mapPrestataireApiError(error: unknown): string {
  const ax = error as AxiosError<{ error?: string; message?: string }>;
  const status = ax.response?.status;
  const body = ax.response?.data;
  const serverMsg = body?.error || body?.message;

  if (status === 400) return serverMsg || 'Données invalides. Vérifiez le formulaire.';
  if (status === 401) return 'Session expirée. Reconnectez-vous.';
  if (status === 403) return 'Action réservée aux administrateurs.';
  if (status === 404) return serverMsg || 'Ressource introuvable.';
  if (status === 409) return serverMsg || 'Conflit : ce profil existe déjà.';
  if (status && status >= 500) return 'Erreur serveur. Réessayez plus tard.';
  if (ax.code === 'ERR_NETWORK') return 'Réseau indisponible.';
  return serverMsg || 'Enregistrement impossible.';
}
