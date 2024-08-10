const mongoose = require('mongoose');

const ServiceSchema = mongoose.Schema({
    nomservice: { type: String, required: true },
    imageservice: {
        type: Buffer,
    },
    categorie: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Categorie',
        required: true 
    },
    
});

module.exports = mongoose.model('Service', ServiceSchema);


