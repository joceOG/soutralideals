import multer from 'multer';
import cloudinary from 'cloudinary';
import fs from 'fs';
import { assertOwnerOrAdmin, isAdmin } from '../utils/accessControl.js';
import Utilisateur from '../models/utilisateurModel.js';
import validator from 'validator';
import { assertPhoneVerificationToken, requireCanonicalPhone } from '../services/otpService.js';
import {
  isPhoneVerificationRequiredForSignup,
  isPhoneVerificationRequiredForGoogle,
  getPhoneVerificationMode,
} from '../services/phoneVerificationPolicy.js';
import {
  findVerifiedPhoneOwner,
  clearStalePendingPhone,
  resolveDeferredSignupPhone,
} from '../services/phoneIdentityService.js';
import { normalizeLoginIdentifiant, PhoneValidationError } from '../utils/phone.js';
import { normalizeEmail } from '../utils/emailIdentity.js';
import { sendWelcomeEmail, sendResetPasswordEmail } from '../services/emailService.js';
import * as googleAuthService from '../services/googleAuthService.js';
import {
  resolveGoogleIdentity,
  GOOGLE_IDENTITY_STATUS,
  accountLinkRequiredPayload,
  googleIdMismatchPayload,
} from '../services/googleIdentityService.js';
import crypto from 'crypto';
import {
  USER_ROLES,
  assertValidUserObjectId,
  countActiveAdmins,
  collectUserDependencyCounts,
  assertLastAdminProtection,
  mapMongoUserWriteError,
} from '../services/userAdminPolicy.js';
import {
  resolveProfessionalCapabilities,
  toPublicCapabilitiesPayload,
  toAdminCapabilitiesPayload,
  CapabilitiesUserNotFoundError,
  CapabilitiesInvalidIdError,
  isAllowedAccountRoleForWrite,
  isProfessionalAccountRole,
} from '../services/professionalCapabilitiesService.js';

const ADMIN_LIST_SELECT =
  '-password -tokens -refreshTokens -resetPasswordToken -resetPasswordExpires -fcmTokens';

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

    const otpEnforced = isPhoneVerificationRequiredForSignup();
    const isDeferredSignup =
      getPhoneVerificationMode() === 'deferred' && !otpEnforced;
    let normalizedPhone = null;
    let telephoneVerified = false;

    if (isDeferredSignup) {
      const emailTrim = normalizeEmail(email);
      if (!emailTrim || !validator.isEmail(emailTrim)) {
        return res.status(400).json({ error: 'Email requis pour l\'inscription' });
      }
    }

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

    // ✅ Accepter les rôles publics uniquement — jamais Admin via /register (DASH-8D)
    if (role && String(role).toLowerCase() === 'admin') {
      return res.status(400).json({ error: 'Rôle non autorisé à l’inscription publique' });
    }

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

    const emailNorm = normalizeEmail(email);

    // Unicité email + téléphone vérifié uniquement (pending ne bloque pas)
    if (normalizedPhone) {
      const verifiedOwner = await findVerifiedPhoneOwner(normalizedPhone);
      if (verifiedOwner) {
        return res.status(400).json({ error: 'Numéro de téléphone déjà utilisé' });
      }
    }

    const conditions = [];
    if (emailNorm) conditions.push({ email: emailNorm });
    const existingUser =
      conditions.length > 0 ? await Utilisateur.findOne({ $or: conditions }) : null;

    if (existingUser) {
      let error = '';
      if (emailNorm && existingUser.email === emailNorm) error = 'Email déjà utilisé';
      return res.status(400).json({ error: error || 'Compte déjà existant' });
    }

    const phoneFields = resolveDeferredSignupPhone({
      normalizedPhone,
      phoneVerificationToken,
      usePendingStorage: isDeferredSignup,
    });
    telephoneVerified = phoneFields.telephoneVerified;

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
      email: emailNorm,
      password,
      telephone: phoneFields.telephone,
      pendingTelephone: phoneFields.pendingTelephone,
      telephoneVerified,
      genre,
      note,
      photoProfil,
      role: normalizedRole,
    });
    await newUser.save();

    if (emailNorm) {
      sendWelcomeEmail(emailNorm, prenom).catch(() => {});
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
    phoneVerificationMode: getPhoneVerificationMode() ?? 'legacy',
  };
}

