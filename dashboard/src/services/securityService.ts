import { apiClient } from './setupApi';

export type UserSecurityStats = {
  initialized: boolean;
  twoFactorEnabled: boolean;
  has2FA: boolean;
  activeSessions: number;
  trustedDevices: number;
  unreadAlerts: number;
  recentSecurityEvents: number;
  securityScore: number;
  totalLogins: number;
  failedLogins: number;
  identityVerified: boolean;
  lastLogin: string | null;
  lastLoginAt: string | null;
  lastPasswordChange: string | null;
  recentLogins: Array<{
    loginTime?: string;
    success?: boolean;
    twoFactorUsed?: boolean;
    deviceInfo?: { name?: string; type?: string };
  }>;
};

export type UserSecurityProfilePayload = Record<string, unknown> & {
  initialized: boolean;
};

function finiteCount(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Champ invalide : ${field}`);
  }
  return Math.floor(n);
}

function optionalIsoDate(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Date invalide : ${field}`);
  }
  return d.toISOString();
}

export function normalizeUserSecurityStats(raw: unknown): UserSecurityStats {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Réponse statistiques sécurité invalide');
  }
  const envelope = raw as Record<string, unknown>;
  const data = (envelope.data ?? envelope.stats ?? envelope) as Record<string, unknown>;

  if (typeof data.initialized !== 'boolean') {
    throw new Error('Champ obligatoire manquant : initialized');
  }

  const twoFactorEnabled = Boolean(data.twoFactorEnabled ?? data.has2FA ?? false);

  return {
    initialized: data.initialized,
    twoFactorEnabled,
    has2FA: Boolean(data.has2FA ?? twoFactorEnabled),
    activeSessions: finiteCount(data.activeSessions ?? 0, 'activeSessions'),
    trustedDevices: finiteCount(data.trustedDevices ?? 0, 'trustedDevices'),
    unreadAlerts: finiteCount(data.unreadAlerts ?? data.recentSecurityEvents ?? 0, 'unreadAlerts'),
    recentSecurityEvents: finiteCount(
      data.recentSecurityEvents ?? data.unreadAlerts ?? 0,
      'recentSecurityEvents',
    ),
    securityScore: finiteCount(data.securityScore ?? 0, 'securityScore'),
    totalLogins: finiteCount(data.totalLogins ?? 0, 'totalLogins'),
    failedLogins: finiteCount(data.failedLogins ?? 0, 'failedLogins'),
    identityVerified: Boolean(data.identityVerified ?? false),
    lastLogin: optionalIsoDate(data.lastLogin ?? data.lastLoginAt, 'lastLogin'),
    lastLoginAt: optionalIsoDate(data.lastLoginAt ?? data.lastLogin, 'lastLoginAt'),
    lastPasswordChange: optionalIsoDate(data.lastPasswordChange, 'lastPasswordChange'),
    recentLogins: Array.isArray(data.recentLogins) ? data.recentLogins : [],
  };
}

export function normalizeUserSecurityProfile(raw: unknown): UserSecurityProfilePayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Réponse profil sécurité invalide');
  }
  const envelope = raw as Record<string, unknown>;
  const legacy = envelope.security as Record<string, unknown> | undefined;
  const data = (envelope.data ?? legacy ?? envelope) as Record<string, unknown>;
  if (typeof data.initialized !== 'boolean') {
    throw new Error('Champ obligatoire manquant : initialized');
  }
  return data as UserSecurityProfilePayload;
}

export async function fetchUserSecurityStats(
  userId: string,
  signal?: AbortSignal,
): Promise<UserSecurityStats> {
  const response = await apiClient.get(`/security/user/${userId}/stats`, { signal });
  return normalizeUserSecurityStats(response.data);
}

export async function fetchUserSecurityProfile(
  userId: string,
  signal?: AbortSignal,
): Promise<UserSecurityProfilePayload> {
  const response = await apiClient.get(`/security/user/${userId}`, { signal });
  return normalizeUserSecurityProfile(response.data);
}

export function isAbortError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    return (err as { code?: string }).code === 'ERR_CANCELED';
  }
  if (err instanceof Error && err.name === 'CanceledError') return true;
  return false;
}

export function securityStatsErrorMessage(err: unknown): string {
  if (isAbortError(err)) return '';
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { status?: number; data?: { error?: string } } }).response;
    const status = resp?.status;
    if (status === 403) return 'Accès refusé à ces statistiques de sécurité.';
    if (status === 404) return 'Utilisateur introuvable.';
    if (status === 401) return 'Session expirée ou non authentifié.';
    if (status === 400) return 'Identifiant utilisateur invalide.';
    if (status === 500) return 'Erreur serveur lors du chargement de la sécurité.';
    if (resp?.data?.error) return resp.data.error;
  }
  if (err instanceof Error && err.message.startsWith('Champ')) {
    return 'Réponse serveur invalide pour les statistiques de sécurité.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Impossible de charger les statistiques de sécurité.';
}

