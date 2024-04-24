const mongoose = require('mongoose');

const TypeutilisateurSchema = mongoose.Schema({
    LibelleType: { type: String, required: true },
    type_prestataire: { type: String, required: true},
    type_client: { type: String, required: true}
});

module.exports = mongoose.model('Typeutilisateur', TypeutilisateurSchema);