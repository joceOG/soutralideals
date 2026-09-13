import crypto from 'crypto';
import Utilisateur from '../models/utilisateurModel.js';
import { issueSocketToken } from '../utils/socketToken.js';

function requestIdOf(req) {
  return req.id || req.headers['x-request-id'] || crypto.randomUUID();
}

function logRefresh({ requestId, status, durationMs, mongoMs, code }) {
  console.info(JSON.stringify({
    event: 'REFRESH_TOKEN',
    method: 'POST',
    route: '/api/refresh-token',
    status,
    durationMs,
    mongoMs,
    code,
    requestId,
  }));
}

export const refreshAccessToken = async (req, res) => {
  const started = Date.now();
  const requestId = requestIdOf(req);
  res.setHeader('X-Request-Id', requestId);
  let mongoMs = 0;
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logRefresh({
        requestId,
        status: 401,
        durationMs: Date.now() - started,
        mongoMs,
        code: 'REFRESH_MISSING',
      });
      return res.status(401).json({ error: 'Refresh token manquant.', code: 'REFRESH_MISSING' });
    }

    const mongoStart = Date.now();
    const user = await Utilisateur.findOne({
      'refreshTokens.token': refreshToken,
      'refreshTokens.expiresAt': { $gt: new Date() }
    });
    mongoMs = Date.now() - mongoStart;

    if (!user) {
      logRefresh({
        requestId,
        status: 401,
        durationMs: Date.now() - started,
        mongoMs,
        code: 'REFRESH_REJECTED',
      });
      return res.status(401).json({ error: 'Refresh token invalide ou expiré.', code: 'REFRESH_REJECTED' });
    }

    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
    const saveStart = Date.now();
    await user.save();
    mongoMs += Date.now() - saveStart;

    const newAccessToken = await user.generateAuthToken();
    const newRefreshToken = await user.generateRefreshToken();

    logRefresh({
      requestId,
      status: 200,
      durationMs: Date.now() - started,
      mongoMs,
      code: 'REFRESH_OK',
    });
    res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logRefresh({
      requestId,
      status: 500,
      durationMs: Date.now() - started,
      mongoMs,
      code: 'REFRESH_ERROR',
    });
    console.error('Erreur refresh token:', error?.name || 'Error');
    res.status(500).json({ error: 'Erreur lors du rafraîchissement du token.', code: 'REFRESH_ERROR' });
  }
};

/** Émet un JWT court (5 min) dédié à Socket.io — nécessite un access token valide. */
export const createSocketToken = async (req, res) => {
  try {
    const socketToken = issueSocketToken(req.utilisateur._id);
    res.status(200).json({ socketToken });
  } catch (error) {
    console.error('Erreur émission socket token:', error?.name || 'Error');
    res.status(500).json({ error: 'Impossible d\'émettre le token socket.' });
  }
};
