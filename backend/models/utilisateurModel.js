const mongoose = require('mongoose');

const UtilisateurSchema = mongoose.Schema({
    nom: { type: String },
    prenom: { type: String  },
    email: { type: String },
    motdepasse: { type: String },
    telephone: { type: String },
    genre: { type: String },
    note: { type: String },
    photoprofil: { type: Buffer },
});

module.exports = mongoose.model('Utilisateur', UtilisateurSchema);
