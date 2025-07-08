import mongoose from 'mongoose'

const CommandeSchema = mongoose.Schema({
    infoCommande: {
        addresse: {
            type: String,
            required: true
        },
        ville: {
            type: String,
            required: true
        },
        telephone: {
            type: String,
            required: true
        },
        codePostal: {
            type: String,
            required: true
        },
        pays: {
            type: String,
            required: true
        }
    },
    
    articles: [
        {
            nom: {
                type: String,
                required: true
            },
            quantité: {
                type: Number,
                required: true
            },
            image: {
                type: String,
                required: true
            },
            prix: {
                type: Number,
                required: true
            },
            
        }
    ],
    paiementInfo: {
        id: {
            type: String
        },
        status: {
            type: String
        }
    },
    datePaie: {
        type: Date
    },

    prixArticles: {
        type: Number,
        required: true,
        default: 0.0
    },
   
    prixLivraison: {
        type: Number,
        required: true,
        default: 0
    },
    prixTotal: {
        type: Number,
        required: true,
        default: 0
    },
    statusCommande: {
        type: String,
        required: true,
        default: 'En cours'
    },
    dateLivraison: {
        type: Date
    },
    dateCreation: {
        type: Date,
        default: Date.now
    }

})

const commandeModel =  mongoose.model('Commande', CommandeSchema);

export default commandeModel; 