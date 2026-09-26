import * as React from 'react';
import {
  apiClient,
  getCurrentUserId,
  getCurrentUserRole,
  getStoredUserIdentity,
  persistUserIdentity,
} from '../services/setupApi';

export interface AdminAccountPresentation {
  displayName: string;
  roleLabel: string;
  initials: string;
}

function formatRoleLabel(role: string | null): string {
  if (!role) return 'Rôle inconnu';
  const r = role.trim();
  if (r.toUpperCase() === 'ADMIN') return 'Administrateur';
  return r;
}

function buildPresentation(nom: string, prenom: string, email: string, role: string | null): AdminAccountPresentation {
  const displayName =
    [prenom, nom].filter(Boolean).join(' ').trim() ||
    email.trim() ||
    'Compte connecté';

  const initialsSource = displayName !== 'Compte connecté' ? displayName : email || 'C';
  const parts = initialsSource.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
      : (initialsSource.slice(0, 2) || 'C').toUpperCase();

  return {
    displayName,
    roleLabel: formatRoleLabel(role),
    initials,
  };
}

export function useAdminAccount(): AdminAccountPresentation {
  const [presentation, setPresentation] = React.useState<AdminAccountPresentation>(() => {
    const stored = getStoredUserIdentity();
    return buildPresentation(stored.nom, stored.prenom, stored.email, getCurrentUserRole());
  });

  React.useEffect(() => {
    const stored = getStoredUserIdentity();
    const role = getCurrentUserRole();
    if (stored.nom || stored.prenom || stored.email) {
      setPresentation(buildPresentation(stored.nom, stored.prenom, stored.email, role));
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) return;

    let cancelled = false;
    apiClient
      .get(`/utilisateur/${userId}`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data ?? {};
        persistUserIdentity({
          nom: String(data.nom ?? ''),
          prenom: String(data.prenom ?? ''),
          email: String(data.email ?? ''),
        });
        setPresentation(
          buildPresentation(
            String(data.nom ?? ''),
            String(data.prenom ?? ''),
            String(data.email ?? ''),
            role,
          ),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPresentation(buildPresentation('', '', '', role));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return presentation;
}
