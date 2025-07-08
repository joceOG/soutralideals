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
<<<<<<< HEAD
=======
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        required:true,
        ref:'User'
    },
>>>>>>> 0b7e280 (Connexion effective entre front et back)
    categorie:
     { type: mongoose.Schema.Types.ObjectId,
        required:true,
         ref: 'Categorie' }, 
});

const articleModel = mongoose.model('Article', ArticleSchema);

<<<<<<< HEAD
=======

>>>>>>> 0b7e280 (Connexion effective entre front et back)
export default articleModel
