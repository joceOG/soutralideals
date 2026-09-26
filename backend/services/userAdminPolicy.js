import mongoose from 'mongoose';
import Utilisateur from '../models/utilisateurModel.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import commandeModel from '../models/commandeModel.js';
import paiementModel from '../models/paiementModel.js';
import notificationModel from '../models/notificationModel.js';
import messageModel from '../models/messageModel.js';
import avisModel from '../models/avisModel.js';
import favoriteModel from '../models/favoriteModel.js';
import cartModel from '../models/cartModel.js';
import prestationModel from '../models/prestationModel.js';
import reportModel from '../models/reportModel.js';
import Security from '../models/securityModel.js';
import UserPreferences from '../models/userPreferencesModel.js';

export const USER_ROLES = ['Admin', 'Client', 'Prestataire', 'Vendeur', 'Freelance'];

export function assertValidUserObjectId(id, res) {
  if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
    res.status(400).json({ error: 'Identifiant utilisateur invalide', code: 'USER_ID_INVALID' });
    return false;
  }
  return true;
}

export async function countActiveAdmins(excludeUserId = null) {
  const filter = { role: 'Admin', isActive: { $ne: false } };
  if (excludeUserId) {
    filter._id = { $ne: new mongoose.Types.ObjectId(String(excludeUserId)) };
  }
  return Utilisateur.countDocuments(filter);
}

/** Compteurs agrégés — aucune donnée privée (DASH-8D). */
export async function collectUserDependencyCounts(userId) {
  const id = new mongoose.Types.ObjectId(String(userId));
  const [
    prestataire,
    freelance,
    vendeur,
    commandes,
    paiementsPayeur,
    paiementsBeneficiaire,
    notifications,
    messagesExp,
    messagesDest,
    avis,
    favoris,
    paniers,
    prestations,
    signalements,
    securite,
    preferences,
  ] = await Promise.all([
    prestataireModel.countDocuments({ utilisateur: id }),
    freelanceModel.countDocuments({ utilisateur: id }),
    vendeurModel.countDocuments({ utilisateur: id }),
    commandeModel.countDocuments({ utilisateur: id }),
    paiementModel.countDocuments({ payeur: id }),
    paiementModel.countDocuments({ beneficiaire: id }),
    notificationModel.countDocuments({ destinataire: id }),
    messageModel.countDocuments({ expediteur: id }),
    messageModel.countDocuments({ destinataire: id }),
    avisModel.countDocuments({ auteur: id }),
    favoriteModel.countDocuments({ utilisateur: id }),
    cartModel.countDocuments({ utilisateur: id }),
    prestationModel.countDocuments({ utilisateur: id }),
    reportModel.countDocuments({ utilisateur: id }),
    Security.countDocuments({ utilisateur: id }),
    UserPreferences.countDocuments({ utilisateur: id }),
  ]);

  const counts = {
    prestataire,
    freelance,
    vendeur,
    commandes,
    paiements: paiementsPayeur + paiementsBeneficiaire,
    notifications,
    messages: messagesExp + messagesDest,
    avis,
    favoris,
    paniers,
    prestations,
    signalements,
    securite,
    preferences,
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total };
}

export async function assertLastAdminProtection(user, action, res) {
  if (user.role !== 'Admin' || user.isActive === false) return true;

  const others = await countActiveAdmins(user._id);
  if (others > 0) return true;

  res.status(409).json({
    error: `Impossible : vous êtes le dernier administrateur actif (${action}).`,
    code: 'LAST_ADMIN_PROTECTED',
  });
  return false;
}

export function mapMongoUserWriteError(err, res) {
  if (err?.name === 'ValidationError') {
    res.status(400).json({ error: err.message, code: 'VALIDATION_ERROR' });
    return true;
  }
  if (err?.code === 11000) {
    const pattern = err.keyPattern || {};
    if (pattern.email) {
      res.status(409).json({ error: 'Email déjà utilisé', code: 'DUPLICATE_EMAIL' });
      return true;
    }
    if (pattern.telephone) {
      res.status(409).json({ error: 'Téléphone déjà utilisé', code: 'DUPLICATE_PHONE' });
      return true;
    }
    res.status(409).json({ error: 'Contrainte d’unicité violée', code: 'DUPLICATE_KEY' });
    return true;
  }
  return false;
}
