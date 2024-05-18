const mongoose = require('mongoose');

const PrestataireSchema = mongoose.Schema({
    idUtilisateur: { type: String },
    cni : { type: Buffer },
    selfie: { type: Buffer },
    verifier : { type: Boolean },
    idservice: { type: String },
    nomservice: { type: String },
    prixmoyen: { type: String },
    localisation: { type: String },
    note: { type: String },
});

module.exports = mongoose.model('Prestataire', PrestataireSchema);