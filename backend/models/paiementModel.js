import mongoose from 'mongoose';

const PaiementSchema = new mongoose.Schema({
  // 🆔 Identifiants de transaction
  numeroTransaction: {
    type: String,
    unique: true,
    required: true,
    index: true
  },

  referenceExterne: {
    type: String, // Référence du fournisseur de paiement (Stripe, PayPal, MTN, etc.)
    required: false
  },

  // 👤 Participants
  payeur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true
  },

  beneficiaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: false // Peut être null pour les paiements système
  },

  // 🔗 Objet du paiement
  typeObjet: {
    type: String,
    enum: ['COMMANDE', 'PRESTATION', 'ABONNEMENT', 'COMMISSION', 'REMBOURSEMENT', 'AUTRE'],
    required: true
  },

  objetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // ID de la commande, prestation, etc.
  },

  // 💰 Montants
  montantOriginal: {
    type: Number,
    required: true,
    min: 0
  },

  montantFrais: {
    type: Number,
    default: 0,
    min: 0
  },

  montantNet: {
    type: Number,
    required: true,
    min: 0
  },

  // 💱 Devise
  devise: {
    type: String,
    enum: ['XAF', 'EUR', 'USD'], // Franc CFA, Euro, Dollar
    default: 'XAF',
    required: true
  },

  // 💳 Méthode de paiement
  methodePaiement: {
    type: String,
    enum: [
      'CARTE_VISA',
      'CARTE_MASTERCARD', 
      'MOBILE_MONEY_MTN',
      'MOBILE_MONEY_ORANGE',
      'MOBILE_MONEY_MOOV',
      'PAYPAL',
      'VIREMENT_BANCAIRE',
      'ESPECES',
      'WALLET_PLATEFORME'
    ],
    required: true
  },

  // 📱 Détails spécifiques Mobile Money
  detailsMobileMoney: {
    numeroTelephone: { type: String },
    operateur: { type: String, enum: ['MTN', 'ORANGE', 'MOOV'] },
    codeTransaction: { type: String }
  },

  // 💳 Détails carte bancaire (masqués)
  detailsCarte: {
    dernierChiffres: { type: String }, // Ex: "****1234"
    typecarte: { type: String }, // Visa, Mastercard
    nomPorteur: { type: String },
    dateExpiration: { type: String } // Format MM/YY
  },

  // 🏦 Détails virement
  detailsVirement: {
    banqueEmettrice: { type: String },
    compteBeneficiaire: { type: String },
    referenceVirement: { type: String }
  },

  // 📊 Statuts
  statut: {
    type: String,
    enum: [
      'INITIE',          // Paiement initié
      'EN_ATTENTE',      // En attente de validation
      'EN_COURS',        // Paiement en cours de traitement
      'VALIDE',          // Paiement validé et confirmé
      'ECHEC',           // Échec du paiement
      'ANNULE',          // Paiement annulé
      'REMBOURSE',       // Paiement remboursé
      'LITIGE'           // En litige
    ],
    default: 'INITIE',
    required: true
  },

  // 📅 Dates importantes
  dateInitiation: {
    type: Date,
    default: Date.now,
    required: true
  },

  dateValidation: {
    type: Date,
    required: false
  },

  dateEcheance: {
    type: Date,
    required: false
  },

  // 🔄 Historique des statuts
  historiqueStatuts: [{
    statut: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    motif: {
      type: String,
      required: false
    },
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: false
    }
  }],

  // 🏢 Fournisseur de paiement
  fournisseurPaiement: {
    type: String,
    enum: ['STRIPE', 'PAYPAL', 'MTN_MOMO', 'ORANGE_MONEY', 'FLUTTERWAVE', 'PAYSTACK', 'INTERNE'],
    required: true
  },

  // 📝 Description et notes
  description: {
    type: String,
    maxlength: 500,
    required: true
  },

  motifPaiement: {
    type: String,
    maxlength: 200,
    required: false
  },

  notesInternes: {
    type: String,
    maxlength: 1000,
    required: false
  },

  // 🔒 Sécurité et fraude
  adresseIP: {
    type: String,
    required: false
  },

  userAgent: {
    type: String,
    required: false
  },

  scoreRisque: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  estSuspect: {
    type: Boolean,
    default: false
  },

  // 📄 Reçus et factures
  numeroRecu: {
    type: String,
    unique: true,
    sparse: true // Permet null values uniques
  },

  lienRecu: {
    type: String, // URL vers le PDF du reçu
    required: false
  },

  // 💸 Commission plateforme
  commissionPlateforme: {
    type: Number,
    default: 0,
    min: 0
  },

  tauxCommission: {
    type: Number,
    default: 0,
    min: 0,
    max: 100 // Pourcentage
  },

  // 🔄 Paiements liés (remboursements, etc.)
  paiementOriginal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paiement',
    required: false
  },

  paiementsLies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paiement'
  }],

  // 📊 Métadonnées
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }

}, {
  timestamps: true
});

