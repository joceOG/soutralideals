const mongoose = require('mongoose');

const CategorieSchema = mongoose.Schema({
    nomCategorie: { type: String, required: true },
    idGroupe: { type: String, required: true },
    nomGroupe : { type: String, required: true },
});

module.exports = mongoose.model('categorie', CategorieSchema); 