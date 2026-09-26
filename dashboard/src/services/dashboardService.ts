import { apiClient } from './setupApi';

// ── Types canoniques ──────────────────────────────────────────────────────────

export interface DashboardCounts {
  /** Tous les comptes (KPI général) */
  users: number;
  providers: number;
  freelancers: number;
  sellers: number;
  services: number;
  categories: number;
  articles: number;
  freelanceServices?: number;
  orders?: number;
  prestations?: number;
  promotions?: number;
}

export interface DashboardPending {
  total: number;
  providers: number;
  freelancers: number;
  sellers: number;
  fieldRecensements: number;
}

export interface RecentActivity {
  id: string;
  /** Type de profil source */
  type: 'user' | 'provider' | 'freelancer' | 'seller' | 'field_recensement';
  /** Nom d'affichage sûr — jamais "undefined undefined" ni ObjectId */
  label: string;
  /** Contexte court : métier, localisation, type boutique… */
  subLabel?: string;
  /** Statut normalisé en français */
  status?: string;
  createdAt: string;
}

export interface ProfileDistributionItem {
  /** 'clients' | 'providers' | 'freelancers' | 'sellers' */
  type: string;
  label: string;
  count: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  zone: string;
  type: 'provider' | 'seller';
  verified?: boolean;
}

export interface TopLocation {
  zone: string;
  total: number;
}

export interface DashboardSummary {
  generatedAt: string;
  counts: DashboardCounts;
  pending: DashboardPending;
  notifications: { unread: number };
  recent: RecentActivity[];
  profileDistribution: ProfileDistributionItem[];
  geo: {
    points: GeoPoint[];
    topLocations: TopLocation[];
  };
}

export type DashboardEvolutionPeriod = '30d' | '3m' | '6m' | '12m';

export interface DashboardEvolutionBucket {
  key: string;
  label: string;
}

export interface DashboardEvolutionSeries {
  clients: number[];
  prestataires: number[];
  freelances: number[];
  vendeurs: number[];
}

export interface DashboardEvolution {
  period: DashboardEvolutionPeriod;
  granularity: 'day' | 'month';
  buckets: DashboardEvolutionBucket[];
  series: DashboardEvolutionSeries;
  generatedAt: string;
}

export const DASHBOARD_EVOLUTION_PERIODS: DashboardEvolutionPeriod[] = ['30d', '3m', '6m', '12m'];

// ── Mapping statuts français ──────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  pending: 'En attente',
  approved: 'Validé',
  verified: 'Vérifié',
  rejected: 'Rejeté',
  inactive: 'Inactif',
  suspended: 'Suspendu',
  draft: 'Brouillon',
  incomplete: 'Incomplet',
  Active: 'Actif',
  Pending: 'En attente',
  Suspended: 'Suspendu',
  pending_review: 'En révision',
  needs_correction: 'À corriger',
  Client: 'Client',
  Prestataire: 'Prestataire',
  Freelance: 'Freelance',
  Vendeur: 'Vendeur',
  Admin: 'Admin',
};

export function localizeStatus(s?: string | null): string | undefined {
  if (!s) return undefined;
  return STATUS_LABELS[s] ?? s;
}

// ── Fetch + normalisation ──────────────────────────────────────────────────────

export async function fetchDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  let response;
  try {
    response = await apiClient.get('/admin/dashboard/summary', { signal });
  } catch (err: any) {
    if (err?.name === 'CanceledError' || err?.name === 'AbortError') throw err;
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      throw new Error('Session expirée ou accès refusé. Veuillez vous reconnecter.');
    }
    if (status === 500) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? '';
      throw new Error(
        `Erreur interne du serveur.${msg ? ` (${msg})` : ''} Redémarrez le backend puis réessayez.`
      );
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Pas de connexion réseau. Vérifiez votre connexion.');
    }
    throw new Error(err?.message ?? 'Erreur réseau inconnue.');
  }
  return normalizeSummary(response.data);
}