async function createDeferredGoogleUser(profile, role) {
  const finalRole = normalizeClientRole(role);

  const user = new Utilisateur({
    nom: profile.nom || 'Utilisateur',
    prenom: profile.prenom || '',
    email: profile.email,
    password: crypto.randomBytes(32).toString('hex'),
    googleId: profile.googleId,
    authProvider: 'google',
    photoProfil: profile.photoProfil || undefined,
    role: finalRole,
    telephoneVerified: false,
  });
  await user.save();
  sendWelcomeEmail(profile.email, profile.prenom).catch(() => {});
  return user;
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

    const identity = await resolveGoogleIdentity(profile);

    if (identity.status === GOOGLE_IDENTITY_STATUS.ACCOUNT_LINK_REQUIRED) {
      return res.status(409).json(accountLinkRequiredPayload());
    }
    if (identity.status === GOOGLE_IDENTITY_STATUS.GOOGLE_ID_MISMATCH) {
      return res.status(409).json(googleIdMismatchPayload());
    }

    let user = identity.user;

    if (user?.isActive === false) {
      return res.status(403).json({
        error: 'Compte désactivé. Contactez le support pour le réactiver.',
      });
    }

    // Compte Google existant + téléphone déjà prouvé → session Soutrali complète
    if (user && user.telephoneVerified === true && user.telephone) {
      let dirty = false;
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
        phoneVerificationMode: getPhoneVerificationMode() ?? 'legacy',
        phoneVerificationSuggested: false,
      });
    }

    // STAB-12D deferred — session sans OTP bloquant
    if (!isPhoneVerificationRequiredForGoogle()) {
      if (!user) {
        user = await createDeferredGoogleUser(profile, role);
      }

      if (user.isActive === false) {
        return res.status(403).json({
          error: 'Compte désactivé. Contactez le support pour le réactiver.',
        });
      }

      const token = await user.generateAuthToken();
      const refreshToken = await user.generateRefreshToken();
      return res.status(200).json({
        message: 'Connexion Google réussie',
        utilisateur: user.toJSON(),
        token,
        refreshToken,
        phoneVerificationMode: 'deferred',
        phoneVerificationSuggested: user.telephoneVerified !== true,
      });
    }

    // Mode required / legacy — téléphone obligatoire avant session
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

    const phoneOwner = await findVerifiedPhoneOwner(normalizedPhone);
    const identity = await resolveGoogleIdentity(profile);

    if (identity.status === GOOGLE_IDENTITY_STATUS.ACCOUNT_LINK_REQUIRED) {
      return res.status(409).json(accountLinkRequiredPayload());
    }
    if (identity.status === GOOGLE_IDENTITY_STATUS.GOOGLE_ID_MISMATCH) {
      return res.status(409).json(googleIdMismatchPayload());
    }

    let user = identity.user;

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
      if (profile.photoProfil && !user.photoProfil) {
        user.photoProfil = profile.photoProfil;
      }
      user.telephone = normalizedPhone;
      user.telephoneVerified = true;
      user.pendingTelephone = undefined;
      await user.save();
    }

    await clearStalePendingPhone(normalizedPhone, user._id);

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

/**
 * STAB-12D — Vérification téléphone volontaire (compte déjà connecté, mode deferred).
 */
