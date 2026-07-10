import Utilisateur from '../models/utilisateurModel.js';
import { issueSocketToken } from '../utils/socketToken.js';

export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token manquant.' });
    }

    // Trouver l'utilisateur qui détient ce refresh token valide et non expiré
    const user = await Utilisateur.findOne({
      'refreshTokens.token': refreshToken,
      'refreshTokens.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Refresh token invalide ou expiré.' });
    }

    // Retirer l'ancien refresh token (rotation unique) et sauvegarder immédiatement
    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
    await user.save(); // ← persist la révocation avant toute génération

    // Générer un nouvel access token et un nouveau refresh token
    const newAccessToken = await user.generateAuthToken();
    const newRefreshToken = await user.generateRefreshToken();

    res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Erreur refresh token:', error);
    res.status(500).json({ error: 'Erreur lors du rafraîchissement du token.' });
  }
};

/** Émet un JWT court (5 min) dédié à Socket.io — nécessite un access token valide. */
export const createSocketToken = async (req, res) => {
  try {
    const socketToken = issueSocketToken(req.utilisateur._id);
    res.status(200).json({ socketToken });
  } catch (error) {
    console.error('Erreur émission socket token:', error);
    res.status(500).json({ error: 'Impossible d\'émettre le token socket.' });
  }
};
