import mongoose from 'mongoose';

const VendeurSchema = new mongoose.Schema({
  // 👤 Référence utilisateur
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Utilisateur'
  },

  // 🏪 INFORMATIONS BOUTIQUE (sdealsapp standard)
  shopName: {
    type: String,
    required: true,
    maxlength: 100
  },

  shopDescription: {
    type: String,
    maxlength: 1000,
    required: true
  },

  shopLogo: {
    type: String, // URL Cloudinary
    required: false
  },

  businessType: {
    type: String,
    enum: ['Particulier', 'Entreprise', 'Auto-entrepreneur'],
    required: true,
    default: 'Particulier'
  },

  businessCategories: [{
    type: String, // Mode, Électronique, Beauté, etc.
    required: true
  }],

  // ⭐ SYSTÈME DE NOTATION (comme Freelance)
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  completedOrders: {
    type: Number,
    default: 0
  },

  isTopRated: {
    type: Boolean,
    default: false
  },

  isFeatured: {
    type: Boolean,
    default: false
  },

  isNew: {
    type: Boolean,
    default: true
  },

  responseTime: {
    type: Number,
    default: 24 // heures
  },

  // 💰 STATISTIQUES BUSINESS
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0
  },

  totalSales: {
    type: Number,
    default: 0
  },

  currentOrders: {
    type: Number,
    default: 0
  },

  customerSatisfaction: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  returnRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // 🚚 LIVRAISON & LOGISTIQUE
  deliveryZones: [{
    type: String // Villes, régions
  }],

  shippingMethods: [{
    type: String,
    enum: ['Standard', 'Express', 'Same-Day', 'Pickup']
  }],

  deliveryTimes: {
    standard: {
      type: String,
      default: '3-5 jours'
    },
    express: {
      type: String,
      default: '1-2 jours'
    }
  },

  shippingRates: [{
    zone: String,
    method: String,
    price: Number,
    freeThreshold: Number
  }],

  // 💳 PAIEMENTS & COMMISSION
  paymentMethods: [{
    type: String,
    enum: ['Mobile Money', 'Carte Bancaire', 'Virement', 'Espèces']
  }],

  commissionRate: {
    type: Number,
    default: 5, // Pourcentage
    min: 0,
    max: 20
  },

  payoutFrequency: {
    type: String,
    enum: ['Hebdomadaire', 'Mensuelle'],
    default: 'Mensuelle'
  },

  taxInfo: {
    taxNumber: String,
    taxExempt: { type: Boolean, default: false }
  },

  // 📦 PRODUITS & INVENTAIRE
  productCategories: [{
    type: String
  }],

  totalProducts: {
    type: Number,
    default: 0
  },

  activeProducts: {
    type: Number,
    default: 0
  },

  averageProductPrice: {
    type: Number,
    default: 0
  },

  // 🏢 INFORMATIONS LÉGALES
  businessRegistrationNumber: {
    type: String,
    required: false
  },

  businessAddress: {
    street: String,
    city: String,
    postalCode: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  businessPhone: {
    type: String,
    required: false
  },

  businessEmail: {
    type: String,
    required: false
  },

  // 📊 PRÉFÉRENCES & POLITIQUES
  returnPolicy: {
    type: String,
    maxlength: 500,
    default: 'Retour accepté sous 14 jours'
  },

  warrantyInfo: {
    type: String,
    maxlength: 300
  },

  minimumOrderAmount: {
    type: Number,
    default: 0
  },

  maxOrdersPerDay: {
    type: Number,
    default: 50
  },

  // 🔐 VÉRIFICATION & SÉCURITÉ (modernisé)
  verificationLevel: {
    type: String,
    enum: ['Basic', 'Verified', 'Premium'],
    default: 'Basic'
  },

  verificationDocuments: {
    cni1: String, // URL Cloudinary
    cni2: String, // URL Cloudinary
    selfie: String, // URL Cloudinary
    businessLicense: String, // Licence commerciale
    taxDocument: String, // Document fiscal
    isVerified: { type: Boolean, default: false }
  },

  identityVerified: {
    type: Boolean,
    default: false
  },

  businessVerified: {
    type: Boolean,
    default: false
  },

  // 📈 ACTIVITÉ & PERFORMANCE
  lastActive: {
    type: Date,
    default: Date.now
  },

  joinedDate: {
    type: Date,
    default: Date.now
  },

  profileViews: {
    type: Number,
    default: 0
  },

  conversionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // ⚙️ STATUT COMPTE
  accountStatus: {
    type: String,
    enum: ['Active', 'Suspended', 'Pending', 'Banned'],
    default: 'Pending'
  },

  subscriptionType: {
    type: String,
    enum: ['Free', 'Premium', 'Pro'],
    default: 'Free'
  },

  premiumFeatures: [{
    type: String
  }],

  // 🌐 RÉSEAUX SOCIAUX & MARKETING
  socialMedia: {
    facebook: String,
    instagram: String,
    whatsapp: String,
    website: String
  },

  promotionalOffers: [{
    title: String,
    description: String,
    discount: Number,
    validUntil: Date
  }],

  // 📞 CONTACT SUPPORT
  preferredContactMethod: {
    type: String,
    enum: ['Email', 'Phone', 'WhatsApp'],
    default: 'Email'
  },

  // 🔄 HISTORIQUE DES STATUTS
  statusHistory: [{
    status: String,
    date: { type: Date, default: Date.now },
    reason: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' }
  }],

  // 🏷️ MÉTADONNÉES
  tags: [String], // Tags pour recherche et catégorisation
  
  notes: {
    type: String,
    maxlength: 1000
  },

  // 🆕 OPTION C - Traçabilité et validation
  source: { 
    type: String, 
    enum: ['web', 'sdealsmobile', 'sdealsidentification', 'dashboard'],
    default: 'web' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'rejected', 'suspended'],
    default: 'active'
  },
  recenseur: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Utilisateur' 
  },
  dateRecensement: { type: Date },
  validePar: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
  dateValidation: { type: Date },
  motifRejet: { type: String }

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔍 INDEX POUR OPTIMISER LES REQUÊTES
VendeurSchema.index({ utilisateur: 1 });
VendeurSchema.index({ businessCategories: 1, accountStatus: 1 });
VendeurSchema.index({ rating: -1, isTopRated: -1 });
VendeurSchema.index({ shopName: 'text', shopDescription: 'text' });
VendeurSchema.index({ 'businessAddress.city': 1 });

