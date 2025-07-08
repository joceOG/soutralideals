import mongoose from 'mongoose'

const GroupeSchema = mongoose.Schema({
    nomgroupe: 
    { type: String,
<<<<<<< HEAD
        trim:true,
         required: true },
});

GroupeSchema.virtual('categories', {
    ref: 'Categorie',       
    localField: '_id',       
    foreignField: 'groupe'    
});

=======
         required: true },
});

>>>>>>> 0b7e280 (Connexion effective entre front et back)
const groupeModel = mongoose.model('Groupe', GroupeSchema); 

export default groupeModel;