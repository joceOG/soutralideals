import mongoose from 'mongoose'

const ArticleSchema = new mongoose.Schema({
    nomArticle: 
    { type: String, required: true },
    prixArticle: 
    { type: String, required: true },
    quantiteArticle:
     { type: Number, required: true },
    photoArticle: { type: String ,
        required:true,
    },
    categorie:
     { type: mongoose.Schema.Types.ObjectId,
        required:true,
         ref: 'Categorie' }, 
});

const articleModel = mongoose.model('Article', ArticleSchema);


export default articleModel
