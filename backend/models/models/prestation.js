const mongoose = require('mongoose');

const PrestationSchema = mongoose.Schema({
    // Client qui passe la commande
    utilisateur: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Utilisateur',
        required: true 
    },

    // Optionnel: prestataire ciblé
    prestataire: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prestataire',
    },

    // Service demandé
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
    },

    // Informations de planification
    dateHeure: { type: Date },
    dateDebut: { type: Date },
    dateFin: { type: Date },

    // Détails
    adresse: { type: String },
    ville: { type: String },
    notesClient: { type: String },

    // Paiement
    montant: { type: Number },
    moyenPaiement: { type: String }, // SOUTRAPAY / MOBILE_MONEY / CARD
    paiementStatus: { type: String, enum: ['INITIATED','PAID','FAILED'], default: 'INITIATED' },

    // Statut de la demande/prestation
    status: { 
        type: String, 
        enum: ['PENDING','ACCEPTED','IN_PROGRESS','DONE','CANCELED','REJECTED'],
        default: 'PENDING'
    },
}, { timestamps: true });

module.exports = mongoose.model('Prestation', PrestationSchema);