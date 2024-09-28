const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
    nomArticle: { type: String, required: true },
    prixArticle: { type: String, required: true },
    quantiteArticle: { type: Number, required: true },
    photoArticle: { type: String },
    categorie: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie' }, // Reference to Categorie model
});

module.exports = mongoose.model('Article', ArticleSchema);
