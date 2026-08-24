import bcrypt from "bcrypt";
import crypto from "crypto";
import mongoose from "mongoose";
import validator from "validator";
import jwt from "jsonwebtoken";
import {
  normalizeEmail,
  EMAIL_UNIQUE_PARTIAL_FILTER,
  EMAIL_UNIQUE_INDEX_NAME,
} from '../utils/emailIdentity.js';

const UtilisateurSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true,
    trim: true
  },
  prenom: {
    type: String,
    trim: true
  },
  datedenaissance: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator(value) {
        if (value == null || value === '') return true;
        return validator.isEmail(value);
      },
      message: 'Email invalide',
    },
  },
  password: { 
    type: String,
    required: true,
    trim: true,
    minlength: 6,
    validate(value) {
      if (value.toLowerCase() === 'password') {
        throw new Error("Le mot de passe ne peut pas être 'password'");
      }
    }
  },
  telephone: {
    type: String,
    trim: true,
    // unicité vérifiée via index partiel (telephoneVerified=true uniquement)
  },
  /** STAB-12D — numéro saisi mais non prouvé OTP (pas d'identité de connexion). */
  pendingTelephone: {
    type: String,
    trim: true,
  },
  telephoneVerified: { type: Boolean, default: false },
  genre: { type: String },
  note: { type: String },
  photoProfil: { type: String },

  /** ID Google (OAuth) — login sans mot de passe */
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },

  // Admin : accès dashboard (liste utilisateurs, etc.) — à n’attribuer qu’en base ou via script sécurisé
  role: {
    type: String,
    enum: ["Admin", "Prestataire", "Vendeur", "Freelance", "Client"],
    required: true,
  },

  /**
   * STAB-11b — Permission métier terrain (SDEALSIDENTIFICATION).
   * Attribution / retrait réservés à l'admin. Pas un rôle RECENSEUR.
   */
  canCreateRecensement: {
    type: Boolean,
    default: false,
  },

  tokens: [{
    token: { type: String, required: true }
  }],
  refreshTokens: [{
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  /** Tokens FCM appareils (push mobile) */
  fcmTokens: [{
    token: { type: String, required: true },
    platform: { type: String, enum: ['android', 'ios', 'web', 'unknown'], default: 'unknown' },
    updatedAt: { type: Date, default: Date.now }
  }],

  /** Reset mot de passe */
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  /** Compte actif (false = désactivé par l’utilisateur) */
  isActive: { type: Boolean, default: true },
  deactivatedAt: { type: Date },
}, {
  timestamps: true
});

// STAB-12F — unicité email uniquement si email réel/non vide (legacy null autorisés)
UtilisateurSchema.index(
  { email: 1 },
  {
    unique: true,
    name: EMAIL_UNIQUE_INDEX_NAME,
    partialFilterExpression: EMAIL_UNIQUE_PARTIAL_FILTER,
  },
);

// Unicité téléphone vérifié uniquement (pendingTelephone n'est pas identité canonique)
UtilisateurSchema.index(
  { telephone: 1 },
  {
    unique: true,
    name: 'telephone_verified_unique',
    partialFilterExpression: {
      telephoneVerified: true,
      telephone: { $exists: true, $type: 'string', $gt: '' },
    },
  },
);

// Hash du mot de passe avant sauvegarde + ne jamais stocker telephone/email null/vide
UtilisateurSchema.pre("save", async function(next) {
  const user = this;
  const emailNorm = normalizeEmail(user.email);
  if (emailNorm === undefined) {
    user.email = undefined;
    if (user._doc) delete user._doc.email;
  } else {
    user.email = emailNorm;
  }
  if (user.telephone == null || user.telephone === '') {
    user.telephone = undefined;
    if (user._doc) delete user._doc.telephone;
  }
  if (user.pendingTelephone == null || user.pendingTelephone === '') {
    user.pendingTelephone = undefined;
    if (user._doc) delete user._doc.pendingTelephone;
  }
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
  next();
});

// Génération token JWT incluant le rôle (expire en 15 minutes)
UtilisateurSchema.methods.generateAuthToken = async function() {
  const user = this;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
  const token = jwt.sign(
    { _id: user._id.toString(), id: user._id.toString(), role: user.role },
    secret,
    { expiresIn: '15m' }
  );
  user.tokens = user.tokens.concat({ token });
  // Limiter la taille du tableau pour éviter une croissance illimitée (JWT 15min)
  user.tokens = user.tokens.slice(-10);
  await user.save();
  return token;
};

// Génération d'un refresh token opaque (valide 30 jours)
UtilisateurSchema.methods.generateRefreshToken = async function() {
  const user = this;
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours
  
  user.refreshTokens = user.refreshTokens.concat({ token, expiresAt });
  
  // Nettoyage des refresh tokens expirés ou anciens (garde max 5)
  user.refreshTokens = user.refreshTokens
    .filter(rt => rt.expiresAt > new Date())
    .slice(-5);
    
  await user.save();
  return token;
};

// Méthode statique pour login par email ou téléphone
UtilisateurSchema.statics.findByCredentials = async function(identifiant, password) {
  let user = null;
  if (validator.isEmail(identifiant)) {
    const emailNorm = normalizeEmail(identifiant);
    if (!emailNorm) throw new Error('Identifiants incorrects');
    user = await this.findOne({ email: emailNorm });
  } else {
    // STAB-12D — login téléphone uniquement si OTP prouvé
    user = await this.findOne({
      telephone: identifiant,
      telephoneVerified: true,
    });
  }

  if (!user) throw new Error('Identifiants incorrects');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Identifiants incorrects');

  return user;
};

// Méthode d'instance pour comparer un mot de passe en clair avec le hash
UtilisateurSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Virtuals pour relations
UtilisateurSchema.virtual('articles', {
  ref: 'Article',
  localField: '_id',
  foreignField: 'utilisateur'
});
UtilisateurSchema.virtual('prestataire', {
  ref: 'Prestataire',
  localField: '_id',
  foreignField: 'utilisateur'
});
UtilisateurSchema.virtual('freelance', {
  ref: 'Freelance',
  localField: '_id',
  foreignField: 'utilisateur'
});
UtilisateurSchema.virtual('vendeur', {
  ref: 'Vendeur',
  localField: '_id',
  foreignField: 'utilisateur'
});

UtilisateurSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.tokens;
    delete ret.refreshTokens;
    delete ret.fcmTokens;
    return ret;
  },
});
UtilisateurSchema.set('toObject', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.tokens;
    delete ret.refreshTokens;
    delete ret.fcmTokens;
    return ret;
  },
});

const utilisateurModel = mongoose.model("Utilisateur", UtilisateurSchema);
export default utilisateurModel;
