const mongoose = require('mongoose');

const GroupeSchema = mongoose.Schema({
    nomgroupe: { type: String, required: true },
});

module.exports = mongoose.model('Groupe', GroupeSchema);