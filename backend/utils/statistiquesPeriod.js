/** Fenêtres temporelles — dashboard Statistiques (DASH-7C). */

export const ALLOWED_STATISTIQUES_PERIODES = Object.freeze([
  '7j',
  '30j',
  '90j',
  '6m',
  '1a',
  '7d',
  '30d',
  '3m',
  '12m',
  'personnalise',
]);

const ALIAS = Object.freeze({
  '7d': '7j',
  '30d': '30j',
  '3m': '90j',
  '12m': '1a',
});

const MS_DAY = 24 * 60 * 60 * 1000;

export function normalizePeriodeInput(raw) {
  const p = String(raw ?? '30j').trim();
  return ALIAS[p] || p;
}

/**
 * @returns {{ periode: string, start: Date, end: Date, prevStart: Date, prevEnd: Date } | null}
 */
export function resolveStatistiquesRange(periodeRaw, dateDebut, dateFin, now = new Date()) {
  const periode = normalizePeriodeInput(periodeRaw);

  if (periode === 'personnalise') {
    if (!dateDebut || !dateFin) {
      return { error: 'Période personnalisée : dateDebut et dateFin requises' };
    }
    const start = new Date(dateDebut);
    const end = new Date(dateFin);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return { error: 'Dates personnalisées invalides' };
    }
    const spanMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - spanMs);
    return { periode, start, end, prevStart, prevEnd };
  }

  const daysMap = { '7j': 7, '30j': 30, '90j': 90, '6m': 180, '1a': 365 };
  const days = daysMap[periode];
  if (!days) {
    return null;
  }

  const end = new Date(now);
  const start = new Date(end.getTime() - days * MS_DAY);
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - days * MS_DAY);
  return { periode, start, end, prevStart, prevEnd };
}

export function safeCount(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.floor(v);
}

export function safeAmount(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.round(v * 100) / 100;
}

/** @typedef {'up' | 'down' | 'stable' | 'new'} EvolutionStatus */

/**
 * Évolution en % avec statut (DASH-7C.1).
 * Pas de 100 % artificiel lorsque la période précédente vaut 0.
 * @returns {{ value: number | null, status: EvolutionStatus }}
 */
export function computeEvolution(current, previous, { monetary = false } = {}) {
  const c = monetary ? safeAmount(current) : safeCount(current);
  const p = monetary ? safeAmount(previous) : safeCount(previous);

  if (p > 0) {
    if (c === 0) {
      return { value: -100, status: 'down' };
    }
    const pct = ((c - p) / p) * 100;
    if (!Number.isFinite(pct)) {
      return { value: 0, status: 'stable' };
    }
    const rounded = Math.round(pct * 10) / 10;
    if (rounded === 0) {
      return { value: 0, status: 'stable' };
    }
    return { value: rounded, status: rounded > 0 ? 'up' : 'down' };
  }

  if (c === 0) {
    return { value: 0, status: 'stable' };
  }
  return { value: null, status: 'new' };
}

/** @deprecated Utiliser computeEvolution */
export function evolutionPercent(current, previous) {
  return computeEvolution(current, previous).value ?? 0;
}

export const PAIEMENT_REVENU_STATUTS = ['VALIDE'];

export const CLIENT_ROLE = 'Client';
