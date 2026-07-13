import jwt from 'jsonwebtoken';
import Utilisateur from '../models/utilisateurModel.js';

/**
 * Middleware d'authentification JWT unifié.
 * Utilisé sur toutes les routes protégées.
 * Accepte les rôles optionnels : auth, authAdmin(['ADMIN']), etc.
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token manquant. Authentification requise.' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Configuration serveur incorrecte.' });
    }

    const decoded = jwt.verify(token, secret);

    // Support _id et id dans le payload (rétrocompatibilité)
    const userId = decoded._id || decoded.id;
    if (!userId) {
      return res.status(401).json({ error: 'Token invalide : identifiant manquant.' });
    }

    const utilisateur = await Utilisateur.findById(userId);

    if (!utilisateur) {
      return res.status(401).json({ error: 'Utilisateur introuvable. Authentification échouée.' });
    }

    // Vérifier que le token est bien dans la liste des tokens actifs
    const tokenExists = utilisateur.tokens.some(t => t.token === token);
    if (!tokenExists) {
      return res.status(401).json({ error: 'Token révoqué ou invalide.' });
    }

    req.utilisateur = utilisateur;
    req.user = utilisateur;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré. Veuillez vous reconnecter.' });
    }
    res.status(401).json({ error: 'Token invalide.' });
  }
};

/**
 * Middleware de vérification de rôle.
 * Usage : authRole(['ADMIN', 'PRESTATAIRE'])
 */
export const authRole = (roles = []) => {
  return (req, res, next) => {
    const userRole = req.utilisateur?.role?.toUpperCase();
    if (!userRole || !roles.map(r => r.toUpperCase()).includes(userRole)) {
      return res.status(403).json({ error: 'Accès refusé : rôle insuffisant.' });
    }
    next();
  };
};

export default auth;
