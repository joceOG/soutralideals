import mongoose from 'mongoose'

const ServiceSchema = new mongoose.Schema({
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
    nomservice: { type: String, required: true },
    imageservice: { type: String, required: false },
    prixmoyen : { type: String, required: true },
    categorie: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', required: true },
=======
=======
>>>>>>> 1ca350b (Dashboard Complet and Merge)
  nomservice: { type: String, required: true },
  imageservice: { type: String, required: false },
  // Prix optionnel au niveau catalogue.
  // Le prix final obligatoire sera porté par l'offre publiée (FreelanceService).
  prixmoyen: { type: String, required: false, default: null },
  categorie: { type: mongoose.Schema.Types.ObjectId, ref: 'Categorie', required: true },
  tags: [String],
  // Adjust as necessary
});

<<<<<<< HEAD
 // Virtual
   ServiceSchema.virtual('freelance', {
    ref: 'Freelance',             // Référence à la collection 'Task'
    localField: '_id',       
    foreignField: 'service'    
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
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
>>>>>>> 1ca350b (Dashboard Complet and Merge)
});


const serviceModel = mongoose.model('Service', ServiceSchema);

export default serviceModel