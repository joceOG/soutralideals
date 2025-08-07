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
    utilisateur:{
        type: mongoose.Schema.Types.ObjectId,
        required:true,
        ref:'Utilisateur'
    },
    categorie:
     { type: mongoose.Schema.Types.ObjectId,
        required:true,
         ref: 'Categorie' }, 
});

const articleModel = mongoose.model('Article', ArticleSchema);


export default articleModel