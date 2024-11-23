<<<<<<< HEAD
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
=======
import mongoose from 'mongoose'

        // Définition du schéma Prestation
 const prestationSchema = mongoose.Schema({
       
        idUtilisateur: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', 
            required: true,
        },

<<<<<<< HEAD
       
        idPrestataire: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Prestataire',  
            required: true,
        },

       
        nomUtilisateur: {
            type: String,
            required: true,
        },

      
        prenomUtilisateur: {
            type: String,
            required: true,
        },

        // Date de la commande
        dateCommande: {
            type: Date,
            default: Date.now, // Par défaut, la date actuelle
            required: true,
        },

        // Date de début de la prestation
        dateDebut: {
            type: Date,
            required: true,
        },

        // Date de fin de la prestation
        dateFin: {
            type: Date,
            required: true,
        },

        // Statut de la prestation
        statut: {
            type: String,
            enum: ['en attente', 'en cours', 'terminée', 'annulée'], 
            default: 'en attente',  
            required: true,
        },

        // Note donnée à la prestation (1 à 5)
        noteCommande: {
            type: Number,
            min: 1,
            max: 5,
            required: false,  
        }
        }, { timestamps: true });

        // Création du modèle Prestation basé sur le schéma
        const Prestation = mongoose.model('Prestation', prestationSchema);

        module.exports = Prestation;
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
module.exports = mongoose.model('Prestation', PrestationSchema); 
>>>>>>> 1b487c7 (Connexion effective entre front et back)