// 🔍 Index pour optimiser les requêtes
PaiementSchema.index({ payeur: 1, statut: 1 });
PaiementSchema.index({ beneficiaire: 1, statut: 1 });
PaiementSchema.index({ typeObjet: 1, objetId: 1 });
PaiementSchema.index({ methodePaiement: 1, statut: 1 });
PaiementSchema.index({ dateInitiation: -1 });
PaiementSchema.index({ numeroTransaction: 1 });

// 🎯 Méthode statique pour générer un numéro de transaction
PaiementSchema.statics.genererNumeroTransaction = function() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAY-${timestamp}-${random}`;
};

// 📊 Méthodes statiques pour statistiques
PaiementSchema.statics.getStatsUtilisateur = async function(userId) {
  return await this.aggregate([
    {
      $match: {
        $or: [
          { payeur: new mongoose.Types.ObjectId(userId) },
          { beneficiaire: new mongoose.Types.ObjectId(userId) }
        ]
      }
    },
    {
      $group: {
        _id: '$statut',
        count: { $sum: 1 },
        totalMontant: { $sum: '$montantNet' }
      }
    }
  ]);
};

PaiementSchema.statics.getStatsMethodes = async function(dateDebut, dateFin) {
  const matchCondition = {};
  if (dateDebut && dateFin) {
    matchCondition.dateInitiation = {
      $gte: new Date(dateDebut),
      $lte: new Date(dateFin)
    };
  }

  return await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: '$methodePaiement',
        count: { $sum: 1 },
        totalMontant: { $sum: '$montantNet' },
        montantMoyen: { $avg: '$montantNet' }
      }
    },
    { $sort: { totalMontant: -1 } }
  ]);
};

// 🔄 Méthode pour changer le statut avec historique
PaiementSchema.methods.changerStatut = async function(nouveauStatut, motif = '', utilisateur = null) {
  this.historiqueStatuts.push({
    statut: this.statut,
    date: new Date(),
    motif,
    utilisateur
  });
  
  this.statut = nouveauStatut;
  
  if (nouveauStatut === 'VALIDE') {
    this.dateValidation = new Date();
  }
  
  return await this.save();
};

// 💰 Méthode pour calculer les frais
PaiementSchema.methods.calculerFrais = function() {
  let tauxFrais = 0;
  
  switch (this.methodePaiement) {
    case 'CARTE_VISA':
    case 'CARTE_MASTERCARD':
      tauxFrais = 2.9; // 2.9%
      break;
    case 'MOBILE_MONEY_MTN':
    case 'MOBILE_MONEY_ORANGE':
      tauxFrais = 1.5; // 1.5%
      break;
    case 'PAYPAL':
      tauxFrais = 3.4; // 3.4%
      break;
    case 'VIREMENT_BANCAIRE':
      tauxFrais = 0.5; // 0.5%
      break;
    default:
      tauxFrais = 0;
  }
  
  this.montantFrais = Math.round((this.montantOriginal * tauxFrais) / 100);
  this.montantNet = this.montantOriginal - this.montantFrais;
  
  return this;
};

const paiementModel = mongoose.model('Paiement', PaiementSchema);

export default paiementModel;

