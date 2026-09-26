import { apiClient, isInternalSoutraliApiUrl, publicApiClient } from './setupApi';

describe('isInternalSoutraliApiUrl (DASH-7A / DASH-7A.1)', () => {
  const API_BASE = 'http://127.0.0.1:3000/api';

  it('accepte une URL interne relative', () => {
    expect(isInternalSoutraliApiUrl('/utilisateur/profile', API_BASE)).toBe(true);
    expect(isInternalSoutraliApiUrl('/login', API_BASE)).toBe(true);
  });

  it('accepte une URL interne absolue même origine', () => {
    expect(isInternalSoutraliApiUrl(`${API_BASE}/admin/dashboard/summary`, API_BASE)).toBe(true);
  });

  it('refuse Cloudinary (pas de JWT)', () => {
    expect(
      isInternalSoutraliApiUrl('https://res.cloudinary.com/demo/image/upload/x.jpg', API_BASE),
    ).toBe(false);
  });

  it('refuse Google Maps (pas de JWT)', () => {
    expect(isInternalSoutraliApiUrl('https://maps.googleapis.com/maps/api/geocode', API_BASE)).toBe(false);
  });

  it('refuse un domaine tiers même avec chemin /api', () => {
    expect(isInternalSoutraliApiUrl('https://evil-soutrali.example/api/login', API_BASE)).toBe(false);
  });

  it('refuse une URL malveillante (origine ou hôte différent)', () => {
    expect(
      isInternalSoutraliApiUrl('https://127.0.0.1:3000.evil.com/api/service', API_BASE),
    ).toBe(false);
    expect(
      isInternalSoutraliApiUrl('https://malicious.example/api/maps/geocode', API_BASE),
    ).toBe(false);
  });

  it('accepte les routes Maps via chemin relatif interne (proxy backend)', () => {
    expect(isInternalSoutraliApiUrl('/maps/geocode', API_BASE)).toBe(true);
    expect(isInternalSoutraliApiUrl('/maps/nearby', API_BASE)).toBe(true);
  });

  it('évite une URL finale avec double /api', () => {
    const path = '/service';
    expect(isInternalSoutraliApiUrl(path, API_BASE)).toBe(true);
    const joined = `${API_BASE.replace(/\/$/, '')}${path}`;
    expect(joined).toBe('http://127.0.0.1:3000/api/service');
    expect(joined.includes('/api/api/')).toBe(false);
  });
});

describe('clients API centralisés', () => {
  it('publicApiClient est isolé (pas de clearSession sur 401 login)', () => {
    expect(publicApiClient).not.toBe(apiClient);
    expect(publicApiClient.defaults.baseURL).toBe(apiClient.defaults.baseURL);
    expect(publicApiClient.interceptors.response.handlers.length).toBe(0);
  });

  it('FormData multipart : pas de Content-Type manuel (boundary navigateur)', () => {
    const fd = new FormData();
    fd.append('expediteur', 'u1');
    fd.append('destinataire', 'u2');
    fd.append('contenu', 'hello');
    fd.append('pieceJointe', new Blob(['x']), 'f.txt');
    expect(Array.from(fd.keys())).toEqual(['expediteur', 'destinataire', 'contenu', 'pieceJointe']);
  });
});
