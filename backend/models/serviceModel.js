import mongoose from 'mongoose'

const ServiceSchema = new mongoose.Schema({
<<<<<<< HEAD
<<<<<<< HEAD
=======
<<<<<<< HEAD
    nomservice: { type: String, required: true },
    imageservice: { type: String, required: false },
    prixmoyen : { type: String, required: true },
    categorie: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', required: true },
=======
>>>>>>> 01c5d47 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> e390857 (Dashboard Complet and Merge)
  nomservice: { type: String, required: true },
  imageservice: { type: String, required: false },
  // Prix optionnel au niveau catalogue.
  // Le prix final obligatoire sera porté par l'offre publiée (FreelanceService).
  prixmoyen: { type: String, required: false, default: null },
  categorie: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', required: true },
  tags: [String],
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 1a64ce0 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
>>>>>>> 01c5d47 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> e390857 (Dashboard Complet and Merge)
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