export async function fetchDashboardEvolution(
  period: DashboardEvolutionPeriod,
  signal?: AbortSignal,
): Promise<DashboardEvolution> {
  let response;
  try {
    response = await apiClient.get('/admin/dashboard/evolution', {
      params: { period },
      signal,
    });
  } catch (err: unknown) {
    const e = err as { name?: string; response?: { status?: number; data?: { error?: string } }; message?: string };
    if (e?.name === 'CanceledError' || e?.name === 'AbortError') throw err;
    if (e?.response?.status === 400) {
      throw new Error(e.response?.data?.error ?? 'Période invalide.');
    }
    if (e?.response?.status === 401 || e?.response?.status === 403) {
      throw new Error('Session expirée ou accès refusé.');
    }
    throw new Error(e?.message ?? 'Impossible de charger l’évolution.');
  }
  return normalizeDashboardEvolution(response.data, period);
}

/** Validation stricte du contrat evolution (tests + runtime). */
export function normalizeDashboardEvolution(raw: unknown, requestedPeriod?: DashboardEvolutionPeriod): DashboardEvolution {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Réponse evolution invalide');
  }
  const envelope = raw as { success?: boolean; data?: Record<string, unknown> };
  if (envelope.success !== true || !envelope.data) {
    throw new Error('Réponse evolution incomplète');
  }
  const d = envelope.data;
  const period = String(d.period ?? '') as DashboardEvolutionPeriod;
  if (!DASHBOARD_EVOLUTION_PERIODS.includes(period)) {
    throw new Error('Période evolution inconnue');
  }
  if (requestedPeriod && period !== requestedPeriod) {
    throw new Error('Période evolution incohérente');
  }
  const granularity = d.granularity === 'day' || d.granularity === 'month' ? d.granularity : null;
  if (!granularity) {
    throw new Error('Granularité evolution invalide');
  }
  if (!Array.isArray(d.buckets) || d.buckets.length === 0) {
    throw new Error('Buckets evolution manquants');
  }
  const buckets: DashboardEvolutionBucket[] = d.buckets.map((b, idx) => {
    if (!b || typeof b !== 'object') throw new Error(`Bucket ${idx} invalide`);
    const row = b as Record<string, unknown>;
    const key = typeof row.key === 'string' ? row.key : '';
    const label = typeof row.label === 'string' ? row.label : '';
    if (!key || !label) throw new Error(`Bucket ${idx} incomplet`);
    return { key, label };
  });

  const rawSeries = d.series;
  if (!rawSeries || typeof rawSeries !== 'object') {
    throw new Error('Séries evolution manquantes');
  }
  const seriesKeys = ['clients', 'prestataires', 'freelances', 'vendeurs'] as const;
  const series = {} as DashboardEvolutionSeries;
  for (const sk of seriesKeys) {
    const arr = (rawSeries as Record<string, unknown>)[sk];
    if (!Array.isArray(arr)) {
      throw new Error(`Série ${sk} manquante`);
    }
    if (arr.length !== buckets.length) {
      throw new Error(`Série ${sk} : longueur incorrecte`);
    }
    series[sk] = arr.map((v, i) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error(`Valeur non numérique (${sk}[${i}])`);
      }
      return Math.floor(n);
    });
  }

  return {
    period,
    granularity,
    buckets,
    series,
    generatedAt: typeof d.generatedAt === 'string' ? d.generatedAt : new Date().toISOString(),
  };
}

