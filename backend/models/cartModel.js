import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema({
  // 📦 Article
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true
  },

  // 🏪 Vendeur
  vendeur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendeur',
    required: true
  },

  // 📝 Détails de l'article (snapshot au moment de l'ajout)
  nomArticle: {
    type: String,
    required: true
  },

  imageArticle: {
    type: String,
    required: true
  },

  // 💰 Prix
  prixUnitaire: {
    type: Number,
    required: true,
    min: 0
  },

  // 📊 Quantité
  quantite: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },

  // 💵 Prix total pour cet article
  prixTotal: {
    type: Number,
    required: true,
    min: 0
  },

  // 🏷️ Variantes (taille, couleur, etc.)
  variantes: {
    type: Map,
    of: String,
    default: {}
  },

  // 📅 Date d'ajout
  dateAjout: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const CartSchema = new mongoose.Schema({
  // 👤 Utilisateur propriétaire du panier
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    unique: true // Un seul panier actif par utilisateur
  },

  // 🛍️ Articles dans le panier
  articles: [CartItemSchema],

  // 💰 Montants
  montantArticles: {
    type: Number,
    default: 0,
    min: 0
  },

  fraisLivraison: {
    type: Number,
    default: 0,
    min: 0
  },

  fraisService: {
    type: Number,
    default: 0,
    min: 0
  },

  montantTotal: {
    type: Number,
    default: 0,
    min: 0
  },

  // 🎁 Code promo
  codePromo: {
    code: {
      type: String,
      default: ''
    },
    reduction: {
      type: Number,
      default: 0,
      min: 0
    },
    typeReduction: {
      type: String,
      enum: ['POURCENTAGE', 'MONTANT_FIXE'],
      default: 'MONTANT_FIXE'
    }
  },

  // 📊 Statut
  statut: {
    type: String,
    enum: ['ACTIF', 'ABANDONNE', 'CONVERTI', 'EXPIRE'],
    default: 'ACTIF'
  },

  // 📅 Dates
  dateExpiration: {
    type: Date,
    default: () => new Date(+new Date() + 7*24*60*60*1000) // 7 jours
  },

  dateConversion: {
    type: Date
  },

  // 🔗 Référence à la commande créée (si converti)
  commandeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commande'
  },

  // 📝 Notes
  notes: {
    type: String,
    maxlength: 500
  },

  // 📍 Adresse de livraison (optionnelle, peut être ajoutée avant checkout)
  adresseLivraison: {
    adresse: String,
    ville: String,
    codePostal: String,
    pays: {
      type: String,
      default: 'Côte d\'Ivoire'
    },
    telephone: String
  }

}, {
  timestamps: true
});

// 🔍 INDEX POUR OPTIMISER LES REQUÊTES
CartSchema.index({ utilisateur: 1, statut: 1 });
CartSchema.index({ dateExpiration: 1 });
CartSchema.index({ 'articles.article': 1 });

// 🔄 MÉTHODE: CALCULER LES TOTAUX
CartSchema.methods.calculerTotaux = function() {
  // Calculer montant des articles
  this.montantArticles = this.articles.reduce((sum, item) => {
    return sum + item.prixTotal;
  }, 0);

  // Appliquer réduction si code promo
  let montantApresReduction = this.montantArticles;
  if (this.codePromo.code && this.codePromo.reduction > 0) {
    if (this.codePromo.typeReduction === 'POURCENTAGE') {
      montantApresReduction -= (this.montantArticles * this.codePromo.reduction / 100);
    } else {
      montantApresReduction -= this.codePromo.reduction;
    }
  }

  // Calculer frais de livraison (exemple: gratuit si > 50000 FCFA)
  if (montantApresReduction > 50000) {
    this.fraisLivraison = 0;
  } else {
    this.fraisLivraison = 2000; // 2000 FCFA par défaut
  }

  // Calculer montant total
  this.montantTotal = montantApresReduction + this.fraisLivraison + this.fraisService;

  // Arrondir à 2 décimales
  this.montantArticles = Math.round(this.montantArticles * 100) / 100;
  this.montantTotal = Math.round(this.montantTotal * 100) / 100;
};

