import bcrypt from "bcrypt";
import mongoose from "mongoose";
import validator from "validator";
import jwt from "jsonwebtoken";

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
<<<<<<< HEAD
email: {  
  type: String,
  trim: true,
  lowercase: true,
  unique: true,
  sparse: true, // permet plusieurs null
  default: null,
  validate(value) {
    if (value && !validator.isEmail(value)) { 
      throw new Error("Email invalide");
=======
  email: {  
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error('Email invalide');
      }
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    }
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
    unique: true
  },
<<<<<<< HEAD
<<<<<<< HEAD
  telephoneVerified: { type: Boolean, default: false },
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
  telephoneVerified: { type: Boolean, default: false },
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
  genre: { type: String },
  note: { type: String },
  photoProfil: { type: String },

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
  // Admin : accès dashboard (liste utilisateurs, etc.) — à n’attribuer qu’en base ou via script sécurisé
  role: {
    type: String,
    enum: ["Admin", "Prestataire", "Vendeur", "Freelance", "Client"],
    required: true,
<<<<<<< HEAD
=======
  // ✅ Ajout du rôle Client
  role: { 
    type: String, 
    enum: ["Prestataire", "Vendeur", "Freelance", "Client"], 
    required: true 
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
  },

  tokens: [{
    token: { type: String, required: true }
  }]
}, {
  timestamps: true
});

// Hash du mot de passe avant sauvegarde
UtilisateurSchema.pre("save", async function(next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
  next();
});

// Génération token JWT incluant le rôle
UtilisateurSchema.methods.generateAuthToken = async function() {
  const user = this;
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
  const token = jwt.sign(
    { _id: user._id.toString(), id: user._id.toString(), role: user.role },
    secret,
    { expiresIn: '7d' }
  );
<<<<<<< HEAD
=======
  const token = jwt.sign({ _id: user._id.toString(), role: user.role }, 'thisisoutrali');
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
};

// Méthode statique pour login par email ou téléphone
UtilisateurSchema.statics.findByCredentials = async function(identifiant, password) {
  let user = null;
  if (validator.isEmail(identifiant)) {
    user = await this.findOne({ email: identifiant });
  } else {
    user = await this.findOne({ telephone: identifiant });
  }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
  if (!user) throw new Error('Identifiants incorrects');
=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
  console.log("👤 Utilisateur trouvé:", user ? "OUI" : "NON");
  if (user) {
    console.log("👤 Détails utilisateur:", { 
      id: user._id, 
      nom: user.nom, 
      email: user.email, 
      telephone: user.telephone,
      role: user.role 
    });
  }

  if (!user) throw new Error('Utilisateur non trouvé');
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)

  console.log("🔐 Vérification du mot de passe...");
  const isMatch = await bcrypt.compare(password, user.password);
<<<<<<< HEAD
  if (!isMatch) throw new Error('Identifiants incorrects');
=======
  console.log("🔐 Mot de passe correct:", isMatch);
  
  if (!isMatch) throw new Error('Mot de passe incorrect');
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======

  console.log("🔐 Vérification du mot de passe...");
  const isMatch = await bcrypt.compare(password, user.password);
  console.log("🔐 Mot de passe correct:", isMatch);
  
  if (!isMatch) throw new Error('Mot de passe incorrect');
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
  if (!user) throw new Error('Identifiants incorrects');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Identifiants incorrects');
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)

  return user;
};

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
// Méthode d'instance pour comparer un mot de passe en clair avec le hash
UtilisateurSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

<<<<<<< HEAD
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
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

const utilisateurModel = mongoose.model("Utilisateur", UtilisateurSchema);
<<<<<<< HEAD
export default utilisateurModel;
=======
export default utilisateurModel;
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
