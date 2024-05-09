const mongoose = require('mongoose');

const CategorieServiceSchema = mongoose.Schema({
    nomgroupe: { type: String, required: true },
    idgroupe: { type: String, required: true },
    nomcategorie: { type: String, required: true },
    categories: [],
    

});

module.exports = mongoose.model('CategorieService', CategorieServiceSchema);