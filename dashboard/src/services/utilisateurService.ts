import type { AxiosError } from 'axios';
import { apiClient } from './setupApi';

export const UTILISATEUR_ROLES = [
  'Admin',
  'Client',
  'Prestataire',
  'Vendeur',
  'Freelance',
] as const;

/** Rôles assignables au compte (DASH-8E.1) — pas les capacités pro. */
export const ACCOUNT_ACCESS_ROLES = ['Admin', 'Client'] as const;

export type AccountAccessRole = (typeof ACCOUNT_ACCESS_ROLES)[number];
export type UtilisateurRole = (typeof UTILISATEUR_ROLES)[number];

export const LEGACY_PROFESSIONAL_ROLES: UtilisateurRole[] = ['Prestataire', 'Freelance', 'Vendeur'];

export interface UtilisateurListItem {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  role: UtilisateurRole;
  genre?: string;
  datedenaissance?: string;
  photoProfil?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UtilisateurFormValues {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  genre: string;
  datedenaissance: string;
  role: AccountAccessRole;
  isActive: boolean;
  password: string;
  passwordConfirm: string;
}

export interface FetchUtilisateursParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: 'true' | 'false' | '';
  signal?: AbortSignal;
}

export interface FetchUtilisateursResult {
  items: UtilisateurListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProfessionalProfileState {
  exists: boolean;
  status: string | null;
  canOperate: boolean;
  id?: string | null;
}

export interface UserCapabilitiesSummary {
  accountRole: AccountAccessRole;
  legacyRole?: string;
  capabilities: string[];
  profiles: {
    prestataire: ProfessionalProfileState;
    freelance: ProfessionalProfileState;
    vendeur: ProfessionalProfileState;
  };
  inconsistencies: string[];
}

/** @deprecated utiliser UserCapabilitiesSummary */
export interface UserRolesSummary extends UserCapabilitiesSummary {}

export function resolveAccountAccessRole(storedRole: string): AccountAccessRole {
  return storedRole === 'Admin' ? 'Admin' : 'Client';
}

export function isLegacyProfessionalStoredRole(storedRole: string): boolean {
  return (LEGACY_PROFESSIONAL_ROLES as string[]).includes(storedRole);
}

export function normalizeCapabilitiesPayload(raw: Record<string, unknown>): UserCapabilitiesSummary {
  const data = (raw.data as Record<string, unknown>) || raw;
  const profilesRaw = (data.profiles as Record<string, ProfessionalProfileState>) || {};
  const normProfile = (p?: ProfessionalProfileState): ProfessionalProfileState => ({
    exists: Boolean(p?.exists),
    status: p?.status ?? null,
    canOperate: Boolean(p?.canOperate),
    id: p?.id ? String(p.id) : null,
  });
  return {
    accountRole: (data.accountRole as AccountAccessRole) || 'Client',
    legacyRole: data.legacyRole ? String(data.legacyRole) : undefined,
    capabilities: Array.isArray(data.capabilities) ? (data.capabilities as string[]) : [],
    profiles: {
      prestataire: normProfile(profilesRaw.prestataire),
      freelance: normProfile(profilesRaw.freelance),
      vendeur: normProfile(profilesRaw.vendeur),
    },
    inconsistencies: Array.isArray(data.inconsistencies) ? (data.inconsistencies as string[]) : [],
  };
}

export function professionalProfileLabel(
  key: 'prestataire' | 'freelance' | 'vendeur',
  profile: ProfessionalProfileState,
): string {
  const names = { prestataire: 'Prestataire', freelance: 'Freelance', vendeur: 'Vendeur' };
  if (!profile.exists) return `${names[key]} — absent`;
  if (profile.status === 'rejected') return `${names[key]} — rejeté`;
  if (profile.status === 'suspended') return `${names[key]} — suspendu`;
  if (profile.status === 'pending') return `${names[key]} — en attente`;
  if (profile.canOperate) return `${names[key]} — actif`;
  return `${names[key]} — actif (limité)`;
}

export const PRO_MODULE_PATHS = {
  prestataire: '/prestataire',
  freelance: '/freelance',
  vendeur: '/vendeur',
} as const;

export function emptyUtilisateurFormValues(): UtilisateurFormValues {
  return {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    genre: '',
    datedenaissance: '',
    role: 'Client',
    isActive: true,
    password: '',
    passwordConfirm: '',
  };
}

export function normalizeUtilisateurRow(raw: Record<string, unknown>): UtilisateurListItem {
  return {
    _id: String(raw._id),
    nom: String(raw.nom ?? ''),
    prenom: String(raw.prenom ?? ''),
    email: raw.email ? String(raw.email) : undefined,
    telephone: raw.telephone ? String(raw.telephone) : undefined,
    role: (raw.role as UtilisateurRole) || 'Client',
    genre: raw.genre ? String(raw.genre) : undefined,
    datedenaissance: raw.datedenaissance ? String(raw.datedenaissance) : undefined,
    photoProfil: raw.photoProfil ? String(raw.photoProfil) : undefined,
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

export function normalizeEmailInput(email: string): string {
  return email.trim().toLowerCase();
}

export function validateUtilisateurForm(
  values: UtilisateurFormValues,
  options: { isUpdate: boolean },
): Record<string, string> {
  const err: Record<string, string> = {};
  if (!values.nom.trim()) err.nom = 'Nom requis.';
  if (!values.prenom.trim()) err.prenom = 'Prénom requis.';
  if (!ACCOUNT_ACCESS_ROLES.includes(values.role)) err.role = 'Rôle de compte invalide.';
  if (!options.isUpdate) {
    if (!values.password || values.password.length < 6) {
      err.password = 'Mot de passe requis (6 caractères minimum).';
    }
    if (values.password !== values.passwordConfirm) {
      err.passwordConfirm = 'Les mots de passe ne correspondent pas.';
    }
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmailInput(values.email))) {
    err.email = 'Email invalide.';
  }
  return err;
}

export function buildUtilisateurFormData(
  values: UtilisateurFormValues,
  photoFile: File | null,
  options: { isUpdate: boolean; includeRole?: boolean },
): FormData {
  const fd = new FormData();
  fd.append('nom', values.nom.trim());
  fd.append('prenom', values.prenom.trim());
  if (values.email.trim()) fd.append('email', normalizeEmailInput(values.email));
  if (values.telephone.trim()) fd.append('telephone', values.telephone.trim());
  if (values.genre) fd.append('genre', values.genre);
  if (values.datedenaissance) fd.append('datedenaissance', values.datedenaissance);
  if (!options.isUpdate || options.includeRole === true) {
    fd.append('role', values.role);
  }
  fd.append('isActive', values.isActive ? 'true' : 'false');
  if (!options.isUpdate) {
    fd.append('password', values.password);
  }
  if (photoFile) fd.append('photoProfil', photoFile);
  return fd;
}

export async function fetchUtilisateurs(
  params: FetchUtilisateursParams = {},
): Promise<FetchUtilisateursResult> {
  const { page = 1, limit = 20, search, role, isActive, signal } = params;
  const q: Record<string, string | number> = { page, limit };
  if (search?.trim()) q.search = search.trim();
  if (role) q.role = role;
  if (isActive === 'true' || isActive === 'false') q.isActive = isActive;

  const res = await apiClient.get('/utilisateur', { params: q, signal });
  const data = res.data as {
    utilisateurs?: Record<string, unknown>[];
    total?: number;
    page?: number;
    totalPages?: number;
  };
  const rows = data.utilisateurs ?? [];
  return {
    items: rows.map((r) => normalizeUtilisateurRow(r)),
    total: data.total ?? rows.length,
    page: data.page ?? page,
    totalPages: data.totalPages ?? 1,
  };
}

export async function fetchMyCapabilities(): Promise<UserCapabilitiesSummary> {
  const res = await apiClient.get('/utilisateur/me/capabilities');
  return normalizeCapabilitiesPayload(res.data as Record<string, unknown>);
}

export async function fetchUtilisateurCapabilities(userId: string): Promise<UserCapabilitiesSummary> {
  const res = await apiClient.get(`/utilisateur/${userId}/roles`);
  return normalizeCapabilitiesPayload(res.data as Record<string, unknown>);
}

/** @deprecated préférer fetchUtilisateurCapabilities */
export async function fetchUtilisateurRoles(userId: string): Promise<UserCapabilitiesSummary> {
  return fetchUtilisateurCapabilities(userId);
}

export async function createUtilisateurAdmin(formData: FormData): Promise<void> {
  await apiClient.post('/utilisateur', formData);
}

export async function updateUtilisateur(userId: string, formData: FormData): Promise<void> {
  await apiClient.put(`/utilisateur/${userId}`, formData);
}

export async function deleteUtilisateurAdmin(userId: string): Promise<{ dependencies?: Record<string, number> }> {
  const res = await apiClient.delete(`/utilisateur/${userId}`);
  return res.data ?? {};
}

export function mapUtilisateurApiError(error: unknown): { message: string; code?: string; dependencies?: Record<string, number> } {
  const ax = error as AxiosError<{ error?: string; code?: string; dependencies?: Record<string, number> }>;
  const status = ax.response?.status;
  const data = ax.response?.data;
  const msg = data?.error;
  const code = data?.code;
  if (status === 400) return { message: msg || 'Données invalides.', code };
  if (status === 401) return { message: 'Session expirée.', code };
  if (status === 403) return { message: msg || 'Action non autorisée.', code };
  if (status === 404) return { message: msg || 'Utilisateur introuvable.', code };
  if (status === 409) {
    return {
      message: msg || 'Conflit métier.',
      code,
      dependencies: data?.dependencies,
    };
  }
  if (ax.code === 'ERR_NETWORK') return { message: 'Réseau indisponible.' };
  return { message: msg || 'Erreur lors de l’opération.' };
}

export const ACCOUNT_CREATE_HELP =
  'Créez d’abord le compte, puis activez ses activités depuis les modules Prestataires, Freelances ou Vendeurs.';

export const PRO_ROLE_HINT =
  'Le rôle contrôle l’accès du compte. Les informations professionnelles se gèrent dans les modules Prestataires, Freelances ou Vendeurs.';
