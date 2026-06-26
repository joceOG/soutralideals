import mongoose from 'mongoose';

const STATUS_COMMANDE = ['En cours', 'Confirmée', 'En préparation', 'Expédiée', 'Livrée', 'Annulée'];

const CommandeSchema = new mongoose.Schema({
  // ✅ Référence client (traçabilité indispensable)
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },

  // ✅ Référence vendeur (pour les notifications et dashboard vendeur)
  vendeur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendeur',
    index: true
  },

  infoCommande: {
    addresse: { type: String, required: true },
    ville: { type: String, required: true },
    telephone: { type: String, required: true },
    codePostal: { type: String, required: true },
    pays: { type: String, required: true }
  },

  articles: [
    {
      nom: { type: String, required: true },
      // Renommé sans accent pour cohérence JSON
      quantite: { type: Number, required: true, min: 1 },
      image: { type: String },
      prix: { type: Number, required: true, min: 0 }
    }
  ],

  paiementInfo: {
    id: { type: String },
    status: { type: String }
  },

  datePaie: { type: Date },

  prixArticles: { type: Number, required: true, default: 0, min: 0 },
  prixLivraison: { type: Number, required: true, default: 0, min: 0 },
  prixTotal: { type: Number, required: true, default: 0, min: 0 },

  // ✅ Enum pour empêcher des statuts arbitraires
  statusCommande: {
    type: String,
    required: true,
    enum: STATUS_COMMANDE,
    default: 'En cours',
    index: true
  },

  dateLivraison: { type: Date },
  dateCreation: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

// Index composé pour les requêtes fréquentes
CommandeSchema.index({ utilisateur: 1, statusCommande: 1 });
CommandeSchema.index({ vendeur: 1, statusCommande: 1 });

const commandeModel = mongoose.model('Commande', CommandeSchema);
export default commandeModel;
