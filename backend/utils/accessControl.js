/** Vérifie si l'utilisateur connecté est admin. */
export function isAdmin(req) {
  const role = req.utilisateur?.role?.toUpperCase();
  return role === 'ADMIN';
}

/** Vérifie si l'utilisateur connecté est le propriétaire de la ressource (ou admin). */
export function isOwnerOrAdmin(req, resourceUserId) {
  if (!resourceUserId) return false;
  if (isAdmin(req)) return true;
  return req.utilisateur?._id?.toString() === resourceUserId.toString();
}

/** Répond 403 si l'utilisateur n'est ni propriétaire ni admin. */
export function assertOwnerOrAdmin(req, res, resourceUserId, message) {
  if (isOwnerOrAdmin(req, resourceUserId)) return true;
  res.status(403).json({
    error: message ?? 'Accès refusé : vous ne pouvez accéder qu\'à vos propres données.',
  });
  return false;
}

/** Répond 403 si l'utilisateur n'est pas admin. */
export function assertAdmin(req, res, message) {
  if (isAdmin(req)) return true;
  res.status(403).json({
    error: message ?? 'Accès refusé : droits administrateur requis.',
  });
  return false;
}