// 🔄 MÉTHODE: AJOUTER UN ARTICLE
CartSchema.methods.ajouterArticle = function(articleData) {
  const { article, vendeur, nomArticle, imageArticle, prixUnitaire, quantite, variantes } = articleData;

  // Vérifier si l'article existe déjà (même article + mêmes variantes)
  const existingItemIndex = this.articles.findIndex(item => {
    const sameArticle = item.article.toString() === article.toString();
    const sameVariantes = JSON.stringify(item.variantes) === JSON.stringify(variantes || {});
    return sameArticle && sameVariantes;
  });

  if (existingItemIndex !== -1) {
    // Mettre à jour la quantité
    this.articles[existingItemIndex].quantite += quantite;
    this.articles[existingItemIndex].prixTotal = 
      this.articles[existingItemIndex].quantite * this.articles[existingItemIndex].prixUnitaire;
  } else {
    // Ajouter nouvel article
    this.articles.push({
      article,
      vendeur,
      nomArticle,
      imageArticle,
      prixUnitaire,
      quantite,
      prixTotal: prixUnitaire * quantite,
      variantes: variantes || {},
      dateAjout: new Date()
    });
  }

  this.calculerTotaux();
};

// 🔄 MÉTHODE: MODIFIER LA QUANTITÉ D'UN ARTICLE
CartSchema.methods.modifierQuantite = function(itemId, nouvelleQuantite) {
  const item = this.articles.id(itemId);
  
  if (!item) {
    throw new Error('Article non trouvé dans le panier');
  }

  if (nouvelleQuantite <= 0) {
    throw new Error('La quantité doit être supérieure à 0');
  }

  item.quantite = nouvelleQuantite;
  item.prixTotal = item.prixUnitaire * nouvelleQuantite;

  this.calculerTotaux();
};

// 🔄 MÉTHODE: RETIRER UN ARTICLE
CartSchema.methods.retirerArticle = function(itemId) {
  this.articles = this.articles.filter(item => item._id.toString() !== itemId.toString());
  this.calculerTotaux();
};

// 🔄 MÉTHODE: VIDER LE PANIER
CartSchema.methods.vider = function() {
  this.articles = [];
  this.montantArticles = 0;
  this.fraisLivraison = 0;
  this.fraisService = 0;
  this.montantTotal = 0;
  this.codePromo = {
    code: '',
    reduction: 0,
    typeReduction: 'MONTANT_FIXE'
  };
  this.notes = '';
};

// 🔄 MÉTHODE: APPLIQUER UN CODE PROMO
CartSchema.methods.appliquerCodePromo = function(code, reduction, typeReduction) {
  this.codePromo = {
    code,
    reduction,
    typeReduction: typeReduction || 'MONTANT_FIXE'
  };
  this.calculerTotaux();
};

// 🔄 MÉTHODE: CONVERTIR EN COMMANDE
CartSchema.methods.convertirEnCommande = async function(commandeId) {
  this.statut = 'CONVERTI';
  this.dateConversion = new Date();
  this.commandeId = commandeId;
  return await this.save();
};

// 🔄 MIDDLEWARE: AUTO-CALCULER AVANT SAUVEGARDE
CartSchema.pre('save', function(next) {
  if (this.isModified('articles') || this.isModified('codePromo')) {
    this.calculerTotaux();
  }
  next();
});

// 🔄 MÉTHODE STATIQUE: NETTOYER LES PANIERS EXPIRÉS
CartSchema.statics.nettoyerPaniersExpires = async function() {
  const maintenant = new Date();
  
  const result = await this.updateMany(
    {
      statut: 'ACTIF',
      dateExpiration: { $lt: maintenant }
    },
    {
      statut: 'EXPIRE'
    }
  );

  return result.modifiedCount;
};

// 🔄 MÉTHODE STATIQUE: OBTENIR STATISTIQUES
CartSchema.statics.getStatistiques = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$statut',
        count: { $sum: 1 },
        montantMoyen: { $avg: '$montantTotal' },
        montantTotal: { $sum: '$montantTotal' }
      }
    }
  ]);

  const paniersAbandonnés = await this.aggregate([
    {
      $match: {
        statut: 'ABANDONNE',
        dateExpiration: { $gte: new Date(Date.now() - 30*24*60*60*1000) } // 30 jours
      }
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        montantPerdu: { $sum: '$montantTotal' }
      }
    }
  ]);

  return {
    statsParStatut: stats,
    paniersAbandonnés: paniersAbandonnés[0] || { count: 0, montantPerdu: 0 }
  };
};

const cartModel = mongoose.model('Cart', CartSchema);

export default cartModel;





