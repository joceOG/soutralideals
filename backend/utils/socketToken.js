import jwt from 'jsonwebtoken';

const SOCKET_TOKEN_TTL = '5m';

/** Émet un JWT court dédié aux connexions Socket.io (non valable pour l'API HTTP). */
export function issueSocketToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant');
  return jwt.sign(
    { _id: userId.toString(), typ: 'socket' },
    secret,
    { expiresIn: SOCKET_TOKEN_TTL },
  );
}

/** Vérifie un JWT socket et retourne l'ID utilisateur ou null. */
export function verifySocketToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret || !token) return null;
  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.typ !== 'socket') return null;
    return decoded._id || decoded.id || null;
  } catch {
    return null;
  }
}
