import type { AxiosError } from 'axios';
import { PRESTATAIRE_MAX_FILE_BYTES, PRESTATAIRE_ACCEPT_IMAGES, documentPresent } from './prestataireService';

export const FREELANCE_MAX_FILE_BYTES = PRESTATAIRE_MAX_FILE_BYTES;
export const FREELANCE_ACCEPT_IMAGES = PRESTATAIRE_ACCEPT_IMAGES;

export interface FreelanceUtilisateurRef {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
}

export interface FreelanceFormValues {
  utilisateurId: string;
  name: string;
  job: string;
  category: string;
  description: string;
  skills: string[];
  preferredCategories: string[];
  hourlyRate: number;
  minimumProjectBudget: number;
  maxProjectsPerMonth: number;
  experienceLevel: string;
  availabilityStatus: string;
  workingHours: string;
  location: string;
  phoneNumber: string;
  isTopRated: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  accountStatus: string;
  status: string;
}

export interface FreelanceFormFiles {
  profileImage: File | null;
  cni1: File | null;
  cni2: File | null;
  selfie: File | null;
}

export interface FreelanceExistingMedia {
  profileImage: boolean;
  cni1: boolean;
  cni2: boolean;
  selfie: boolean;
}

export const FREELANCE_FORM_STEPS = [
  'Identité professionnelle',
  'Compétences et services',
  'Tarification et disponibilité',
  'Portfolio et vérification',
  'Confirmation',
] as const;

export function emptyFreelanceFormValues(): FreelanceFormValues {
  return {
    utilisateurId: '',
    name: '',
    job: '',
    category: '',
    description: '',
    skills: [],
    preferredCategories: [],
    hourlyRate: 0,
    minimumProjectBudget: 0,
    maxProjectsPerMonth: 10,
    experienceLevel: 'Débutant',
    availabilityStatus: 'Disponible',
    workingHours: 'Temps partiel',
    location: '',
    phoneNumber: '',
    isTopRated: false,
    isFeatured: false,
    isVerified: false,
    accountStatus: 'Pending',
    status: 'pending',
  };
}

export function normalizeFreelanceForEdit(raw: Record<string, unknown>): {
  values: FreelanceFormValues;
  existingMedia: FreelanceExistingMedia;
} {
  const u = raw.utilisateur as FreelanceUtilisateurRef | undefined;
  const vd = (raw.verificationDocuments || {}) as Record<string, unknown>;

  return {
    values: {
      utilisateurId: u?._id ? String(u._id) : '',
      name: String(raw.name ?? ''),
      job: String(raw.job ?? ''),
      category: String(raw.category ?? ''),
      description: String(raw.description ?? ''),
      skills: Array.isArray(raw.skills) ? (raw.skills as string[]) : [],
      preferredCategories: Array.isArray(raw.preferredCategories)
        ? (raw.preferredCategories as string[])
        : [],
      hourlyRate: Number(raw.hourlyRate) || 0,
      minimumProjectBudget: Number(raw.minimumProjectBudget) || 0,
      maxProjectsPerMonth: Number(raw.maxProjectsPerMonth) || 10,
      experienceLevel: String(raw.experienceLevel ?? 'Débutant'),
      availabilityStatus: String(raw.availabilityStatus ?? 'Disponible'),
      workingHours: String(raw.workingHours ?? 'Temps partiel'),
      location: String(raw.location ?? ''),
      phoneNumber: String(raw.phoneNumber ?? ''),
      isTopRated: Boolean(raw.isTopRated),
      isFeatured: Boolean(raw.isFeatured),
      isVerified: Boolean(vd.isVerified),
      accountStatus: String(raw.accountStatus ?? 'Pending'),
      status: String(raw.status ?? 'pending'),
    },
    existingMedia: {
      profileImage: documentPresent(raw.imagePath),
      cni1: documentPresent(vd.cni1),
      cni2: documentPresent(vd.cni2),
      selfie: documentPresent(vd.selfie),
    },
  };
}

export function validateFreelanceFile(file: File | null): string | null {
  if (!file) return null;
  if (!file.type.startsWith('image/')) return 'Seules les images sont autorisées.';
  if (file.size > FREELANCE_MAX_FILE_BYTES) return 'Fichier trop volumineux (max 10 Mo).';
  return null;
}

