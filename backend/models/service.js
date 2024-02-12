const mongoose = require('mongoose');

const ServiceSxchema = mongoose.Schema({
    nom: { type: String, required: true },
    prix: { type: String, required: true },
    image: {
        type: Buffer,
    },
});

module.exports = mongoose.model('Servicex', ServiceSxchema);