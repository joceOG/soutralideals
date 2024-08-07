const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
    nomArticle: { type: String, required: true },
    prixArticle: { type: String, required: true },
    quantiteArticle: { type: Number, required: true },
    photoArticle: {
        type: Buffer,
    },
    categorie: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Categorie',
        required: true 
    },
});

module.exports = mongoose.model('Article', ArticleSchema);
