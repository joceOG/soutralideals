const mongoose = require('mongoose');

const CategorieSchema = mongoose.Schema({
    nomcategorie: { type: String, required: true },
    imagecategorie: {
        type: Buffer,
    },
    groupe: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Groupe',
        required: true 
    },
});

module.exports = mongoose.model('Categorie', CategorieSchema);

