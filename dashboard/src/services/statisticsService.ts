import { apiClient } from './setupApi';

export type StatistiquesPeriode = '7j' | '30j' | '90j' | '1a' | 'personnalise';

export type EvolutionStatus = 'up' | 'down' | 'stable' | 'new';

export interface StatistiquesQueryParams {
  periode: string;
  dateDebut?: string;
  dateFin?: string;
}

export interface FetchStatistiquesParams {
  periode: StatistiquesPeriode | string;
  dateDebut?: string;
  dateFin?: string;
  signal?: AbortSignal;
}

export interface StatsGenerales {
  totalUtilisateurs: number;
  totalCommandes: number;
  totalPrestations: number;
  chiffreAffaires: number;
  evolutionUtilisateurs: number | null;
  evolutionUtilisateursStatus: EvolutionStatus;
  evolutionCommandes: number | null;
  evolutionCommandesStatus: EvolutionStatus;
  evolutionPrestations: number | null;
  evolutionPrestationsStatus: EvolutionStatus;
  evolutionCA: number | null;
  evolutionCAStatus: EvolutionStatus;
  periode?: string;
  generatedAt?: string;
}

export interface StatsTemporellesPoint {
  period: string;
  utilisateurs: number;
  commandes: number;
  prestations: number;
  chiffreAffaires: number;
}

export interface StatsCategorie {
  categorie: string;
  /** Inventaire catalogue actuel — non filtré par période */
  servicesActifsCatalogue: number;
  nombreCommandes: number;
  chiffreAffaires: number;
}

export interface StatsPaiement {
  methode: string;
  name: string;
  nombre: number;
  montant: number;
  pourcentage: number;
}

export interface StatsGeographique {
  ville: string;
  utilisateurs: number;
  commandes: number;
  chiffreAffaires: number;
}

export interface StatistiquesBundle {
  generales: StatsGenerales;
  temporelles: StatsTemporellesPoint[];
  categories: StatsCategorie[];
  paiements: StatsPaiement[];
  geographiques: StatsGeographique[];
}

export type StatistiquesLoadState =
  | { status: 'loading' }
  | { status: 'success'; data: StatistiquesBundle; empty: boolean }
  | { status: 'error'; message: string };

const EVOLUTION_STATUSES: EvolutionStatus[] = ['up', 'down', 'stable', 'new'];

