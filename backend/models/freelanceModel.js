import mongoose from 'mongoose';

const FreelanceSchema = mongoose.Schema({
    utilisateur: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Utilisateur', },
    service: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Service', },
    prixfreelance: { type: Number, required: true,},
    localisation: { type: String, required: true, },
    note: { type: String, },
    cni1: { type: String,  /* URL de l’image (ex: Cloudinary) */ },
    cni2: { type: String, },
    selfie: { type: String, },
    titreprofessionnel: { type: String, },
    categorieprincipale: { type: String, },
    niveauxexperience: { type: String, },
    competences: { type: mongoose.Schema.Types.Mixed, /* Peut être objet ou tableau */ },
    statut: { type: String, /* Ex : "Disponible", "Occupé" */ },
    horaire: { type: String, /* Ex : "Temps plein", "Temps partiel" */ },
    verifier: { type: Boolean, default: false, }
}, { timestamps: true });

const freelanceModel = mongoose.model('Freelance', FreelanceSchema);

export default freelanceModel;
