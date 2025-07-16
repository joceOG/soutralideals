import mongoose from 'mongoose';

const vendeurSchema = new mongoose.Schema({
  nomvendeur: {
    type: String,
    required: true,
    trim: true
  },
  telephone: {
    type: String,
  },
  email: {
    type: String,
    lowercase: true,
  },
  adresse: {
    type: String,
  },
  dateCreation: {
    type: Date,
    default: Date.now,
  },
});

const vendeurModel = mongoose.model('Vendeur', vendeurSchema);
export default vendeurModel;
