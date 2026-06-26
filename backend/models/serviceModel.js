import mongoose from 'mongoose'

const ServiceSchema = new mongoose.Schema({
  nomservice: { type: String, required: true },
  imageservice: { type: String, required: false },
  // Prix optionnel au niveau catalogue.
  // Le prix final obligatoire sera porté par l'offre publiée (FreelanceService).
  prixmoyen: { type: String, required: false, default: null },
  categorie: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', required: true },
  tags: [String],
  // Adjust as necessary
});

// Index textuel pour la recherche
ServiceSchema.index({ nomservice: 'text', tags: 'text' });

// Virtual
ServiceSchema.virtual('prestataire', {
  ref: 'Prestataire',             // Référence à la collection 'Task'
  localField: '_id',
  foreignField: 'service'
});

// Virtual
ServiceSchema.virtual('freelance', {
  ref: 'Freelance',             // Référence à la collection 'Task'
  localField: '_id',
  foreignField: 'service'
});


const serviceModel = mongoose.model('Service', ServiceSchema);

export default serviceModel

