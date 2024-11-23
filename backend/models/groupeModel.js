import mongoose from 'mongoose'

const GroupeSchema = mongoose.Schema({
    nomgroupe: 
    { type: String,
         required: true },
});

const groupeModel = mongoose.model('Groupe', GroupeSchema); 

export default groupeModel;