const mongoose = require('mongoose');

const ServiceSchema = mongoose.Schema({
    nom: { type: String, required: true },
    prix: { type: String, required: true },
    image: {
        type: Buffer,
    },
    categorie: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Categorie',
        required: true 
    },
    
});

module.exports = mongoose.model('Service', ServiceSchema);