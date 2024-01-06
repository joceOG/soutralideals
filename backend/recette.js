const mongoose = require('mongoose');

const recetteSchema = mongoose.Schema({
    nom: { type: String, required: true },
    url: { type: String, required: true },
    temps_de_cuisson: { type: String, required: true },
});

module.exports = mongoose.model('Recette', recetteSchema);