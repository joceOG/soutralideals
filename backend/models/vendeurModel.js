import mongoose from 'mongoose';

const VendeurSchema = mongoose.Schema({
    utilisateur: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Utilisateur'
    },
    localisation: {
        type: String
    },
    zonedelivraison: {
        type: String
    },
    note: {
        type: String
    },
    cni1: {
        type: String // URL de l’image (Cloudinary)
    },
    cni2: {
        type: String
    },
    selfie: {
        type: String
    },
    verifier: {
        type: String
    },

}, { timestamps: true });


   // Virtual
   VendeurSchema.virtual('article', {
    ref: 'Article',       
    localField: '_id',       
    foreignField: 'vendeur'    
});

const vendeurModel = mongoose.model('Vendeur', VendeurSchema);

export default vendeurModel;
