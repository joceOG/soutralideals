import { apiClient } from './setupApi';
import { stripVendeurListRow } from './vendeurService';
import {
  PRESTATAIRE_ACCEPT_IMAGES,
  PRESTATAIRE_MAX_FILE_BYTES,
  validatePrestataireFile,
} from './prestataireService';

export const ARTICLE_MAX_FILE_BYTES = PRESTATAIRE_MAX_FILE_BYTES;
export const ARTICLE_ACCEPT_IMAGES = PRESTATAIRE_ACCEPT_IMAGES;

export interface ArticleListItem {
  _id: string;
  nomArticle: string;
  prixArticle: number | string;
  quantiteArticle: number;
  photoArticle?: string;
  tags: string[];
  categorie?: { _id: string; nomcategorie: string };
  vendeur?: { _id?: string; shopName?: string; shopLogo?: string };
}

export interface BoutiqueContext {
  shopName: string;
  shopLogo: string | null;
}

export interface FetchArticlesParams {
  vendeurId?: string;
  search?: string;
  categorie?: string;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}

export type FetchArticlesResult =
  | {
      mode: 'global';
      items: ArticleListItem[];
      total: number;
    }
  | {
      mode: 'filtered';
      items: ArticleListItem[];
      total: number;
      page: number;
      limit: number;
      boutique: BoutiqueContext;
    };

export function parseVendeurIdFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const v = params.get('vendeur');
  if (!v || !v.trim()) return null;
  return v.trim();
}

export function buildArticlesListUrl(params: {
  vendeurId?: string | null;
  search?: string;
  categorie?: string;
  page?: number;
}): string {
  const q = new URLSearchParams();
  if (params.vendeurId) q.set('vendeur', params.vendeurId);
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.categorie) q.set('categorie', params.categorie);
  if (params.page && params.page > 1) q.set('page', String(params.page));
  const qs = q.toString();
  return qs ? `/articles?${qs}` : '/articles';
}

function normalizeArticleRow(raw: Record<string, unknown>): ArticleListItem {
  return {
    _id: String(raw._id),
    nomArticle: String(raw.nomArticle ?? ''),
    prixArticle: raw.prixArticle as number | string,
    quantiteArticle: Number(raw.quantiteArticle) || 0,
    photoArticle: raw.photoArticle ? String(raw.photoArticle) : undefined,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    categorie: raw.categorie as ArticleListItem['categorie'],
    vendeur: raw.vendeur as ArticleListItem['vendeur'],
  };
}

export async function fetchArticles(params: FetchArticlesParams = {}): Promise<FetchArticlesResult> {
  const { vendeurId, search, categorie, page = 1, limit = 10, signal } = params;

  if (vendeurId) {
    const q = new URLSearchParams();
    q.set('vendeur', vendeurId);
    q.set('page', String(page));
    q.set('limit', String(limit));
    if (search?.trim()) q.set('search', search.trim());
    if (categorie) q.set('categorie', categorie);

    const res = await apiClient.get(`/articles?${q.toString()}`, { signal });
    const data = res.data as {
      items: Record<string, unknown>[];
      total: number;
      page: number;
      limit: number;
      boutique: BoutiqueContext;
    };

    return {
      mode: 'filtered',
      items: (data.items || []).map(normalizeArticleRow),
      total: data.total ?? 0,
      page: data.page ?? page,
      limit: data.limit ?? limit,
      boutique: data.boutique ?? { shopName: '', shopLogo: null },
    };
  }

  const res = await apiClient.get('/articles', { signal });
  const rows = Array.isArray(res.data) ? res.data : [];
  const items = rows.map((r) => normalizeArticleRow(r as Record<string, unknown>));
  return { mode: 'global', items, total: items.length };
}

export function mapArticleListError(error: unknown): { status?: number; message: string } {
  const ax = error as { response?: { status?: number; data?: { error?: string } }; code?: string };
  const status = ax.response?.status;
  const msg = ax.response?.data?.error;
  if (status === 404) return { status, message: msg || 'Boutique introuvable.' };
  if (status === 401) return { status, message: 'Session expirée.' };
  if (status === 403) return { status, message: msg || 'Accès refusé.' };
  if (status === 400) return { status, message: msg || 'Paramètres invalides.' };
  if (ax.code === 'ERR_CANCELED') return { message: 'cancelled' };
  return { status, message: msg || 'Erreur lors du chargement des articles.' };
}

export interface VendeurPickerOption {
  id: string;
  shopName: string;
  shopLogo?: string;
  ownerLabel: string;
  categoriesLabel: string;
  isVerified: boolean;
}

