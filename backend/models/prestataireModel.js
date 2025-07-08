import mongoose from 'mongoose'

const PrestataireSchema = mongoose.Schema({
    idutilisateur: { type: String },
    nomprenom : { type : String } ,
    telephone : { type : String },
    idservice: { type: String },
    nomservice: { type: String },
    prixmoyen: { type: String },
    localisation: { type: String },
    note: { type: String },
    cni1 : { type: Buffer },
    cni2 : { type: Buffer },
    selfie: { type: Buffer },
    verifier : { type: String },
});

<<<<<<< HEAD
   // Virtual Services
   PrestataireSchema.virtual('services', {
    ref: 'Service',       
    localField: '_id',       
    foreignField: 'owner'    
});

=======
>>>>>>> 0b7e280 (Connexion effective entre front et back)
const prestataireModel = mongoose.model('Prestataire', PrestataireSchema); 

export default prestataireModel;