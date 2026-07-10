import mongoose from 'mongoose'
import { sanitizeMediaUrl } from '../utils/sanitizeMediaUrl.js';

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

CategorieSchema.set('toJSON', {
  transform(_doc, ret) {
    const clean = sanitizeMediaUrl(ret.imagecategorie);
    if (!clean) delete ret.imagecategorie;
    else ret.imagecategorie = clean;
    return ret;
  },
});


const categorieModel = mongoose.model("Categorie", CategorieSchema);

  export default categorieModel;