import mongoose from 'mongoose';

const HistorySchema = new mongoose.Schema(
  {
    // 👤 Utilisateur qui a consulté
    utilisateur: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Utilisateur', 
      required: true 
    },
    
    // 🎯 Type d'objet consulté
    objetType: {
      type: String,
      enum: ['PRESTATAIRE', 'VENDEUR', 'FREELANCE', 'ARTICLE', 'SERVICE', 'PRESTATION', 'COMMANDE', 'PAGE', 'CATEGORIE'],
      required: true
    },
    
    // 🆔 ID de l'objet consulté
    objetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false // Peut être null pour les pages générales
    },
    
    // 📝 Informations de l'objet consulté
    titre: { 
      type: String, 
      required: true,
      maxlength: 200
    },
    
    description: {
      type: String,
      maxlength: 500
    },
    
    image: { 
      type: String 
    },
    
    prix: {
      type: Number,
      min: 0
    },
    
    devise: {
      type: String,
      default: 'FCFA'
    },
    
    // 🏷️ Catégorie et tags
    categorie: {
      type: String,
      maxlength: 100
    },
    
    tags: [{
      type: String,
      maxlength: 50
    }],
    
    // 📍 Localisation
    localisation: {
      ville: String,
      pays: {
        type: String,
        default: 'Côte d\'Ivoire'
      }
    },
    
    // ⭐ Note et évaluation
    note: {
      type: Number,
      min: 0,
      max: 5
    },
    
    // 🔄 Statut de la consultation
    statut: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVE', 'SUPPRIME'],
      default: 'ACTIVE'
    },
    
    // 📊 Métriques de consultation
    dureeConsultation: {
      type: Number, // en secondes
      default: 0
    },
    
    nombreVues: {
      type: Number,
      default: 1
    },
    
    // 📱 Informations de session
    sessionId: {
      type: String,
      required: true
    },
    
    userAgent: {
      type: String,
      maxlength: 500
    },
    
    ipAddress: {
      type: String,
      maxlength: 45
    },
    
    // 📍 Informations de localisation
    localisationUtilisateur: {
      latitude: Number,
      longitude: Number,
      ville: String,
      pays: String
    },
    
    // 🔗 URL et références
    url: {
      type: String,
      maxlength: 500
    },
    
    referrer: {
      type: String,
      maxlength: 500
    },
    
    // 📅 Dates importantes
    dateConsultation: {
      type: Date,
      default: Date.now
    },
    
    dateDerniereConsultation: {
      type: Date,
      default: Date.now
    },
    
    // 🏷️ Tags de consultation
    tagsConsultation: [{
      type: String,
      maxlength: 50
    }],
    
    // 📊 Métriques avancées
    interactions: {
      clics: {
        type: Number,
        default: 0
      },
      scrolls: {
        type: Number,
        default: 0
      },
      tempsSurPage: {
        type: Number,
        default: 0
      }
    },
    
    // 🔄 Actions effectuées
    actions: [{
      type: {
        type: String,
        enum: ['VIEW', 'CLICK', 'SCROLL', 'SEARCH', 'FILTER', 'SORT', 'SHARE', 'FAVORITE', 'CONTACT', 'BOOKMARK']
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      details: {
        type: String,
        maxlength: 200
      }
    }],
    
    // 📱 Informations de l'appareil
    deviceInfo: {
      type: {
        type: String,
        enum: ['MOBILE', 'TABLET', 'DESKTOP']
      },
      os: String,
      browser: String,
      version: String
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 🔍 INDEX POUR OPTIMISER LES REQUÊTES
HistorySchema.index({ utilisateur: 1, dateConsultation: -1 });
HistorySchema.index({ utilisateur: 1, objetType: 1 });
HistorySchema.index({ utilisateur: 1, statut: 1 });
HistorySchema.index({ objetType: 1, objetId: 1 });
HistorySchema.index({ categorie: 1 });
HistorySchema.index({ 'localisation.ville': 1 });
HistorySchema.index({ dateConsultation: -1 });
HistorySchema.index({ sessionId: 1 });

// 🚫 EMPÊCHER LES DOUBLONS RÉCENTS (même objet dans les 5 dernières minutes)
HistorySchema.index({ 
  utilisateur: 1, 
  objetType: 1, 
  objetId: 1,
  dateConsultation: 1
}, { 
  unique: false,
  partialFilterExpression: { 
    dateConsultation: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes
  }
});

// 🔄 VIRTUELS
HistorySchema.virtual('estRecent').get(function() {
  const maintenant = new Date();
  const difference = maintenant - this.dateConsultation;
  return difference < 24 * 60 * 60 * 1000; // 24 heures
});

HistorySchema.virtual('estAujourdhui').get(function() {
  const aujourdhui = new Date();
  const consultation = new Date(this.dateConsultation);
  return consultation.toDateString() === aujourdhui.toDateString();
});

HistorySchema.virtual('estCetteSemaine').get(function() {
  const maintenant = new Date();
  const difference = maintenant - this.dateConsultation;
  return difference < 7 * 24 * 60 * 60 * 1000; // 7 jours
});

HistorySchema.virtual('dureeFormatee').get(function() {
  const heures = Math.floor(this.dureeConsultation / 3600);
  const minutes = Math.floor((this.dureeConsultation % 3600) / 60);
  const secondes = this.dureeConsultation % 60;
  
  if (heures > 0) {
    return `${heures}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secondes}s`;
  } else {
    return `${secondes}s`;
  }
});

// 🔄 MIDDLEWARE PRE-SAVE
HistorySchema.pre('save', function(next) {
  if (this.isNew) {
    this.dateConsultation = new Date();
  }
  this.dateDerniereConsultation = new Date();
  next();
});

// 📊 MÉTHODES STATIQUES POUR STATISTIQUES
HistorySchema.statics.getStatsUtilisateur = async function(utilisateurId, periode = 30) {
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - periode);
  
  return await this.aggregate([
    { 
      $match: { 
        utilisateur: mongoose.Types.ObjectId(utilisateurId),
        dateConsultation: { $gte: dateDebut }
      } 
    },
    {
      $group: {
        _id: null,
        totalConsultations: { $sum: 1 },
        consultationsParType: {
          $push: {
            type: '$objetType',
            count: 1
          }
        },
        consultationsParCategorie: {
          $push: {
            categorie: '$categorie',
            count: 1
          }
        },
        tempsTotal: { $sum: '$dureeConsultation' },
        consultationsRecentes: {
          $sum: {
            $cond: [
              { $gte: ['$dateConsultation', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

HistorySchema.statics.getConsultationsRecentes = async function(utilisateurId, limit = 20) {
  return await this.find({ utilisateur: utilisateurId })
    .sort({ dateConsultation: -1 })
    .limit(limit)
    .populate('utilisateur', 'nom prenom photoProfil');
};

HistorySchema.statics.getConsultationsParType = async function(utilisateurId, objetType, limit = 20) {
  return await this.find({ 
    utilisateur: utilisateurId, 
    objetType: objetType 
  })
    .sort({ dateConsultation: -1 })
    .limit(limit)
    .populate('utilisateur', 'nom prenom photoProfil');
};

const History = mongoose.model('History', HistorySchema);
export default History;



