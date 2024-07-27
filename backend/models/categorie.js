const mongoose = require('mongoose');

const CategorieSchema = mongoose.Schema({
    nomgroupe: { type: String, required: true },
    groupe: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Groupe',
        required: true 
    },
});

module.exports = mongoose.model('Categorie', CategorieSchema);