export const verifyAuthenticatedUserPhone = async (req, res) => {
  try {
    const { telephone, phoneCountry, phoneVerificationToken } = req.body || {};

    if (!telephone || !phoneVerificationToken) {
      return res.status(400).json({
        error: 'Téléphone et vérification OTP requis',
      });
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

    const phoneOwner = await findVerifiedPhoneOwner(normalizedPhone);
    const user = req.utilisateur;

    if (phoneOwner && String(phoneOwner._id) !== String(user._id)) {
      return res.status(409).json({
        error: 'Ce numéro est déjà utilisé par un autre compte',
      });
    }

    user.telephone = normalizedPhone;
    user.telephoneVerified = true;
    user.pendingTelephone = undefined;
    await user.save();

    await clearStalePendingPhone(normalizedPhone, user._id);

    res.status(200).json({
      message: 'Téléphone vérifié',
      utilisateur: user.toJSON(),
    });
  } catch (e) {
    console.error('❌ Erreur verifyAuthenticatedUserPhone:', e);
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
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role && USER_ROLES.includes(String(req.query.role))) {
      filter.role = req.query.role;
    }
    if (req.query.isActive === 'true') filter.isActive = true;
    if (req.query.isActive === 'false') filter.isActive = false;
    const search = String(req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ nom: rx }, { prenom: rx }, { email: rx }, { telephone: rx }];
    }

    const [utilisateurs, total] = await Promise.all([
      Utilisateur.find(filter)
        .select(ADMIN_LIST_SELECT)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Utilisateur.countDocuments(filter),
    ]);

    res.status(200).json({
      utilisateurs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ CRÉATION ADMIN (dashboard — distincte de /register)
export const createUserByAdmin = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Droits administrateur requis.' });
    }

    const {
      nom,
      prenom,
      datedenaissance,
      email,
      password,
      telephone,
      genre,
      note,
      role,
      isActive,
    } = req.body;

    if (!isAllowedAccountRoleForWrite(role)) {
      if (isProfessionalAccountRole(role) || !USER_ROLES.includes(role)) {
        return res.status(400).json({
          error: 'Les activités professionnelles se créent via les modules Prestataire, Freelance ou Vendeur.',
          code: 'PROFESSIONAL_ROLE_REQUIRES_PROFILE_FLOW',
        });
      }
      return res.status(400).json({ error: 'Rôle invalide', code: 'INVALID_ROLE' });
    }

    let photoProfil = '';
    if (req.file) {
      const result = await cloudinary.v2.uploader.upload(req.file.path, { folder: 'users' });
      photoProfil = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    const emailNorm = normalizeEmail(email);

    const newUser = new Utilisateur({
      nom,
      prenom,
      datedenaissance,
      email: emailNorm,
      password,
      telephone: telephone || undefined,
      genre,
      note,
      photoProfil: photoProfil || undefined,
      role,
      isActive: isActive === false || isActive === 'false' ? false : true,
      source: 'dashboard',
      authProvider: 'local',
    });

    await newUser.save();

    res.status(201).json({ utilisateur: newUser.toJSON() });
  } catch (err) {
    if (mapMongoUserWriteError(err, res)) return;
    console.error('createUserByAdmin:', err.message);
    res.status(500).json({ error: 'Erreur interne' });
  }
};