// 📊 MÉTHODES STATIQUES POUR STATISTIQUES
VendeurSchema.statics.getTopRatedVendeurs = async function(limit = 10) {
  return await this.find({ 
    accountStatus: 'Active',
    rating: { $gte: 4 }
  })
  .sort({ rating: -1, completedOrders: -1 })
  .limit(limit)
  .populate('utilisateur', 'nom prenom');
};

VendeurSchema.statics.getVendeursByCategory = async function(category) {
  return await this.find({
    businessCategories: category,
    accountStatus: 'Active'
  })
  .sort({ rating: -1 })
  .populate('utilisateur', 'nom prenom');
};

VendeurSchema.statics.getVendeurStats = async function(vendeurId) {
  return await this.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(vendeurId) } },
    {
      $lookup: {
        from: 'articles',
        localField: '_id',
        foreignField: 'vendeur',
        as: 'articles'
      }
    },
    {
      $project: {
        shopName: 1,
        rating: 1,
        completedOrders: 1,
        totalEarnings: 1,
        totalProducts: { $size: '$articles' },
        activeProducts: {
          $size: {
            $filter: {
              input: '$articles',
              as: 'article',
              cond: { $eq: ['$$article.statut', 'active'] }
            }
          }
        }
      }
    }
  ]);
};

// 🔄 MÉTHODES D'INSTANCE
VendeurSchema.methods.updateRating = async function(newRating) {
  const currentTotal = this.rating * this.completedOrders;
  this.completedOrders += 1;
  this.rating = (currentTotal + newRating) / this.completedOrders;
  
  // Vérifier si éligible TopRated
  if (this.rating >= 4.5 && this.completedOrders >= 50) {
    this.isTopRated = true;
  }
  
  return await this.save();
};

VendeurSchema.methods.changeStatus = async function(newStatus, reason, updatedBy) {
  this.statusHistory.push({
    status: this.accountStatus,
    reason,
    updatedBy
  });
  
  this.accountStatus = newStatus;
  return await this.save();
};

// 📈 VIRTUAL POUR ARTICLES
VendeurSchema.virtual('articles', {
  ref: 'Article',
  localField: '_id',
  foreignField: 'vendeur'
});

const vendeurModel = mongoose.model('Vendeur', VendeurSchema);

export default vendeurModel;
