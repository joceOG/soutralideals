const mongoose = require('mongoose');

const CommandeSchema = new mongoose.Schema({
    DateCommande: { type: Date, required: true },
    DetailsCommande: { type: String, required: true },
    article: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Article',
        required: true 
    },
    utilisateur: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Utilisateur',
        required: true 
    },
});

module.exports = mongoose.model('Commande', CommandeSchema);
