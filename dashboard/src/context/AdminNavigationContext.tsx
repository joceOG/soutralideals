import * as React from 'react';
import {
  fetchAdminNavigationSummary,
  AdminNavigationSummary,
  NavigationBadgeKey,
} from '../services/navigationSummaryService';
import { isAuthenticated } from '../services/setupApi';

const TTL_MS = 60_000;

export type NavigationBadgeTone = 'warning' | 'danger' | 'info';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

interface AdminNavigationContextValue {
  status: FetchStatus;
  summary: AdminNavigationSummary | null;
  getBadgeCount: (key: NavigationBadgeKey) => number | null;
  refreshNavigationSummary: (force?: boolean) => void;
}

const AdminNavigationContext = React.createContext<AdminNavigationContextValue | null>(null);

export function AdminNavigationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<FetchStatus>('idle');
  const [summary, setSummary] = React.useState<AdminNavigationSummary | null>(null);
  const lastFetchAtRef = React.useRef(0);
  const abortRef = React.useRef<AbortController | null>(null);
  const inFlightRef = React.useRef(false);

  const refreshNavigationSummary = React.useCallback((force = false) => {
    if (!isAuthenticated()) {
      setSummary(null);
      setStatus('idle');
      return;
    }
    const now = Date.now();
    if (!force && lastFetchAtRef.current > 0 && now - lastFetchAtRef.current < TTL_MS) {
      return;
    }
    if (inFlightRef.current) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    inFlightRef.current = true;
    setStatus((prev) => (prev === 'success' && summary ? prev : 'loading'));

    fetchAdminNavigationSummary(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setSummary(data);
        setStatus('success');
        lastFetchAtRef.current = Date.now();
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setSummary(null);
        setStatus('error');
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, []);

  React.useEffect(() => {
    refreshNavigationSummary(true);
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial unique
  }, []);

  React.useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastFetchAtRef.current >= TTL_MS) {
        refreshNavigationSummary(true);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshNavigationSummary]);

  const getBadgeCount = React.useCallback(
    (key: NavigationBadgeKey): number | null => {
      if (status !== 'success' || !summary) return null;
      return summary[key];
    },
    [status, summary],
  );

  const value = React.useMemo(
    () => ({ status, summary, getBadgeCount, refreshNavigationSummary }),
    [status, summary, getBadgeCount, refreshNavigationSummary],
  );

  return (
    <AdminNavigationContext.Provider value={value}>
      {children}
    </AdminNavigationContext.Provider>
  );
}

const EMPTY_NAV_BADGES: AdminNavigationContextValue = {
  status: 'idle',
  summary: null,
  getBadgeCount: () => null,
  refreshNavigationSummary: () => {},
};

export function useAdminNavigationBadges(): AdminNavigationContextValue {
  const ctx = React.useContext(AdminNavigationContext);
  return ctx ?? EMPTY_NAV_BADGES;
}

/** Libellés accessibles pour les pastilles (lecteur d'écran). */
export const NAV_BADGE_A11Y_LABELS: Record<NavigationBadgeKey, (n: number) => string> = {
  recensementsPending: (n) =>
    `${n} recensement${n > 1 ? 's' : ''} en attente de validation`,
  ordersPending: (n) => `${n} commande${n > 1 ? 's' : ''} en attente`,
  prestationsPending: (n) => `${n} prestation${n > 1 ? 's' : ''} en attente`,
  paymentsAttention: (n) =>
    `${n} paiement${n > 1 ? 's' : ''} nécessitant une attention`,
  notificationsUnread: (n) =>
    `${n} notification${n > 1 ? 's' : ''} non lue${n > 1 ? 's' : ''}`,
};
