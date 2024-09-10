const mongoose = require('mongoose');

const CategorieSchema = mongoose.Schema({
    nomcategorie: { type: String, required: true },
    imagecategorie: {
        type: String,
    },
    groupe: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Groupe',
        required: true 
    },
});

module.exports = mongoose.model('Categorie', CategorieSchema);

