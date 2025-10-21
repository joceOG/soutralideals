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
>>>>>>> 33d3fb3 (feat: Backend complet pour système prestataire et panier)
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
  genre: { type: String },
  note: { type: String },
  photoProfil: { type: String },

  // ✅ Ajout du rôle Client
  role: { 
    type: String, 
    enum: ["Prestataire", "Vendeur", "Freelance", "Client"], 
    required: true 
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
  const token = jwt.sign({ _id: user._id.toString(), role: user.role }, 'thisisoutrali');
  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
};

// Méthode statique pour login par email ou téléphone
UtilisateurSchema.statics.findByCredentials = async function(identifiant, password) {
  console.log("🔍 findByCredentials - Recherche utilisateur:", { identifiant, password: "***" });
  
  let user = null;
  if (validator.isEmail(identifiant)) {
    console.log("📧 Recherche par email:", identifiant);
    user = await this.findOne({ email: identifiant });
  } else {
    console.log("📱 Recherche par téléphone:", identifiant);
    user = await this.findOne({ telephone: identifiant });
  }

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

  console.log("🔐 Vérification du mot de passe...");
  const isMatch = await bcrypt.compare(password, user.password);
  console.log("🔐 Mot de passe correct:", isMatch);
  
  if (!isMatch) throw new Error('Mot de passe incorrect');

  console.log("✅ Authentification réussie pour:", user.nom);
  return user;
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
