const mongoose = require('mongoose');

const UtilisateurSchema = mongoose.Schema({

    nom: { type: String },
    prenom: { type: String  },
    eemail: { type: String },
    photoprofil: { type: Buffer },
    motdepasse: { type: String },
    numerotelephone: { type: Number },
    genre: { type: String },
    note: { type: String },
});

module.exports = mongoose.model('Utilisateur', UtilisateurSchema);