// ✅ RÉCUPÉRER UN UTILISATEUR PAR ID
export const getUserById = async (req, res) => {
  try {
    if (!assertOwnerOrAdmin(req, res, req.params.id)) return;

    const utilisateur = await Utilisateur.findById(req.params.id).select(ADMIN_LIST_SELECT);
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
    const requesterIsAdmin = isAdmin(req);
    if (requesterId !== targetId && !requesterIsAdmin) {
      return res.status(403).json({ error: 'Accès refusé : vous ne pouvez modifier que votre propre profil' });
    }

    // 1️⃣ Champs autorisés (role = admin only — STAB-11 anti auto-élévation)
    const allowedFields = [
      'nom',
      'prenom',
      'email',
      'telephone',
      'genre',
      'note',
      'datedenaissance',
    ];
    if (requesterIsAdmin) {
      allowedFields.push('role', 'canCreateRecensement', 'isActive');
    }

    // 2️⃣ Construire l'objet safeUpdates avec uniquement les champs autorisés
    const safeUpdates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) safeUpdates[key] = req.body[key];
    }

    if (safeUpdates.email !== undefined) {
      safeUpdates.email = normalizeEmail(safeUpdates.email);
    }

    if (safeUpdates.isActive !== undefined) {
      safeUpdates.isActive =
        safeUpdates.isActive === true ||
        safeUpdates.isActive === 'true' ||
        safeUpdates.isActive === 1 ||
        safeUpdates.isActive === '1';
    }

    // 3️⃣ Vérification du rôle si présent
    if (safeUpdates.role) {
      if (isProfessionalAccountRole(safeUpdates.role)) {
        return res.status(400).json({
          error: 'Les activités professionnelles se gèrent via les modules dédiés, pas via le rôle compte.',
          code: 'PROFESSIONAL_ROLE_REQUIRES_PROFILE_FLOW',
        });
      }
      if (!isAllowedAccountRoleForWrite(safeUpdates.role)) {
        return res.status(400).json({ error: 'Rôle invalide', code: 'INVALID_ROLE' });
      }
    }
    if (safeUpdates.role === 'Admin' && !requesterIsAdmin) {
      return res.status(403).json({ error: 'Seul un administrateur peut attribuer le rôle Admin' });
    }

    // 5️⃣ Chercher l'utilisateur
    const user = await Utilisateur.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    if (requesterIsAdmin && requesterId === targetId && safeUpdates.isActive === false) {
      return res.status(409).json({
        error: 'Vous ne pouvez pas désactiver votre propre compte administrateur depuis cette page.',
        code: 'ADMIN_SELF_DEACTIVATE_FORBIDDEN',
      });
    }

    if (
      requesterIsAdmin &&
      user.role === 'Admin' &&
      safeUpdates.role &&
      safeUpdates.role !== 'Admin'
    ) {
      if (!(await assertLastAdminProtection(user, 'rétrogradation', res))) return;
    }

    if (requesterIsAdmin && safeUpdates.isActive === false && user.role === 'Admin') {
      if (!(await assertLastAdminProtection(user, 'désactivation', res))) return;
    }

    // 4️⃣ Upload photoProfil si présent
    if (req.file) {
      const result = await cloudinary.v2.uploader.upload(req.file.path, { folder: 'users' });
      safeUpdates.photoProfil = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

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
          return res.status(409).json({ error: 'Numéro de téléphone déjà utilisé', code: 'DUPLICATE_PHONE' });
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
    delete safeUser.refreshTokens;
    delete safeUser.fcmTokens;
    res.status(200).json(safeUser);
  } catch (err) {
    if (mapMongoUserWriteError(err, res)) return;
    console.error('❌ Erreur updateUserById:', err);
    res.status(500).json({ error: 'Erreur interne' });
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

// STAB-11b — grant/revoke permission recensement (admin only)
export const setCanCreateRecensement = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Droits administrateur requis.' });
    }
    const enabled = req.body?.enabled === true || req.body?.canCreateRecensement === true;
    const user = await Utilisateur.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    user.canCreateRecensement = enabled;
    await user.save();
    res.status(200).json({
      _id: user._id,
      canCreateRecensement: user.canCreateRecensement,
      message: enabled
        ? 'Permission de recensement accordée.'
        : 'Permission de recensement révoquée.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ SUPPRIMER UN UTILISATEUR (self-service ou admin sécurisé)
export const deleteUserById = async (req, res) => {
  try {
    const requesterId = req.utilisateur?._id?.toString();
    const targetId = req.params.id?.toString();

    if (!assertValidUserObjectId(targetId, res)) return;

    if (isAdmin(req) && requesterId === targetId) {
      return res.status(409).json({
        error: 'Suppression de votre propre compte administrateur interdite depuis cette action.',
        code: 'ADMIN_SELF_DELETE_FORBIDDEN',
      });
    }

    if (isAdmin(req) && requesterId !== targetId) {
      return adminDeleteUserById(req, res);
    }

    // 🛡️ IDOR : seul l'utilisateur lui-même — anonymisation (Play / intégrité).
    if (!requesterId || requesterId !== targetId) {
      return res.status(403).json({
        error: 'Accès refusé : vous ne pouvez supprimer que votre propre compte',
        code: 'ACCOUNT_DELETION_FORBIDDEN',
      });
    }

    const { requestAccountDeletionForActor } = await import(
      '../services/accountDeletionService.js'
    );
    const result = await requestAccountDeletionForActor(req.utilisateur);
    return res.status(200).json({
      success: true,
      code: result.alreadyApplied
        ? 'ACCOUNT_DELETION_ALREADY_APPLIED'
        : 'ACCOUNT_DELETION_COMPLETED',
      message: result.alreadyApplied
        ? 'La suppression de ce compte était déjà enregistrée.'
        : 'Votre compte a été supprimé. Les données personnelles ont été anonymisées.',
      data: { requestId: result.requestId, status: result.status },
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Erreur suppression',
      code: 'ACCOUNT_DELETION_FAILED',
    });
  }
};

async function adminDeleteUserById(req, res) {
  const targetId = req.params.id?.toString();

  const user = await Utilisateur.findById(targetId);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé', code: 'USER_NOT_FOUND' });
  }

  if (user.role === 'Admin') {
    if (!(await assertLastAdminProtection(user, 'suppression', res))) return;
  }

  const { counts, total } = await collectUserDependencyCounts(targetId);
  if (total > 0) {
    return res.status(409).json({
      error: 'Impossible de supprimer : des données sont liées à ce compte.',
      code: 'USER_HAS_DEPENDENCIES',
      dependencies: counts,
    });
  }

  await Utilisateur.findByIdAndDelete(targetId);
  return res.status(200).json({
    success: true,
    code: 'USER_DELETED',
    message: 'Utilisateur supprimé.',
  });
}

// ✅ Capacités professionnelles — compte connecté (DASH-8E.1)
export const getMyCapabilities = async (req, res) => {
  try {
    const userId = req.utilisateur?._id?.toString();
    if (!userId) {
      return res.status(401).json({ error: 'Authentification requise' });
    }
    const resolved = await resolveProfessionalCapabilities(userId);
    return res.status(200).json({
      success: true,
      data: toPublicCapabilitiesPayload(resolved),
    });
  } catch (err) {
    if (err instanceof CapabilitiesUserNotFoundError) {
      return res.status(404).json({ error: err.message, code: err.code });
    }
    if (err instanceof CapabilitiesInvalidIdError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    console.error('getMyCapabilities:', err.message);
    return res.status(500).json({ error: 'Erreur interne' });
  }
};

// ✅ RÔLES / CAPACITÉS (resolver central — DASH-8E.1)
export const getUserRoles = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Utilisateur.findById(id)
      .select('nom prenom email telephone role')
      .lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        error: 'Utilisateur non trouvé',
      });
    }

    const resolved = await resolveProfessionalCapabilities(id);

    const viewerIsAdmin = String(req.utilisateur?.role || '').toUpperCase() === 'ADMIN';
    const utilisateurPayload = {
      _id: user._id,
      nom: user.nom,
      prenom: user.prenom,
    };
    if (viewerIsAdmin) {
      utilisateurPayload.email = user.email ?? null;
      utilisateurPayload.telephone = user.telephone ?? null;
    }

    const cap = toAdminCapabilitiesPayload(resolved);

    return res.status(200).json({
      success: true,
      utilisateur: utilisateurPayload,
      data: cap,
      /** @deprecated compat DASH-8D — préférer `data.capabilities` */
      roles: ['CLIENT', ...(resolved.accountRole === 'Admin' ? ['ADMIN'] : []), ...resolved.capabilities.map((c) => c.toUpperCase())],
      capabilities: cap.capabilities,
      details: {
        prestataire: cap.profiles.prestataire.id
          ? { id: cap.profiles.prestataire.id, status: cap.profiles.prestataire.status, canOperate: cap.profiles.prestataire.canOperate }
          : null,
        freelance: cap.profiles.freelance.id
          ? { id: cap.profiles.freelance.id, status: cap.profiles.freelance.status, canOperate: cap.profiles.freelance.canOperate }
          : null,
        vendeur: cap.profiles.vendeur.id
          ? { id: cap.profiles.vendeur.id, status: cap.profiles.vendeur.status, canOperate: cap.profiles.vendeur.canOperate }
          : null,
      },
    });
  } catch (err) {
    if (err instanceof CapabilitiesInvalidIdError || err?.name === 'CastError') {
      return res.status(400).json({
        success: false,
        code: 'USER_ID_INVALID',
        message: 'Identifiant invalide.',
      });
    }
    console.error('Erreur getUserRoles:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
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

    const emailNorm = normalizeEmail(email);
    if (!emailNorm) return res.status(400).json({ error: 'Email requis' });

    const user = await Utilisateur.findOne({ email: emailNorm });

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

/** Désactiver son propre compte (soft) — legacy ; préférer request-account-deletion */
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

/** Play — demande authentifiée de suppression (anonymisation + révocation). */
export const requestAccountDeletion = async (req, res) => {
  try {
    const { requestAccountDeletionForActor } = await import(
      '../services/accountDeletionService.js'
    );
    const result = await requestAccountDeletionForActor(req.utilisateur);
    return res.status(200).json({
      success: true,
      code: result.alreadyApplied
        ? 'ACCOUNT_DELETION_ALREADY_APPLIED'
        : 'ACCOUNT_DELETION_COMPLETED',
      message: result.alreadyApplied
        ? 'La suppression de ce compte était déjà enregistrée.'
        : 'Votre compte a été supprimé. Les données personnelles ont été anonymisées.',
      data: {
        requestId: result.requestId,
        status: result.status,
        retentionDaysHint: 0,
      },
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Erreur suppression',
      code: 'ACCOUNT_DELETION_FAILED',
    });
  }
};

/** Play — formulaire web public (ne révèle pas l’existence du compte). */
export const publicAccountDeletionRequest = async (req, res) => {
  try {
    const { publicDeletionRequest } = await import(
      '../services/accountDeletionService.js'
    );
    const result = await publicDeletionRequest({
      email: req.body?.email,
      confirmation: req.body?.confirmation,
    });
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Demande impossible',
      code: 'ACCOUNT_DELETION_REQUEST_FAILED',
    });
  }
};
