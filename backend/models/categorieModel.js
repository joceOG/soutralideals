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


   // Virtual
   CategorieSchema.virtual('articles', {
    ref: 'Article',       
    localField: '_id',       
    foreignField: 'categorie'    
});


const categorieModel = mongoose.model("Categorie", CategorieSchema);

  export default categorieModel;