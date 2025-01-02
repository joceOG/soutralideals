import mongoose from 'mongoose'

const GroupeSchema = mongoose.Schema({
    nomgroupe: 
    { type: String,
         required: true },
});

GroupeSchema.virtual('categories', {
    ref: 'Categorie',       
    localField: '_id',       
    foreignField: 'groupe'    
});

const groupeModel = mongoose.model('Groupe', GroupeSchema); 

export default groupeModel;