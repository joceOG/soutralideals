import mongoose from 'mongoose';

const PromotionSchema = new mongoose.Schema({
  // 📝 Informations de base
  titre: {
    type: String,
    required: true,
    maxlength: 100
  },

  description: {
    type: String,
    required: true,
    maxlength: 500
  },

  // 🎯 Ciblage
  typeCiblage: {
    type: String,
    enum: ['TOUS', 'CATEGORIE', 'SERVICE', 'UTILISATEUR', 'VILLE'],
    default: 'TOUS'
  },

  cibles: [{
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'cibleModel'
  }],

  cibleModel: {
    type: String,
    enum: ['Categorie', 'Service', 'Utilisateur'],
    required: false
  },

  // 💰 Offre
  typeOffre: {
    type: String,
    enum: ['POURCENTAGE', 'MONTANT_FIXE', 'LIVRAISON_GRATUITE', 'PRODUIT_GRATUIT'],
    required: true
  },

  valeurOffre: {
    type: Number,
    required: true,
    min: 0
  },

  montantMinimum: {
    type: Number,
    default: 0
  },

  // 📅 Dates
  dateDebut: {
    type: Date,
    required: true
  },

  dateFin: {
    type: Date,
    required: true
  },

  // 🎨 Présentation
  image: {
    type: String, // URL Cloudinary
    required: false
  },

  couleur: {
    type: String,
    default: '#FF6B6B'
  },

  // 📊 Statistiques
  vues: {
    type: Number,
    default: 0
  },

  clics: {
    type: Number,
    default: 0
  },

  conversions: {
    type: Number,
    default: 0
  },

  // ⚙️ Statut
  statut: {
    type: String,
    enum: ['ACTIVE', 'PAUSEE', 'TERMINEE', 'BROUILLON'],
    default: 'BROUILLON'
  },

  // 👤 Créateur
  createur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true
  },

  // 🔄 Historique
  historiqueModifications: [{
    date: { type: Date, default: Date.now },
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
    action: String,
    ancienneValeur: mongoose.Schema.Types.Mixed,
    nouvelleValeur: mongoose.Schema.Types.Mixed
  }]

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔍 Index pour optimiser les requêtes
PromotionSchema.index({ dateDebut: 1, dateFin: 1 });
PromotionSchema.index({ statut: 1 });
PromotionSchema.index({ typeCiblage: 1 });

// 📊 Méthodes statiques pour statistiques
PromotionSchema.statics.getStatsPromotions = async function(dateDebut, dateFin) {
  const matchCondition = {};
  if (dateDebut && dateFin) {
    matchCondition.createdAt = {
      $gte: new Date(dateDebut),
      $lte: new Date(dateFin)
    };
  }

  return await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$statut',
        count: { $sum: 1 },
        totalVues: { $sum: '$vues' },
        totalClics: { $sum: '$clics' },
        totalConversions: { $sum: '$conversions' }
      }
    }
  ]);
};

// 🎯 Méthode pour obtenir les promotions actives
PromotionSchema.statics.getPromotionsActives = async function() {
  const maintenant = new Date();
  return await this.find({
    statut: 'ACTIVE',
    dateDebut: { $lte: maintenant },
    dateFin: { $gte: maintenant }
  }).sort({ createdAt: -1 });
};

// 📈 Méthode pour incrémenter les vues
PromotionSchema.methods.incrementerVues = async function() {
  this.vues += 1;
  return await this.save();
};

// 🖱️ Méthode pour incrémenter les clics
PromotionSchema.methods.incrementerClics = async function() {
  this.clics += 1;
  return await this.save();
};

// 🎯 Méthode pour incrémenter les conversions
PromotionSchema.methods.incrementerConversions = async function() {
  this.conversions += 1;
  return await this.save();
};

const PromotionModel = mongoose.model('Promotion', PromotionSchema);

export default PromotionModel;
