const mongoose = require('mongoose');

const TypeutilisayeurSchema = mongoose.Schema({
    LibelleType: { type: String, required: true },
});

module.exports = mongoose.model('Typeutilisayeur', TypeutilisayeurSchema);