/**
 * Profil virtuel — uniquement si stats.initialized === false (réponse backend explicite).
 */
export function buildVirtualSecurityProfile(
  userId: string,
  stats: UserSecurityStats,
): Record<string, unknown> {
  if (stats.initialized) {
    throw new Error('buildVirtualSecurityProfile interdit si initialized est true');
  }
  return {
    utilisateur: userId,
    twoFactorAuth: {
      enabled: stats.twoFactorEnabled,
      backupCodes: [],
    },
    trustedDevices: [],
    activeSessions: [],
    loginHistory: stats.recentLogins,
    securityAlerts: [],
    securitySettings: {
      emailNotifications: {
        newLogin: true,
        newDevice: true,
        passwordChange: true,
        suspiciousActivity: true,
      },
      sessionTimeout: 30,
      maxConcurrentSessions: 5,
      allowedCountries: [],
      blockedCountries: [],
      allowedIPs: [],
      blockedIPs: [],
    },
    securityStats: {
      securityScore: stats.securityScore,
      totalLogins: stats.totalLogins,
      failedLogins: stats.failedLogins,
      lastLogin: stats.lastLogin,
      averageSessionDuration: 0,
      mostUsedDevice: '',
      mostUsedLocation: '',
    },
  };
}

export function profilePayloadToUiModel(
  userId: string,
  profile: UserSecurityProfilePayload,
): Record<string, unknown> {
  const settings = (profile.securitySettings as Record<string, unknown>) || {};
  const emailNotifications = (settings.emailNotifications as Record<string, boolean>) || {
    newLogin: true,
    newDevice: true,
    passwordChange: true,
    suspiciousActivity: true,
  };
  const statsBlock = (profile.securityStats as Record<string, unknown>) || {};
  const twoFactor = (profile.twoFactorAuth as Record<string, unknown>) || {};

  return {
    utilisateur: String(profile.utilisateur ?? userId),
    twoFactorAuth: {
      enabled: Boolean(profile.twoFactorEnabled ?? twoFactor.enabled ?? false),
      backupCodes: [],
    },
    trustedDevices: Array.isArray(profile.trustedDevices) ? profile.trustedDevices : [],
    activeSessions: Array.isArray(profile.activeSessions) ? profile.activeSessions : [],
    loginHistory: Array.isArray(profile.loginHistory) ? profile.loginHistory : [],
    securityAlerts: Array.isArray(profile.securityAlerts) ? profile.securityAlerts : [],
    securitySettings: {
      emailNotifications,
      sessionTimeout: Number(settings.sessionTimeout ?? 30),
      maxConcurrentSessions: Number(settings.maxConcurrentSessions ?? 5),
      allowedCountries: Array.isArray(settings.allowedCountries) ? settings.allowedCountries : [],
      blockedCountries: Array.isArray(settings.blockedCountries) ? settings.blockedCountries : [],
      allowedIPs: Array.isArray(settings.allowedIPs) ? settings.allowedIPs : [],
      blockedIPs: Array.isArray(settings.blockedIPs) ? settings.blockedIPs : [],
    },
    securityStats: {
      securityScore: Number(statsBlock.securityScore ?? 0),
      totalLogins: Number(statsBlock.totalLogins ?? 0),
      failedLogins: Number(statsBlock.failedLogins ?? 0),
      lastLogin: statsBlock.lastLogin ?? null,
      averageSessionDuration: Number(statsBlock.averageSessionDuration ?? 0),
      mostUsedDevice: String(statsBlock.mostUsedDevice ?? ''),
      mostUsedLocation: String(statsBlock.mostUsedLocation ?? ''),
    },
  };
}

export type SecurityPageLoadResult =
  | { status: 'success'; uninitialized: boolean; profile: Record<string, unknown> }
  | { status: 'error'; message: string };

/**
 * Orchestration pure du chargement (testable).
 * Ne construit jamais de profil virtuel depuis une erreur réseau.
 */
export async function loadSecurityPageData(
  userId: string,
  signal: AbortSignal | undefined,
  deps: {
    fetchStats: typeof fetchUserSecurityStats;
    fetchProfile: typeof fetchUserSecurityProfile;
  } = {
    fetchStats: fetchUserSecurityStats,
    fetchProfile: fetchUserSecurityProfile,
  },
): Promise<SecurityPageLoadResult> {
  const stats = await deps.fetchStats(userId, signal);

  if (!stats.initialized) {
    return {
      status: 'success',
      uninitialized: true,
      profile: buildVirtualSecurityProfile(userId, stats),
    };
  }

  const profilePayload = await deps.fetchProfile(userId, signal);
  if (!profilePayload.initialized) {
    throw new Error('Incohérence : stats initialisées mais profil non initialisé');
  }

  return {
    status: 'success',
    uninitialized: false,
    profile: profilePayloadToUiModel(userId, profilePayload),
  };
}