export interface ArticleFormValues {
  nomArticle: string;
  prixArticle: string;
  quantiteArticle: string;
  categorie: string;
  tags: string[];
}

/** Liste admin paginée (limit 200) — pas de recherche serveur dédiée au picker (DASH-8C.2). */
export async function fetchVendeurPickerOptions(signal?: AbortSignal): Promise<VendeurPickerOption[]> {
  const res = await apiClient.get('/vendeur', {
    params: { page: 1, limit: 200 },
    signal,
  });
  let rows: Record<string, unknown>[] = [];
  const data = res.data;
  if (Array.isArray(data)) rows = data as Record<string, unknown>[];
  else if (data && typeof data === 'object' && Array.isArray((data as { vendeurs?: unknown }).vendeurs)) {
    rows = (data as { vendeurs: Record<string, unknown>[] }).vendeurs;
  }

  return rows.map((raw) => {
    const row = stripVendeurListRow(raw) as Record<string, unknown>;
    const u = row.utilisateur as { nom?: string; prenom?: string } | undefined;
    const ownerLabel = u ? `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() : 'Propriétaire';
    const cats = Array.isArray(row.businessCategories)
      ? (row.businessCategories as string[]).slice(0, 3).join(', ')
      : '';
    const vd = row.verificationDocuments as { isVerified?: boolean } | undefined;
    return {
      id: String(row._id),
      shopName: String(row.shopName ?? 'Boutique'),
      shopLogo: row.shopLogo ? String(row.shopLogo) : undefined,
      ownerLabel: ownerLabel || 'Propriétaire',
      categoriesLabel: cats,
      isVerified: Boolean(vd?.isVerified),
    };
  });
}

export function resolveFormVendeurId(params: {
  vendeurIdFromUrl: string | null;
  selectedVendeurId: string;
  editVendeurId?: string | null;
  isUpdate: boolean;
}): string {
  if (params.isUpdate && params.editVendeurId) return String(params.editVendeurId);
  if (params.vendeurIdFromUrl) return params.vendeurIdFromUrl;
  return params.selectedVendeurId.trim();
}

export function validateArticleFile(file: File | null): string | null {
  return validatePrestataireFile(file);
}

export function validateArticleForm(
  values: ArticleFormValues,
  photoFile: File | null,
  options: {
    isUpdate: boolean;
    hasExistingPhoto: boolean;
    resolvedVendeurId: string;
  },
): Record<string, string> {
  const err: Record<string, string> = {};
  if (!values.nomArticle.trim()) err.nomArticle = 'Nom requis.';
  if (!values.categorie) err.categorie = 'Catégorie requise.';
  if (!options.isUpdate && !options.resolvedVendeurId) {
    err.vendeur = 'Sélectionnez une boutique.';
  }
  if (!options.isUpdate) {
    if (!photoFile) err.photoArticle = 'Photo obligatoire pour créer un article.';
    else {
      const fileErr = validateArticleFile(photoFile);
      if (fileErr) err.photoArticle = fileErr;
    }
  } else if (photoFile) {
    const fileErr = validateArticleFile(photoFile);
    if (fileErr) err.photoArticle = fileErr;
  } else if (!options.hasExistingPhoto) {
    err.photoArticle = 'Photo manquante sur cet article.';
  }
  return err;
}

export function buildArticleFormData(
  values: ArticleFormValues,
  photoFile: File | null,
  options: { isUpdate: boolean; vendeurId: string },
): FormData {
  const fd = new FormData();
  fd.append('nomArticle', values.nomArticle.trim());
  fd.append('prixArticle', values.prixArticle || '0');
  fd.append('quantiteArticle', values.quantiteArticle || '0');
  fd.append('categorie', values.categorie);
  fd.append('tags', JSON.stringify(values.tags ?? []));
  if (!options.isUpdate && options.vendeurId) {
    fd.append('vendeur', options.vendeurId);
  }
  if (photoFile) {
    fd.append('photoArticle', photoFile);
  }
  return fd;
}

export async function saveArticle(params: {
  isUpdate: boolean;
  articleId?: string;
  formData: FormData;
}): Promise<void> {
  if (params.isUpdate && params.articleId) {
    await apiClient.put(`/article/${params.articleId}`, params.formData);
  } else {
    await apiClient.post('/article', params.formData);
  }
}

export function mapArticleSaveError(error: unknown): string {
  const mapped = mapArticleListError(error);
  if (mapped.message === 'cancelled') return 'Annulé.';
  return mapped.message;
}
