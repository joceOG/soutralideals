const mongoose = require('mongoose');

const ServiceSchema = mongoose.Schema({
    nomservice: { type: String, required: true },
    imageservice: {
        type: Buffer,
    },
    idcategorie:{type: String, required: true},
    nomcategorie : { type: String, required: true },
});

module.exports = mongoose.model('Service', ServiceSchema);