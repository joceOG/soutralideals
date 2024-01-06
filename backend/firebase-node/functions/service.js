const mongoose = require('mongoose');

const ServiceSchema = mongoose.Schema({
    nom: { type: String, required: true },
    prix: { type: String, required: true },
    image: {
        type: Buffer,
    },
});

module.exports = mongoose.model('Service', ServiceSchema);