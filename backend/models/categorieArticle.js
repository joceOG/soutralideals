const mongoose = require('mongoose');

const CategorieArticleSchema = new mongoose.Schema({
    nomCategorie: { type: String, required: true, unique: true },
    description: { type: String },
    dateCreation: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CategorieArticle', CategorieArticleSchema);
