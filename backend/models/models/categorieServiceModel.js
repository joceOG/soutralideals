const mongoose = require('mongoose');

const CategorieServiceSchema = mongoose.Schema({
    nomGroupe: { type: String, required: true },
    idGroupe: { type: String, required: true },
    nomCategorie: { type: String, required: true },
    categories: [],

});

module.exports = mongoose.model('categorieService', CategorieServiceSchema); 