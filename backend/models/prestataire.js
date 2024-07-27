const mongoose = require('mongoose');

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

module.exports = mongoose.model('Prestataire', PrestataireSchema);