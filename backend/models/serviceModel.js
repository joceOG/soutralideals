const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    nomservice: { type: String, required: true },
    imageservice: { type: String, required: true },
    categorie: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', required: true },
    nomgroupe: { type: mongoose.Schema.Types.ObjectId, ref: 'Groupe', required: true } // Adjust as necessary
  });
  

module.exports = mongoose.model('Service', ServiceSchema);


