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
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error('Email invalide');
      }
=======
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
>>>>>>> 5208114 (Eviter les emails vide)
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
  telephoneVerified: { type: Boolean, default: false },
  genre: { type: String },
  note: { type: String },
  photoProfil: { type: String },

  // Admin : accès dashboard (liste utilisateurs, etc.) — à n’attribuer qu’en base ou via script sécurisé
  role: {
    type: String,
    enum: ["Admin", "Prestataire", "Vendeur", "Freelance", "Client"],
    required: true,
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
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
  const token = jwt.sign(
    { _id: user._id.toString(), id: user._id.toString(), role: user.role },
    secret,
    { expiresIn: '7d' }
  );
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

const utilisateurModel = mongoose.model("Utilisateur", UtilisateurSchema);
export default utilisateurModel;