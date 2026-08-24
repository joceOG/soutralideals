import multer from 'multer';
import cloudinary from 'cloudinary';
import fs from 'fs';
import { assertOwnerOrAdmin } from '../utils/accessControl.js';
import Utilisateur from '../models/utilisateurModel.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import validator from 'validator';
import { assertPhoneVerificationToken, requireCanonicalPhone, isOtpRequiredForSignup } from '../services/otpService.js';
import { normalizeLoginIdentifiant, PhoneValidationError } from '../utils/phone.js';
import { sendWelcomeEmail, sendResetPasswordEmail } from '../services/emailService.js';
import * as googleAuthService from '../services/googleAuthService.js';
import crypto from 'crypto';

// Config Cloudinary depuis les variables d'environnement
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Config Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/utilisateurs'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
export const upload = multer({ storage });

function resolveSignupPhone(telephone, phoneCountry, phoneVerificationToken) {
  if (!telephone) return null;
  if (phoneVerificationToken) {
    return assertPhoneVerificationToken(
      phoneVerificationToken,
      telephone,
      phoneCountry || undefined,
    );
  }
  return requireCanonicalPhone(telephone, phoneCountry || undefined);
}

// ✅ INSCRIPTION
export const signUp = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      datedenaissance,
      email,
      password,
      telephone,
      phoneCountry,
      genre,
      note,
      role,
      phoneVerificationToken,
    } = req.body;

    const otpEnforced = isOtpRequiredForSignup();
    let normalizedPhone = null;
    let telephoneVerified = false;

    if (otpEnforced && !phoneVerificationToken) {
      return res.status(400).json({ error: 'Vérification du téléphone requise (code OTP)' });
    }

    if (telephone) {
      try {
        normalizedPhone = resolveSignupPhone(
          telephone,
          phoneCountry,
          phoneVerificationToken,
        );
        telephoneVerified = Boolean(phoneVerificationToken);
      } catch (otpErr) {
        const msg =
          otpErr instanceof PhoneValidationError ||
          otpErr?.code === 'INVALID_PHONE'
            ? 'Numéro de téléphone invalide pour le pays sélectionné.'
            : otpErr.message ||
              'Numéro de téléphone invalide pour le pays sélectionné.';
        return res.status(400).json({ error: msg });
      }
    }

    // ✅ Accepter les rôles en minuscules et les convertir
    const validRoles = ["prestataire", "vendeur", "freelance", "client"];
    const roleMap = {
      "prestataire": "Prestataire",
      "vendeur": "Vendeur", 
      "freelance": "Freelance",
      "client": "Client"
    };
    
    if (!role || !validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({ error: "Rôle invalide ou manquant" });
    }
    
    // Convertir le rôle en format backend
    const normalizedRole = roleMap[role.toLowerCase()];

    // Vérification unicité email/téléphone (forme canonique uniquement)
    const conditions = [];
    if (email) conditions.push({ email });
    if (normalizedPhone) conditions.push({ telephone: normalizedPhone });
    const existingUser = conditions.length > 0 ? await Utilisateur.findOne({ $or: conditions }) : null;

    if (existingUser) {
      let error = '';
      if (email && existingUser.email === email) error = 'Email déjà utilisé';
      else if (normalizedPhone && existingUser.telephone === normalizedPhone) {
        error = 'Numéro de téléphone déjà utilisé';
      }
      return res.status(400).json({ error });
    }

    // Upload photo si présent
    let photoProfil = '';
    if (req.file) {
      const result = await cloudinary.v2.uploader.upload(req.file.path, { folder: 'users' });
      photoProfil = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    // Création de l'utilisateur
    const newUser = new Utilisateur({
      nom,
      prenom,
      datedenaissance,
      email,
      password,
      telephone: normalizedPhone || undefined,
      telephoneVerified: telephoneVerified,
      genre,
      note,
      photoProfil,
      role: normalizedRole,
    });
    await newUser.save();

    if (email) {
      sendWelcomeEmail(email, prenom).catch(() => {});
    }

    const token = await newUser.generateAuthToken();
    const refreshToken = await newUser.generateRefreshToken();

    res.status(201).json({
      utilisateur: newUser.toJSON(),
      token,
      refreshToken,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};


// ✅ CONNEXION
export const signIn = async (req, res) => {
  try {
    let { identifiant, password, phoneCountry } = req.body;

    // 🔹 Sécurité : forcer en string + trim
    identifiant = identifiant ? String(identifiant).trim() : '';
    password = password ? String(password).trim() : '';

    // STAB-07 : formes alternatives → même identité E.164
    identifiant = normalizeLoginIdentifiant(
      identifiant,
      phoneCountry || undefined,
    );

    // 🔹 Vérification des champs
    if (!identifiant) {
      return res.status(400).json({ error: 'Email ou téléphone requis' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Mot de passe requis' });
    }

    // 🔹 Recherche utilisateur via méthode statique
    let user;
    try {
      user = await Utilisateur.findByCredentials(identifiant, password);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        error: 'Compte désactivé. Contactez le support pour le réactiver.',
      });
    }

    // 🔹 Génération du token
    const token = await user.generateAuthToken();
    const refreshToken = await user.generateRefreshToken();

    res.status(200).json({
      message: 'Connexion réussie',
      utilisateur: user.toJSON(),
      token,
      refreshToken
    });
  } catch (e) {
    console.error("❌ Erreur signIn:", e);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
};


// ✅ CONNEXION / INSCRIPTION via Google (idToken)
function normalizeClientRole(role) {
  const roleMap = {
    prestataire: 'Prestataire',
    vendeur: 'Vendeur',
    freelance: 'Freelance',
    client: 'Client',
  };
  const requested = (role || 'client').toString().trim().toLowerCase();
  return roleMap[requested] || 'Client';
}

function phoneVerificationRequiredPayload(profile) {
  return {
    error: 'Vérification du téléphone requise',
    code: 'PHONE_VERIFICATION_REQUIRED',
    email: profile.email || undefined,
    message:
      'Confirmez votre numéro de téléphone pour finaliser la connexion Google.',
  };
}

export const signInWithGoogle = async (req, res) => {
  try {
    const { idToken, role } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: 'idToken Google requis' });
    }

    let profile;
    try {
      profile = await googleAuthService.verifyGoogleIdToken(idToken);
    } catch (err) {
      return res.status(401).json({ error: err.message || 'Token Google invalide' });
    }

    if (!profile.email) {
      return res.status(400).json({ error: 'Email Google manquant' });
    }

    void role;

    let user = await Utilisateur.findOne({
      $or: [{ googleId: profile.googleId }, { email: profile.email }],
    });

    if (user?.isActive === false) {
      return res.status(403).json({
        error: 'Compte désactivé. Contactez le support pour le réactiver.',
      });
    }

    // Compte existant + téléphone déjà prouvé → session Soutrali complète
    if (user && user.telephoneVerified === true && user.telephone) {
      let dirty = false;
      if (!user.googleId) {
        user.googleId = profile.googleId;
        dirty = true;
      }
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
        dirty = true;
      }
      if (profile.photoProfil && !user.photoProfil) {
        user.photoProfil = profile.photoProfil;
        dirty = true;
      }
      if (dirty) await user.save();

      const token = await user.generateAuthToken();
      const refreshToken = await user.generateRefreshToken();
      return res.status(200).json({
        message: 'Connexion Google réussie',
        utilisateur: user.toJSON(),
        token,
        refreshToken,
      });
    }

    // Nouveau Google ou téléphone non vérifié → PAS de session, PAS de création
    return res.status(403).json(phoneVerificationRequiredPayload(profile));
  } catch (e) {
    console.error('❌ Erreur signInWithGoogle:', e);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

/**
 * STAB-09 — Finalise Google après OTP téléphone (création ou upgrade contrôlé).
 */
export const completeGoogleSignIn = async (req, res) => {
  try {
    const {
      idToken,
      telephone,
      phoneCountry,
      phoneVerificationToken,
      role,
    } = req.body || {};

    if (!idToken) {
      return res.status(400).json({ error: 'idToken Google requis' });
    }
    if (!telephone || !phoneVerificationToken) {
      return res.status(400).json({
        error: 'Téléphone et vérification OTP requis',
        code: 'PHONE_VERIFICATION_REQUIRED',
      });
    }

    let profile;
    try {
      profile = await googleAuthService.verifyGoogleIdToken(idToken);
    } catch (err) {
      return res.status(401).json({ error: err.message || 'Token Google invalide' });
    }
    if (!profile.email) {
      return res.status(400).json({ error: 'Email Google manquant' });
    }

    let normalizedPhone;
    try {
      normalizedPhone = assertPhoneVerificationToken(
        phoneVerificationToken,
        telephone,
        phoneCountry || undefined,
      );
    } catch (otpErr) {
      const msg =
        otpErr instanceof PhoneValidationError ||
        otpErr?.code === 'INVALID_PHONE'
          ? 'Numéro de téléphone invalide pour le pays sélectionné.'
          : otpErr.message || 'Vérification téléphone invalide';
      return res.status(400).json({ error: msg });
    }

    const phoneOwner = await Utilisateur.findOne({ telephone: normalizedPhone });
    let user = await Utilisateur.findOne({
      $or: [{ googleId: profile.googleId }, { email: profile.email }],
    });

    if (phoneOwner && (!user || String(phoneOwner._id) !== String(user._id))) {
      return res.status(409).json({
        error: 'Ce numéro est déjà utilisé par un autre compte',
      });
    }

    if (user?.isActive === false) {
      return res.status(403).json({
        error: 'Compte désactivé. Contactez le support pour le réactiver.',
      });
    }

    const finalRole = normalizeClientRole(role);

    if (!user) {
      user = new Utilisateur({
        nom: profile.nom || 'Utilisateur',
        prenom: profile.prenom || '',
        email: profile.email,
        password: crypto.randomBytes(32).toString('hex'),
        googleId: profile.googleId,
        authProvider: 'google',
        photoProfil: profile.photoProfil || undefined,
        role: finalRole,
        telephone: normalizedPhone,
        telephoneVerified: true,
      });
      await user.save();
      sendWelcomeEmail(profile.email, profile.prenom).catch(() => {});
    } else {
      if (!user.googleId) user.googleId = profile.googleId;
      user.authProvider = 'google';
      if (profile.photoProfil && !user.photoProfil) {
        user.photoProfil = profile.photoProfil;
      }
      user.telephone = normalizedPhone;
      user.telephoneVerified = true;
      await user.save();
    }

    const token = await user.generateAuthToken();
    const refreshToken = await user.generateRefreshToken();

    res.status(200).json({
      message: 'Connexion Google réussie',
      utilisateur: user.toJSON(),
      token,
      refreshToken,
    });
  } catch (e) {
    console.error('❌ Erreur completeGoogleSignIn:', e);
    if (e?.code === 11000) {
      return res.status(409).json({ error: 'Compte ou téléphone déjà utilisé' });
    }
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};


// ✅ DECONNEXION : invalide access + refresh tokens en base (route publique)
export const logout = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const { refreshToken } = req.body || {};

    if (token) {
      await Utilisateur.updateOne(
        { 'tokens.token': token },
        { $pull: { tokens: { token } } }
      );
    }

    if (refreshToken) {
      await Utilisateur.updateOne(
        { 'refreshTokens.token': refreshToken },
        { $pull: { refreshTokens: { token: refreshToken } } }
      );
    }

    res.status(200).json({ message: 'Déconnexion réussie' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ LISTER TOUS LES UTILISATEURS (ADMIN seulement, avec pagination)
export const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [utilisateurs, total] = await Promise.all([
      Utilisateur.find({})
        .select('-password -tokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Utilisateur.countDocuments({})
    ]);

    res.status(200).json({
      utilisateurs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ RÉCUPÉRER UN UTILISATEUR PAR ID
export const getUserById = async (req, res) => {
  try {
    if (!assertOwnerOrAdmin(req, res, req.params.id)) return;

    const utilisateur = await Utilisateur.findById(req.params.id).select('-password -tokens');
    if (!utilisateur) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.status(200).json(utilisateur);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ MODIFIER UN UTILISATEUR
export const updateUserById = async (req, res) => {
  try {
    // 🛡️ IDOR : l'utilisateur ne peut modifier que son propre profil (sauf admin)
    const requesterId = req.utilisateur?._id?.toString();
    const targetId = req.params.id;
    if (requesterId !== targetId && req.utilisateur?.role !== 'Admin') {
      return res.status(403).json({ error: 'Accès refusé : vous ne pouvez modifier que votre propre profil' });
    }

    // 1️⃣ Champs autorisés à être mis à jour par le front
    const allowedFields = [
      'nom',
      'prenom',
      'email',
      'telephone',
      'genre',
      'note',
      'datedenaissance',
      'role' // uniquement si tu veux autoriser la modification
    ];

    // 2️⃣ Construire l'objet safeUpdates avec uniquement les champs autorisés
    const safeUpdates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) safeUpdates[key] = req.body[key];
    }

    // 3️⃣ Vérification du rôle si présent
    const validRoles = ['Admin', 'Prestataire', 'Vendeur', 'Freelance', 'Client'];
    if (safeUpdates.role && !validRoles.includes(safeUpdates.role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }
    if (safeUpdates.role === 'Admin' && req.utilisateur?.role !== 'Admin') {
      return res.status(403).json({ error: 'Seul un administrateur peut attribuer le rôle Admin' });
    }

    // 4️⃣ Upload photoProfil si présent
    if (req.file) {
      const result = await cloudinary.v2.uploader.upload(req.file.path, { folder: 'users' });
      safeUpdates.photoProfil = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    // 5️⃣ Chercher l'utilisateur
    const user = await Utilisateur.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    // 6️⃣ Mettre à jour uniquement les champs autorisés
    if (safeUpdates.telephone !== undefined) {
      try {
        const phoneCountry = req.body.phoneCountry;
        safeUpdates.telephone = requireCanonicalPhone(
          safeUpdates.telephone,
          phoneCountry || undefined,
        );
        const clash = await Utilisateur.findOne({
          telephone: safeUpdates.telephone,
          _id: { $ne: user._id },
        });
        if (clash) {
          return res.status(400).json({ error: 'Numéro de téléphone déjà utilisé' });
        }
      } catch {
        return res.status(400).json({
          error: 'Numéro de téléphone invalide pour le pays sélectionné.',
        });
      }
    }

    Object.assign(user, safeUpdates);

    // 7️⃣ Sauvegarder l'utilisateur (pré-save pour hasher le mot de passe si modifié)
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.tokens;
    res.status(200).json(safeUser);
  } catch (err) {
    console.error("❌ Erreur updateUserById:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ CHANGER LE MOT DE PASSE
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Mot de passe actuel et nouveau mot de passe requis',
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit contenir au moins 6 caractères',
      });
    }

    const user = await Utilisateur.findById(req.utilisateur._id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    console.error('❌ Erreur changePassword:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ SUPPRIMER UN UTILISATEUR
export const deleteUserById = async (req, res) => {
  try {
    // 🛡️ IDOR : seul l'utilisateur lui-même ou un admin peut supprimer
    const requesterId = req.utilisateur?._id?.toString();
    const targetId = req.params.id;
    if (requesterId !== targetId && req.utilisateur?.role !== 'Admin') {
      return res.status(403).json({ error: 'Accès refusé : vous ne pouvez supprimer que votre propre compte' });
    }

    const utilisateur = await Utilisateur.findByIdAndDelete(req.params.id);
    if (!utilisateur) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ RÔLES UTILISATEUR AGRÉGÉS
export const getUserRoles = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Utilisateur.findById(id).lean();
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    // Rôle de base
    const roles = new Set(['CLIENT']);

    // Vérifier existence des documents liés
    const [prestataire, freelance, vendeur] = await Promise.all([
      prestataireModel.findOne({ utilisateur: id }).lean(),
      freelanceModel.findOne({ utilisateur: id }).lean(),
      vendeurModel.findOne({ utilisateur: id }).lean(),
    ]);

    if (prestataire) roles.add('PRESTATAIRE');
    if (freelance) roles.add('FREELANCE');
    if (vendeur) roles.add('VENDEUR');

    // L’admin peut être déterminé par un champ futur, placeholder ici
    if (user.role === 'ADMIN' || user.isAdmin === true) roles.add('ADMIN');

    // Statuts détaillés par rôle
    const details = {
      prestataire: prestataire ? { id: prestataire._id, verifier: !!prestataire.verifier } : null,
      freelance: freelance ? { id: freelance._id, accountStatus: freelance.accountStatus || 'Pending' } : null,
      vendeur: vendeur ? { id: vendeur._id, verifier: !!vendeur.verifier } : null,
    };

    return res.status(200).json({
      utilisateur: { _id: user._id, nom: user.nom, prenom: user.prenom, email: user.email, telephone: user.telephone },
      roles: Array.from(roles),
      details,
    });
  } catch (err) {
    console.error('Erreur getUserRoles:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/** Enregistre / met à jour un token FCM pour l'utilisateur connecté. */
export const registerFcmToken = async (req, res) => {
  try {
    const { token, platform } = req.body || {};
    if (!token || typeof token !== 'string' || token.length < 20) {
      return res.status(400).json({ error: 'Token FCM invalide' });
    }

    const user = await Utilisateur.findById(req.utilisateur._id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const plat = ['android', 'ios', 'web'].includes(platform) ? platform : 'unknown';
    user.fcmTokens = (user.fcmTokens || []).filter((t) => t.token !== token);
    user.fcmTokens.push({ token, platform: plat, updatedAt: new Date() });
    // Garder max 10 appareils
    user.fcmTokens = user.fcmTokens.slice(-10);
    await user.save();

    res.status(200).json({ message: 'Token FCM enregistré', count: user.fcmTokens.length });
  } catch (err) {
    console.error('Erreur registerFcmToken:', err.message);
    res.status(500).json({ error: err.message });
  }
};

/** Retire un token FCM (logout / désinscription). */
export const unregisterFcmToken = async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'Token FCM requis' });
    }

    const user = await Utilisateur.findById(req.utilisateur._id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const before = (user.fcmTokens || []).length;
    user.fcmTokens = (user.fcmTokens || []).filter((t) => t.token !== token);
    await user.save();

    res.status(200).json({
      message: 'Token FCM retiré',
      removed: before - user.fcmTokens.length,
    });
  } catch (err) {
    console.error('Erreur unregisterFcmToken:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── MOT DE PASSE OUBLIÉ ──────────────────────────────────────────────────────

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const user = await Utilisateur.findOne({ email: email.toLowerCase().trim() });

    // Toujours répondre 200 pour ne pas révéler si l'email existe
    if (!user) return res.status(200).json({ message: 'Si cet email existe, un lien a été envoyé.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure
    await user.save();

    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const resetUrl = `${appUrl}/reinitialiser-mot-de-passe?token=${token}`;

    await sendResetPasswordEmail(user.email, user.prenom || user.nom, resetUrl);

    return res.status(200).json({ message: 'Si cet email existe, un lien a été envoyé.' });
  } catch (err) {
    console.error('Erreur forgotPassword:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
    if (password.length < 6) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });

    const user = await Utilisateur.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ error: 'Lien invalide ou expiré. Faites une nouvelle demande.' });

    user.password = password; // hashé par le pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.tokens = []; // invalider toutes les sessions actives
    await user.save();

    return res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    console.error('Erreur resetPassword:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/** Désactiver son propre compte (soft) */
export const deactivateAccount = async (req, res) => {
  try {
    const userId = req.utilisateur?._id?.toString();
    if (!userId) return res.status(401).json({ error: 'Authentification requise' });

    const user = await Utilisateur.findById(userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    user.isActive = false;
    user.deactivatedAt = new Date();
    user.tokens = [];
    user.refreshTokens = [];
    await user.save();

    return res.status(200).json({ message: 'Compte désactivé' });
  } catch (err) {
    console.error('Erreur deactivateAccount:', err.message);
    res.status(500).json({ error: err.message });
  }
};
