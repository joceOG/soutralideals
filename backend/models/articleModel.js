import mongoose from 'mongoose'

const ArticleSchema = new mongoose.Schema({
    nomArticle:
        { type: String, required: true },
    prixArticle:
        { type: Number, required: true, min: 0 },
    ancienPrixArticle:
        { type: Number, default: null },
    discountPercent:
        { type: Number, default: 0, min: 0, max: 100 },
    isPromo:
        { type: Boolean, default: false },
    rating:
        { type: Number, default: 0, min: 0, max: 5 },
    salesCount:
        { type: Number, default: 0, min: 0 },
    quantiteArticle:
        { type: Number, required: true },
    photoArticle: {
        type: String,
        required: true,
    },
    vendeur: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Vendeur'
    },
    categorie:
    {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Categorie'
    },
    tags: [String]
});

// Index textuel pour la recherche
ArticleSchema.index({ nomArticle: 'text', tags: 'text' });

const articleModel = mongoose.model('Article', ArticleSchema);


export default articleModel