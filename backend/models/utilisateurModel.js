const mongoose = require('mongoose');

const UtilisateurSchema = mongoose.Schema({
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    adresseemail: { type: String, required: true},
    idtypeutilisateur:{type: String,},
    photoprofil: { type: Buffer, required: true},
    motdepasse: { type: String, required: true},
    numerotelephone: { type: Number, required: true},
    genre: { type: String, required: true},
    photoprofessionnelle: { type: Buffer, required: true},
    note: { type: String, required: true},
    
});

module.exports = mongoose.model('Utilisateur', UtilisateurSchema);