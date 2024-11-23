import mongoose from 'mongoose'

        // Définition du schéma Prestation
 const prestationSchema = mongoose.Schema({
       
        idUtilisateur: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', 
            required: true,
        },

       
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
