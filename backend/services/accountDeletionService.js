/**
 * Demande / exécution de suppression de compte Soutrali Deals (Play User Data).
 * Soft-deactivate seul (isActive=false) n'est PAS le résultat final.
 * Matrice : PII anonymisée, tokens révoqués, favoris/notifs purgés,
 * avis/commandes/messages conservés pour intégrité (auteur anonymisé via user).
 */
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import Utilisateur from '../models/utilisateurModel.js';
import Favorite from '../models/favoriteModel.js';
import Notification from '../models/notificationModel.js';
import Prestataire from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';

function newRequestId() {
  return crypto.randomBytes(16).toString('hex');
}

function anonymizedEmail(userId) {
  return `deleted+${userId}@deleted.soutralideals.invalid`;
}

/**
 * Applique la suppression / anonymisation pour un utilisateur.
 * Idempotent si déjà deletionStatus === 'completed'.
 */
export async function processAccountDeletion(user, { requestId, channel }) {
  if (!user) {
    const err = new Error('Utilisateur introuvable');
    err.status = 404;
    throw err;
  }

  if (user.deletionStatus === 'completed') {
    return {
      alreadyApplied: true,
      requestId: user.deletionRequestId || requestId,
      status: 'completed',
    };
  }

  const id = user._id;
  const rid = user.deletionRequestId || requestId || newRequestId();
  const now = new Date();
  const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

  user.nom = 'Compte';
  user.prenom = 'supprimé';
  user.email = anonymizedEmail(String(id));
  user.telephone = '';
  user.pendingTelephone = undefined;
  user.telephoneVerified = false;
  user.photoProfil = '';
  user.googleId = undefined;
  user.password = randomPassword;
  user.tokens = [];
  user.refreshTokens = [];
  user.fcmTokens = [];
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.isActive = false;
  user.deactivatedAt = user.deactivatedAt || now;
  user.deletionStatus = 'completed';
  user.deletionRequestedAt = user.deletionRequestedAt || now;
  user.deletionCompletedAt = now;
  user.deletionRequestId = rid;
  user.deletionChannel = channel || user.deletionChannel || 'app';
  await user.save();

  // Purges non bloquantes pour l’intégrité métier partagée
  await Promise.allSettled([
    Favorite.deleteMany({ utilisateur: id }),
    Notification.deleteMany({
      $or: [{ destinataire: id }, { expediteur: id }],
    }),
    Prestataire.updateMany(
      { utilisateur: id },
      { $set: { status: 'suspended' } },
    ),
    freelanceModel.updateMany(
      { utilisateur: id },
      { $set: { status: 'suspended' } },
    ).catch(() => null),
    vendeurModel.updateMany(
      { utilisateur: id },
      { $set: { status: 'suspended' } },
    ).catch(() => null),
  ]);

  return {
    alreadyApplied: false,
    requestId: rid,
    status: 'completed',
    processedAt: now.toISOString(),
  };
}

/** Authentifié : demande + traitement immédiat idempotent. */
export async function requestAccountDeletionForActor(actorUser) {
  const user = await Utilisateur.findById(actorUser._id);
  if (!user) {
    const err = new Error('Utilisateur introuvable');
    err.status = 404;
    throw err;
  }
  if (!user.deletionRequestedAt) {
    user.deletionRequestedAt = new Date();
    user.deletionRequestId = user.deletionRequestId || newRequestId();
    user.deletionStatus = user.deletionStatus || 'requested';
    user.deletionChannel = 'app';
    await user.save();
  }
  return processAccountDeletion(user, {
    requestId: user.deletionRequestId,
    channel: 'app',
  });
}

/**
 * Public (web) : ne révèle jamais si le compte existe.
 * Si trouvé → traite. Sinon → réponse générique identique.
 */
export async function publicDeletionRequest({ email, confirmation }) {
  const normalized = String(email || '').trim().toLowerCase();
  const conf = String(confirmation || '').trim().toUpperCase();
  if (!normalized || !normalized.includes('@')) {
    const err = new Error('Adresse email invalide.');
    err.status = 400;
    throw err;
  }
  if (conf !== 'SUPPRIMER') {
    const err = new Error('Confirmation invalide. Saisissez SUPPRIMER.');
    err.status = 400;
    throw err;
  }

  const user = await Utilisateur.findOne({
    email: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });

  if (user && user.deletionStatus !== 'completed') {
    if (!user.deletionRequestedAt) {
      user.deletionRequestedAt = new Date();
      user.deletionRequestId = newRequestId();
      user.deletionStatus = 'requested';
      user.deletionChannel = 'web';
      await user.save();
    }
    await processAccountDeletion(user, {
      requestId: user.deletionRequestId,
      channel: 'web',
    });
  }

  return {
    accepted: true,
    message:
      'Si un compte correspond à cette adresse, une demande de suppression a été enregistrée. '
      + 'Le traitement est généralement immédiat. Contact : contact@soutralideals.com',
  };
}

export const ACCOUNT_DELETION_RETENTION = Object.freeze({
  utilisateur_pii: { action: 'anonymisé', retention: 'immédiate' },
  tokens_jwt_refresh_fcm: { action: 'supprimé', retention: 'immédiate' },
  favoris: { action: 'supprimé', retention: 'immédiate' },
  notifications: { action: 'supprimé', retention: 'immédiate' },
  avis: { action: 'conservé', retention: 'illimitée (intégrité marketplace)', note: 'auteur anonymisé' },
  commandes: { action: 'conservé', retention: 'obligation légale / litiges', note: 'lien user anonymisé' },
  messages: { action: 'conservé', retention: 'intégrité conversation contrepartie', note: 'expéditeur anonymisé' },
  profils_pro: { action: 'suspendu', retention: 'jusqu’à purge admin' },
});
