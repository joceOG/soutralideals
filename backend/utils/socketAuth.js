import jwt from 'jsonwebtoken';
import Utilisateur from '../models/utilisateurModel.js';

/**
 * Authentifie une connexion Socket.io via JWT.
 * Accepte { token }, une chaîne JWT, ou userId brut (dev uniquement).
 */
export async function authenticateSocketUser(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET manquant');
  }

  let token = null;
  let legacyUserId = null;

  if (typeof payload === 'string') {
    if (payload.includes('.')) token = payload;
    else legacyUserId = payload;
  } else if (payload && typeof payload === 'object') {
    token = payload.token ?? null;
    legacyUserId = payload.userId ?? null;
  }

  if (token) {
    const decoded = jwt.verify(token, secret);
    const userId = decoded._id || decoded.id;
    if (!userId) return null;

    const utilisateur = await Utilisateur.findById(userId);
    if (!utilisateur) return null;

    const tokenExists = utilisateur.tokens.some((t) => t.token === token);
    if (!tokenExists) return null;

    return userId.toString();
  }

  if (legacyUserId && process.env.NODE_ENV === 'development') {
    console.warn('[Socket] Auth legacy userId — réservé au développement');
    return legacyUserId.toString();
  }

  return null;
}
