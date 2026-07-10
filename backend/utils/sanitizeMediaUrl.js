const BLOCKED_HOSTS = new Set(['via.placeholder.com', 'placehold.co']);

/**
 * Retire les URLs placeholder / invalides avant envoi au client.
 */
export function sanitizeMediaUrl(url) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const { hostname } = new URL(trimmed);
      if (BLOCKED_HOSTS.has(hostname)) return null;
    } catch {
      return null;
    }
  }

  return trimmed;
}
