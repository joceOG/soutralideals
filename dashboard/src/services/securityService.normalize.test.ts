import {
  normalizeUserSecurityStats,
  normalizeUserSecurityProfile,
  securityStatsErrorMessage,
  buildVirtualSecurityProfile,
  loadSecurityPageData,
  isAbortError,
} from './securityService';

describe('securityService — stats normalizer', () => {
  const baseUninitialized = {
    success: true,
    data: {
      initialized: false,
      twoFactorEnabled: false,
      has2FA: false,
      activeSessions: 0,
      trustedDevices: 0,
      unreadAlerts: 0,
      recentSecurityEvents: 0,
      securityScore: 0,
      totalLogins: 0,
      failedLogins: 0,
      identityVerified: false,
      lastLogin: null,
      lastLoginAt: null,
      lastPasswordChange: null,
      recentLogins: [],
    },
  };

  it('accepte payload initialized false', () => {
    const out = normalizeUserSecurityStats(baseUninitialized);
    expect(out.initialized).toBe(false);
  });

  it('403 reste une erreur d’autorisation', () => {
    const msg = securityStatsErrorMessage({ response: { status: 403 } });
    expect(msg).toMatch(/Accès refusé/);
  });

  it('404 utilisateur reste une erreur', () => {
    expect(securityStatsErrorMessage({ response: { status: 404 } })).toMatch(/introuvable/i);
  });

  it('500 reste une erreur', () => {
    expect(securityStatsErrorMessage({ response: { status: 500 } })).toMatch(/Erreur serveur/);
  });

  it('buildVirtualSecurityProfile refuse initialized true', () => {
    expect(() =>
      buildVirtualSecurityProfile('uid', {
        ...normalizeUserSecurityStats(baseUninitialized),
        initialized: true,
      }),
    ).toThrow(/interdit/);
  });

  it('loadSecurityPageData — uninitialized sans second appel profil', async () => {
    const fetchStats = jest.fn().mockResolvedValue(normalizeUserSecurityStats(baseUninitialized));
    const fetchProfile = jest.fn();
    const out = await loadSecurityPageData('user1', undefined, { fetchStats, fetchProfile });
    expect(out.status).toBe('success');
    if (out.status === 'success') {
      expect(out.uninitialized).toBe(true);
    }
    expect(fetchProfile).not.toHaveBeenCalled();
  });

  it('loadSecurityPageData — erreur réseau stats reste une erreur', async () => {
    await expect(
      loadSecurityPageData('user1', undefined, {
        fetchStats: async () => {
          throw new Error('Network Error');
        },
        fetchProfile: jest.fn(),
      }),
    ).rejects.toThrow(/Network/);
  });

  it('loadSecurityPageData — 403 profil remonte', async () => {
    const initializedStats = {
      success: true,
      data: { ...baseUninitialized.data, initialized: true, securityScore: 10 },
    };
    await expect(
      loadSecurityPageData('user1', undefined, {
        fetchStats: async () => normalizeUserSecurityStats(initializedStats),
        fetchProfile: async () => {
          throw { response: { status: 403 } };
        },
      }),
    ).rejects.toBeTruthy();
  });

  it('normalizeUserSecurityProfile exige initialized', () => {
    expect(() => normalizeUserSecurityProfile({ success: true, data: {} })).toThrow(/initialized/);
  });

  it('isAbortError ne compte pas comme erreur UI', () => {
    expect(isAbortError({ code: 'ERR_CANCELED' })).toBe(true);
    expect(securityStatsErrorMessage({ code: 'ERR_CANCELED' })).toBe('');
  });
});