export function validateFreelanceStep(
  step: number,
  values: FreelanceFormValues,
  files: FreelanceFormFiles,
  existing: FreelanceExistingMedia,
  isUpdate: boolean,
): Record<string, string> {
  const err: Record<string, string> = {};
  if (step === 0) {
    if (!values.utilisateurId) err.utilisateurId = 'Sélectionnez un utilisateur.';
    if (!values.name.trim()) err.name = 'Nom requis.';
    if (!values.job.trim()) err.job = 'Métier / titre requis.';
  }
  if (step === 1) {
    if (!values.category.trim()) err.category = 'Catégorie requise.';
  }
  if (step === 2) {
    if (!values.location.trim()) err.location = 'Localisation requise.';
    if (!values.hourlyRate || values.hourlyRate <= 0) err.hourlyRate = 'Tarif horaire > 0.';
  }
  if (step === 3) {
    for (const [k, file] of Object.entries(files) as [keyof FreelanceFormFiles, File | null][]) {
      const msg = validateFreelanceFile(file);
      if (msg) err[k] = msg;
    }
  }
  return err;
}

export function collectFreelanceMissing(
  values: FreelanceFormValues,
  files: FreelanceFormFiles,
  existing: FreelanceExistingMedia,
  isUpdate: boolean,
): string[] {
  const missing: string[] = [];
  if (!values.utilisateurId) missing.push('Utilisateur');
  if (!values.name.trim()) missing.push('Nom');
  if (!values.job.trim()) missing.push('Métier');
  if (!values.category.trim()) missing.push('Catégorie');
  if (!values.location.trim()) missing.push('Localisation');
  if (!values.hourlyRate || values.hourlyRate <= 0) missing.push('Tarif horaire');
  return missing;
}

export function buildFreelanceFormData(
  values: FreelanceFormValues,
  files: FreelanceFormFiles,
  options: { isUpdate: boolean },
): FormData {
  const fd = new FormData();
  const payload: Record<string, string> = {
    name: values.name.trim(),
    job: values.job.trim(),
    category: values.category.trim(),
    hourlyRate: String(values.hourlyRate),
    description: values.description.trim(),
    location: values.location.trim(),
    phoneNumber: values.phoneNumber.trim(),
    experienceLevel: values.experienceLevel,
    availabilityStatus: values.availabilityStatus,
    workingHours: values.workingHours,
    skills: JSON.stringify(values.skills),
    preferredCategories: JSON.stringify(
      values.preferredCategories.length ? values.preferredCategories : [values.category],
    ),
    minimumProjectBudget: String(values.minimumProjectBudget || 0),
    maxProjectsPerMonth: String(values.maxProjectsPerMonth || 10),
    isTopRated: values.isTopRated ? 'true' : 'false',
    isFeatured: values.isFeatured ? 'true' : 'false',
    isVerified: values.isVerified ? 'true' : 'false',
    accountStatus: values.accountStatus,
    status: values.status,
  };

  if (values.utilisateurId) payload.utilisateur = values.utilisateurId;

  for (const [k, v] of Object.entries(payload)) {
    if (v !== undefined && v !== '') fd.append(k, v);
  }
  if (files.profileImage) fd.append('profileImage', files.profileImage);
  if (files.cni1) fd.append('cni1', files.cni1);
  if (files.cni2) fd.append('cni2', files.cni2);
  if (files.selfie) fd.append('selfie', files.selfie);
  return fd;
}

export function stripFreelanceListRow<T extends { verificationDocuments?: unknown; imagePath?: unknown }>(
  row: T,
): T {
  const vd = row.verificationDocuments as Record<string, unknown> | undefined;
  return {
    ...row,
    verificationDocuments: vd
      ? {
          isVerified: Boolean(vd.isVerified),
          cni1: documentPresent(vd.cni1),
          cni2: documentPresent(vd.cni2),
          selfie: documentPresent(vd.selfie),
        }
      : undefined,
  };
}

export function mapFreelanceApiError(error: unknown): string {
  const ax = error as AxiosError<{ error?: string }>;
  const status = ax.response?.status;
  const msg = ax.response?.data?.error;
  if (status === 400) return msg || 'Données invalides.';
  if (status === 401) return 'Session expirée.';
  if (status === 403) return 'Action non autorisée.';
  if (status === 404) return msg || 'Ressource introuvable.';
  if (status === 409) return msg || 'Profil déjà existant.';
  if (status && status >= 500) return 'Erreur serveur.';
  if (ax.code === 'ERR_NETWORK') return 'Réseau indisponible.';
  return msg || 'Enregistrement impossible.';
}