function finiteNonNegative(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Champ invalide : ${field}`);
  }
  return n;
}

function normalizeEvolutionStatus(raw: unknown, field: string): EvolutionStatus {
  const s = String(raw ?? '');
  if (!EVOLUTION_STATUSES.includes(s as EvolutionStatus)) {
    throw new Error(`Statut d’évolution invalide : ${field}`);
  }
  return s as EvolutionStatus;
}

function normalizeEvolutionValue(
  raw: unknown,
  status: EvolutionStatus,
  field: string,
): number | null {
  if (raw === null || raw === undefined) {
    if (status === 'new') return null;
    throw new Error(`Évolution manquante incompatible avec le statut : ${field}`);
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`Champ invalide : ${field}`);
  }
  if (status === 'new') {
    throw new Error(`Évolution numérique incompatible avec le statut new : ${field}`);
  }
  return n;
}

export function buildStatistiquesQueryParams(
  params: FetchStatistiquesParams,
): StatistiquesQueryParams {
  const periode = String(params.periode ?? '30j');
  if (periode === 'personnalise') {
    return {
      periode,
      dateDebut: params.dateDebut,
      dateFin: params.dateFin,
    };
  }
  return { periode };
}

/** Période personnalisée : les deux dates doivent être renseignées avant tout appel API. */
export function canStartStatistiquesFetch(params: FetchStatistiquesParams): boolean {
  if (params.periode !== 'personnalise') return true;
  const deb = String(params.dateDebut ?? '').trim();
  const fin = String(params.dateFin ?? '').trim();
  return deb.length > 0 && fin.length > 0;
}

export function formatEvolutionDisplay(
  value: number | null,
  status: EvolutionStatus,
): { text: string; showTrendUpIcon: boolean; tooltip?: string } {
  if (status === 'new') {
    return {
      text: 'Nouveau',
      showTrendUpIcon: false,
      tooltip: 'Aucune valeur sur la période précédente',
    };
  }
  if (status === 'stable' || value === 0) {
    return { text: '0 %', showTrendUpIcon: false };
  }
  if (value === null) {
    return { text: '—', showTrendUpIcon: false };
  }
  const prefix = value > 0 ? '+' : '';
  return {
    text: `${prefix}${value} %`,
    showTrendUpIcon: value > 0,
  };
}

export function normalizeStatsGenerales(raw: unknown): StatsGenerales {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Réponse générales invalide');
  }
  const o = raw as Record<string, unknown>;

  const evolutionUtilisateursStatus = normalizeEvolutionStatus(
    o.evolutionUtilisateursStatus,
    'evolutionUtilisateursStatus',
  );
  const evolutionCommandesStatus = normalizeEvolutionStatus(
    o.evolutionCommandesStatus,
    'evolutionCommandesStatus',
  );
  const evolutionPrestationsStatus = normalizeEvolutionStatus(
    o.evolutionPrestationsStatus,
    'evolutionPrestationsStatus',
  );
  const evolutionCAStatus = normalizeEvolutionStatus(
    o.evolutionCAStatus,
    'evolutionCAStatus',
  );

  return {
    totalUtilisateurs: finiteNonNegative(o.totalUtilisateurs, 'totalUtilisateurs'),
    totalCommandes: finiteNonNegative(o.totalCommandes, 'totalCommandes'),
    totalPrestations: finiteNonNegative(o.totalPrestations, 'totalPrestations'),
    chiffreAffaires: finiteNonNegative(o.chiffreAffaires, 'chiffreAffaires'),
    evolutionUtilisateurs: normalizeEvolutionValue(
      o.evolutionUtilisateurs,
      evolutionUtilisateursStatus,
      'evolutionUtilisateurs',
    ),
    evolutionUtilisateursStatus,
    evolutionCommandes: normalizeEvolutionValue(
      o.evolutionCommandes,
      evolutionCommandesStatus,
      'evolutionCommandes',
    ),
    evolutionCommandesStatus,
    evolutionPrestations: normalizeEvolutionValue(
      o.evolutionPrestations,
      evolutionPrestationsStatus,
      'evolutionPrestations',
    ),
    evolutionPrestationsStatus,
    evolutionCA: normalizeEvolutionValue(o.evolutionCA, evolutionCAStatus, 'evolutionCA'),
    evolutionCAStatus,
    periode: typeof o.periode === 'string' ? o.periode : undefined,
    generatedAt: typeof o.generatedAt === 'string' ? o.generatedAt : undefined,
  };
}

export function normalizeStatsTemporelles(raw: unknown): StatsTemporellesPoint[] {
  if (!Array.isArray(raw)) {
    throw new Error('Série temporelle invalide');
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Point temporel invalide à l’index ${index}`);
    }
    const p = item as Record<string, unknown>;
    return {
      period: String(p.period ?? ''),
      utilisateurs: finiteNonNegative(p.utilisateurs, `utilisateurs[${index}]`),
      commandes: finiteNonNegative(p.commandes, `commandes[${index}]`),
      prestations: finiteNonNegative(p.prestations, `prestations[${index}]`),
      chiffreAffaires: finiteNonNegative(p.chiffreAffaires, `chiffreAffaires[${index}]`),
    };
  });
}

export function normalizeStatsCategories(raw: unknown): StatsCategorie[] {
  if (!Array.isArray(raw)) {
    throw new Error('Statistiques catégories invalides');
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Catégorie invalide à l’index ${index}`);
    }
    const c = item as Record<string, unknown>;
    const catalogue =
      c.servicesActifsCatalogue ?? c.nombreServices;
    return {
      categorie: String(c.categorie ?? 'Sans catégorie'),
      servicesActifsCatalogue: finiteNonNegative(
        catalogue,
        `servicesActifsCatalogue[${index}]`,
      ),
      nombreCommandes: finiteNonNegative(c.nombreCommandes, `nombreCommandes[${index}]`),
      chiffreAffaires: finiteNonNegative(c.chiffreAffaires, `chiffreAffaires[${index}]`),
    };
  });
}

export function normalizeStatsPaiements(raw: unknown): StatsPaiement[] {
  if (!Array.isArray(raw)) {
    throw new Error('Statistiques paiements invalides');
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Paiement invalide à l’index ${index}`);
    }
    const p = item as Record<string, unknown>;
    const methode = String(p.methode ?? p.name ?? 'Inconnu');
    const pourcentage = Number(p.pourcentage);
    if (!Number.isFinite(pourcentage) || pourcentage < 0 || pourcentage > 100) {
      throw new Error(`pourcentage[${index}] invalide`);
    }
    return {
      methode,
      name: String(p.name ?? methode),
      nombre: finiteNonNegative(p.nombre, `nombre[${index}]`),
      montant: finiteNonNegative(p.montant, `montant[${index}]`),
      pourcentage,
    };
  });
}

