import mongoose from 'mongoose'

const ServiceSchema = new mongoose.Schema({
    nomservice: { type: String, required: true },
    imageservice: { type: String, required: true },
    prixmoyen : { type: String, required: true },
    categorie: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', required: true },
  // Adjust as necessary
  });
  
 // Virtual
   ServiceSchema.virtual('prestataire', {
    ref: 'Prestataire',             // Référence à la collection 'Task'
    localField: '_id',       
    foreignField: 'service'    
});

 // Virtual
   ServiceSchema.virtual('freelance', {
    ref: 'Freelance',             // Référence à la collection 'Task'
    localField: '_id',       
    foreignField: 'service'    
});


const serviceModel = mongoose.model('Service', ServiceSchema);

export default serviceModel

