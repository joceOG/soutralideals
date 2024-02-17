const mongoose = require('mongoose');

const CategorieSchema = mongoose.Schema({
    nomcategorie: { type: String, required: true },
    idgroupe: { type: String, required: true },
});

module.exports = mongoose.model('Categorie', CategorieSchema);