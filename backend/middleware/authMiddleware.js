// middleware/auth.js
import jwt from 'jsonwebtoken';
import Utilisateur from '../models/utilisateurModel.js';

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token manquant. Authentification requise.' });
    }

    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    const utilisateur = await Utilisateur.findById(decoded.id);

    if (!utilisateur) {
      return res.status(401).json({ error: 'Utilisateur non trouvé. Authentification échouée.' });
    }

    req.utilisateur = utilisateur;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};

export default auth;
