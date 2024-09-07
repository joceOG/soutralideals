const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const UtilisateurSchema = mongoose.Schema({
    nom: { type: String },
    prenom: { type: String  },
    email: { type: String },
    password: { type: String },
    telephone: { type: String },
    genre: { type: String },
    note: { type: String },
    photoProfil: { type: String },
});

// Hash password before saving user
UtilisateurSchema.pre("save", async function(next) {
    if (!this.isModified('password')) return next(); // Only hash if password is modified or new

    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Attacher la fonction comparePassword au modèle utilisateurModel
UtilisateurSchema.statics.comparePassword = async function(email, password) {
    const utilisateur = await this.findOne({ email }).select('+password');
    if (utilisateur) {
        const auth = await bcrypt.compare(password, utilisateur.password);
        if (auth) {
            return utilisateur;
        }
        throw new Error("incorrect password");
    }
    throw new Error("incorrect email");
};

const utilisateurModel = mongoose.model("utilisateur", UtilisateurSchema);

module.exports = utilisateurModel;
