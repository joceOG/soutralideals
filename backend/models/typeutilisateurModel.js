const mongoose = require('mongoose');

const TypeutilisateurSchema = mongoose.Schema({
    LibelleType: { type: String, required: true },
});

module.exports = mongoose.model('Typeutilisateur', TypeutilisateurSchema);