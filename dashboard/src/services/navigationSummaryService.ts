import { apiClient } from './setupApi';

export interface AdminNavigationSummary {
  recensementsPending: number;
  ordersPending: number;
  prestationsPending: number;
  paymentsAttention: number;
  notificationsUnread: number;
  updatedAt: string;
}

export type NavigationBadgeKey = keyof Omit<AdminNavigationSummary, 'updatedAt'>;

function parseNonNegativeInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Compteur de navigation invalide');
  }
  return Math.floor(n);
}

function parseNavigationSummary(raw: unknown): AdminNavigationSummary {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Réponse navigation-summary invalide');
  }
  const envelope = raw as { success?: boolean; data?: Record<string, unknown> };
  if (envelope.success !== true || !envelope.data) {
    throw new Error('Réponse navigation-summary incomplète');
  }
  const d = envelope.data;
  return {
    recensementsPending: parseNonNegativeInt(d.recensementsPending),
    ordersPending: parseNonNegativeInt(d.ordersPending),
    prestationsPending: parseNonNegativeInt(d.prestationsPending),
    paymentsAttention: parseNonNegativeInt(d.paymentsAttention),
    notificationsUnread: parseNonNegativeInt(d.notificationsUnread),
    updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : new Date().toISOString(),
  };
}

export async function fetchAdminNavigationSummary(
  signal?: AbortSignal,
): Promise<AdminNavigationSummary> {
  const response = await apiClient.get('/admin/navigation-summary', { signal });
  return parseNavigationSummary(response.data);
}
