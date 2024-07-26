const mongoose = require('mongoose');

const PrestationSchema = mongoose.Schema({
    dateDebut: { type: Date, required: true },
    dateFin: { type: Date, required: true },
    status: { type: String, required: true },
    utilisateur: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Utilisateur',
        required: true 
    },
});

module.exports = mongoose.model('Prestation', PrestationSchema);