export function normalizeStatsGeographiques(raw: unknown): StatsGeographique[] {
  if (!Array.isArray(raw)) {
    throw new Error('Statistiques géographiques invalides');
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Entrée géo invalide à l’index ${index}`);
    }
    const g = item as Record<string, unknown>;
    return {
      ville: String(g.ville ?? ''),
      utilisateurs: finiteNonNegative(g.utilisateurs, `utilisateurs[${index}]`),
      commandes: finiteNonNegative(g.commandes, `commandes[${index}]`),
      chiffreAffaires: finiteNonNegative(g.chiffreAffaires, `chiffreAffaires[${index}]`),
    };
  });
}

export function isStatistiquesBundleEmpty(bundle: StatistiquesBundle): boolean {
  const g = bundle.generales;
  const totals =
    g.totalUtilisateurs +
    g.totalCommandes +
    g.totalPrestations +
    g.chiffreAffaires;
  const lists =
    bundle.temporelles.length +
    bundle.categories.length +
    bundle.paiements.length +
    bundle.geographiques.length;
  return totals === 0 && lists === 0;
}

async function getWithQuery<T>(
  path: string,
  params: FetchStatistiquesParams,
  normalize: (raw: unknown) => T,
): Promise<T> {
  const query = buildStatistiquesQueryParams(params);
  const res = await apiClient.get(path, { params: query, signal: params.signal });
  return normalize(res.data);
}

export async function fetchStatistiquesOverview(
  params: FetchStatistiquesParams,
): Promise<Pick<StatistiquesBundle, 'generales' | 'temporelles' | 'paiements'>> {
  const [generales, temporelles, paiements] = await Promise.all([
    getWithQuery('/statistiques/generales', params, normalizeStatsGenerales),
    getWithQuery('/statistiques/temporelles', params, normalizeStatsTemporelles),
    getWithQuery('/statistiques/paiements', params, normalizeStatsPaiements),
  ]);
  return { generales, temporelles, paiements };
}

export async function fetchStatistiquesCategories(
  params: FetchStatistiquesParams,
): Promise<StatsCategorie[]> {
  return getWithQuery('/statistiques/categories', params, normalizeStatsCategories);
}

export async function fetchStatistiquesGeographiques(
  params: FetchStatistiquesParams,
): Promise<StatsGeographique[]> {
  return getWithQuery('/statistiques/geographiques', params, normalizeStatsGeographiques);
}

export async function fetchStatistiquesBundle(
  params: FetchStatistiquesParams,
): Promise<StatistiquesBundle> {
  const query = buildStatistiquesQueryParams(params);
  const req = { params: query, signal: params.signal };

  const [generalesRes, temporellesRes, categoriesRes, paiementsRes, geoRes] =
    await Promise.all([
      apiClient.get('/statistiques/generales', req),
      apiClient.get('/statistiques/temporelles', req),
      apiClient.get('/statistiques/categories', req),
      apiClient.get('/statistiques/paiements', req),
      apiClient.get('/statistiques/geographiques', req),
    ]);

  return {
    generales: normalizeStatsGenerales(generalesRes.data),
    temporelles: normalizeStatsTemporelles(temporellesRes.data),
    categories: normalizeStatsCategories(categoriesRes.data),
    paiements: normalizeStatsPaiements(paiementsRes.data),
    geographiques: normalizeStatsGeographiques(geoRes.data),
  };
}

export function statistiquesErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { status?: number; data?: { error?: string } } }).response;
    if (resp?.data?.error) return resp.data.error;
    if (resp?.status === 401) return 'Session expirée ou non authentifié.';
    if (resp?.status === 403) return 'Accès réservé aux administrateurs.';
    if (resp?.status === 400) return 'Paramètres de période invalides.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Impossible de charger les statistiques.';
}