function normalizeSummary(raw: unknown): DashboardSummary {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Réponse API invalide : valeur nulle ou non-objet');
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.error === 'string' && !r.counts) {
    throw new Error(r.error);
  }

  const rawCounts = isObj(r.counts) ? (r.counts as Record<string, unknown>) : null;
  if (!rawCounts) throw new Error('Réponse API invalide : bloc counts manquant');

  const rawPending = isObj(r.pending) ? (r.pending as Record<string, unknown>) : null;
  if (!rawPending || typeof rawPending.total !== 'number') {
    throw new Error('Réponse API invalide : bloc pending.total manquant');
  }

  const rawNotif = isObj(r.notifications) ? (r.notifications as Record<string, unknown>) : null;
  const rawGeo = isObj(r.geo) ? (r.geo as Record<string, unknown>) : null;

  return {
    generatedAt: typeof r.generatedAt === 'string' ? r.generatedAt : new Date().toISOString(),
    counts: {
      users: toInt(rawCounts.users),
      providers: toInt(rawCounts.providers),
      freelancers: toInt(rawCounts.freelancers),
      sellers: toInt(rawCounts.sellers),
      services: toInt(rawCounts.services),
      categories: toInt(rawCounts.categories),
      articles: toInt(rawCounts.articles),
      ...(rawCounts.freelanceServices != null && { freelanceServices: toInt(rawCounts.freelanceServices) }),
      ...(rawCounts.orders != null && { orders: toInt(rawCounts.orders) }),
      ...(rawCounts.prestations != null && { prestations: toInt(rawCounts.prestations) }),
      ...(rawCounts.promotions != null && { promotions: toInt(rawCounts.promotions) }),
    },
    pending: {
      total: toInt(rawPending.total),
      providers: toInt(rawPending.providers),
      freelancers: toInt(rawPending.freelancers),
      sellers: toInt(rawPending.sellers),
      fieldRecensements: toInt(rawPending.fieldRecensements),
    },
    notifications: { unread: rawNotif ? toInt(rawNotif.unread) : 0 },
    recent: Array.isArray(r.recent)
      ? (r.recent as any[]).map(normalizeRecentItem).filter(Boolean) as RecentActivity[]
      : [],
    profileDistribution: Array.isArray(r.profileDistribution)
      ? (r.profileDistribution as any[])
        .map(p => ({
          type: String(p.type ?? ''),
          label: String(p.label ?? ''),
          count: toInt(p.count),
        }))
        .filter(p => p.type && p.count > 0)
      : [],
    geo: {
      points: Array.isArray(rawGeo?.points)
        ? (rawGeo!.points as any[]).map((p): GeoPoint | null => {
          const lat = Number(p.lat ?? 0);
          const lng = Number(p.lng ?? 0);
          if (!lat || !lng) return null;
          return {
            lat,
            lng,
            zone: typeof p.zone === 'string' && p.zone.trim() ? p.zone.trim() : 'Inconnue',
            type: p.type === 'seller' ? 'seller' : 'provider',
            verified: Boolean(p.verified),
          };
        }).filter(Boolean) as GeoPoint[]
        : [],
      topLocations: Array.isArray(rawGeo?.topLocations)
        ? (rawGeo!.topLocations as any[])
          .map(t => ({
            zone: typeof t.zone === 'string' ? t.zone.trim() : '',
            total: toInt(t.total),
          }))
          .filter(t => t.zone && t.total > 0)
        : [],
    },
  };
}

function isObj(v: unknown): boolean {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function normalizeRecentItem(item: unknown): RecentActivity | null {
  if (!item || typeof item !== 'object') return null;
  const i = item as Record<string, unknown>;
  if (typeof i.id !== 'string' || typeof i.createdAt !== 'string') return null;

  // Sécurité : rejeter les labels qui ressemblent à un ObjectId (24 hex chars)
  const rawLabel = typeof i.label === 'string' ? i.label.trim() : '';
  const isObjectId = /^[0-9a-f]{24}$/i.test(rawLabel);
  const label = (rawLabel && !isObjectId) ? rawLabel : 'Profil sans nom';

  const rawSub = typeof i.subLabel === 'string' ? i.subLabel.trim() : '';
  const isObjectIdSub = /^[0-9a-f]{24}$/i.test(rawSub);
  const subLabel = (rawSub && !isObjectIdSub) ? rawSub : undefined;

  return {
    id: i.id,
    type: (i.type as any) ?? 'user',
    label,
    subLabel,
    status: typeof i.status === 'string' ? i.status : undefined,
    createdAt: i.createdAt,
  };
}

// ── Utilitaires d'affichage ───────────────────────────────────────────────────

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString('fr-FR');
}

/** Formatage relatif précis — jamais "0 min", jamais "Invalid Date" */
export function formatDate(ds: string | undefined | null): string {
  if (!ds) return 'Date indisponible';
  const d = new Date(ds);
  if (isNaN(d.getTime())) return 'Date indisponible';
  const diffMs = Date.now() - d.getTime();
  const diffMin = diffMs / 60_000;
  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${Math.floor(diffMin)} min`;
  const diffH = diffMin / 60;
  if (diffH < 24) return `Il y a ${Math.floor(diffH)} h`;
  const diffD = diffH / 24;
  if (diffD < 2) return 'Hier';
  if (diffD < 7) return `Il y a ${Math.floor(diffD)} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getLabelForType(type: string): string {
  const map: Record<string, string> = {
    user: 'Utilisateur',
    provider: 'Prestataire',
    freelancer: 'Freelance',
    seller: 'Vendeur',
    field_recensement: 'Recensement',
  };
  return map[type] ?? type;
}
