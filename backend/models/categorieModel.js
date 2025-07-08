import mongoose from 'mongoose'

const CategorieSchema = mongoose.Schema({
    nomcategorie: 
    { type: String, 
        required: true },
    imagecategorie: {
        type: String,
        required:true
    },
    groupe: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Groupe',
        required: true 
    },
});


<<<<<<< HEAD
// J'nclure les virtuels dans le  JSON
CategorieSchema.set('toObject', { virtuals: true });
CategorieSchema.set('toJSON', { virtuals: true });


   // Virtual Categories
=======
   // Virtual
>>>>>>> 0b7e280 (Connexion effective entre front et back)
   CategorieSchema.virtual('articles', {
    ref: 'Article',       
    localField: '_id',       
    foreignField: 'categorie'    
<<<<<<< HEAD
})
;
   // Virtual Services
   CategorieSchema.virtual('services', {
    ref: 'Service',       
    localField: '_id',       
    foreignField: 'categorie'    
=======
>>>>>>> 0b7e280 (Connexion effective entre front et back)
});


const categorieModel = mongoose.model("Categorie", CategorieSchema);

  export default categorieModel;