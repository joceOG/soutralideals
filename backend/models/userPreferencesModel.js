import mongoose from 'mongoose';

const UserPreferencesSchema = new mongoose.Schema({
  // 👤 Utilisateur propriétaire des préférences
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    unique: true
  },

  // 🌍 PRÉFÉRENCES LINGUISTIQUES
  langue: {
    type: String,
    enum: ['fr', 'en', 'es', 'pt', 'ar'],
    default: 'fr',
    required: true
  },

  // 💰 PRÉFÉRENCES MONÉTAIRES
  devise: {
    type: String,
    enum: ['FCFA', 'EUR', 'USD', 'XOF', 'XAF'],
    default: 'FCFA',
    required: true
  },

  // 📍 PRÉFÉRENCES RÉGIONALES
  pays: {
    type: String,
    enum: ['CI', 'FR', 'US', 'SN', 'ML', 'BF', 'NE', 'TG', 'BJ', 'GH', 'NG'],
    default: 'CI',
    required: true
  },

  // 🕐 PRÉFÉRENCES TEMPORELLES
  fuseauHoraire: {
    type: String,
    default: 'Africa/Abidjan',
    required: true
  },

  // 📅 FORMAT DE DATE
  formatDate: {
    type: String,
    enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
    default: 'DD/MM/YYYY',
    required: true
  },

  // 🕐 FORMAT D'HEURE
  formatHeure: {
    type: String,
    enum: ['12h', '24h'],
    default: '24h',
    required: true
  },

  // 💰 FORMAT MONÉTAIRE
  formatMonetaire: {
    type: String,
    enum: ['1,234.56', '1 234,56', '1.234,56'],
    default: '1 234,56',
    required: true
  },

  // 📱 PRÉFÉRENCES D'AFFICHAGE
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'light',
    required: true
  },

  // 🔔 PRÉFÉRENCES DE NOTIFICATION
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    langue: {
      type: String,
      enum: ['fr', 'en', 'es', 'pt', 'ar'],
      default: 'fr'
    }
  },

  // 📍 PRÉFÉRENCES DE LOCALISATION
  localisation: {
    ville: {
      type: String,
      maxlength: 100
    },
    codePostal: {
      type: String,
      maxlength: 10
    },
    coordonnees: {
      latitude: Number,
      longitude: Number
    }
  },

  // 🎯 PRÉFÉRENCES DE RECHERCHE
  recherche: {
    rayon: {
      type: Number,
      default: 10, // en km
      min: 1,
      max: 100
    },
    triParDefaut: {
      type: String,
      enum: ['distance', 'prix', 'note', 'date'],
      default: 'distance'
    },
    afficherPrix: {
      type: Boolean,
      default: true
    }
  },

  // 🔒 PRÉFÉRENCES DE SÉCURITÉ
  securite: {
    authentificationDoubleFacteur: {
      type: Boolean,
      default: false
    },
    notificationsConnexion: {
      type: Boolean,
      default: true
    },
    partageDonnees: {
      type: Boolean,
      default: false
    }
  },

  // 📊 PRÉFÉRENCES D'ANALYTICS
  analytics: {
    partageDonneesUsage: {
      type: Boolean,
      default: true
    },
    cookies: {
      type: Boolean,
      default: true
    }
  },

  // 🎨 PRÉFÉRENCES D'ACCESSIBILITÉ
  accessibilite: {
    taillePolice: {
      type: String,
      enum: ['petite', 'normale', 'grande', 'tres-grande'],
      default: 'normale'
    },
    contraste: {
      type: String,
      enum: ['normal', 'eleve', 'tres-eleve'],
      default: 'normal'
    },
    lecteurEcran: {
      type: Boolean,
      default: false
    }
  },

  // 📱 PRÉFÉRENCES MOBILE
  mobile: {
    vibrations: {
      type: Boolean,
      default: true
    },
    son: {
      type: Boolean,
      default: true
    },
    orientation: {
      type: String,
      enum: ['auto', 'portrait', 'paysage'],
      default: 'auto'
    }
  },

  // 🔄 MÉTADONNÉES
  derniereModification: {
    type: Date,
    default: Date.now
  },

  version: {
    type: String,
    default: '1.0.0'
  }

}, {
  timestamps: true
});

// 🔍 INDEX POUR OPTIMISER LES REQUÊTES
UserPreferencesSchema.index({ utilisateur: 1 });
UserPreferencesSchema.index({ langue: 1 });
UserPreferencesSchema.index({ devise: 1 });
UserPreferencesSchema.index({ pays: 1 });

// 🔄 MÉTHODES VIRTUELLES
UserPreferencesSchema.virtual('estFrancophone').get(function() {
  return ['fr', 'CI', 'SN', 'ML', 'BF', 'NE', 'TG', 'BJ'].includes(this.langue) || 
         ['CI', 'SN', 'ML', 'BF', 'NE', 'TG', 'BJ'].includes(this.pays);
});

UserPreferencesSchema.virtual('estAnglophone').get(function() {
  return this.langue === 'en' || ['US', 'GH', 'NG'].includes(this.pays);
});

UserPreferencesSchema.virtual('deviseLocale').get(function() {
  const deviseParPays = {
    'CI': 'FCFA', 'SN': 'FCFA', 'ML': 'FCFA', 'BF': 'FCFA', 
    'NE': 'FCFA', 'TG': 'FCFA', 'BJ': 'FCFA',
    'FR': 'EUR', 'US': 'USD'
  };
  return deviseParPays[this.pays] || this.devise;
});

// 🔄 MÉTHODES D'INSTANCE
UserPreferencesSchema.methods.mettreAJourLangue = function(nouvelleLangue) {
  this.langue = nouvelleLangue;
  this.notifications.langue = nouvelleLangue;
  this.derniereModification = new Date();
  return this.save();
};

UserPreferencesSchema.methods.mettreAJourDevise = function(nouvelleDevise) {
  this.devise = nouvelleDevise;
  this.derniereModification = new Date();
  return this.save();
};

UserPreferencesSchema.methods.resetPreferences = function() {
  this.langue = 'fr';
  this.devise = 'FCFA';
  this.pays = 'CI';
  this.fuseauHoraire = 'Africa/Abidjan';
  this.formatDate = 'DD/MM/YYYY';
  this.formatHeure = '24h';
  this.formatMonetaire = '1 234,56';
  this.theme = 'light';
  this.derniereModification = new Date();
  return this.save();
};

// 🔄 MÉTHODES STATIQUES
UserPreferencesSchema.statics.getPreferencesByUser = function(utilisateurId) {
  return this.findOne({ utilisateur: utilisateurId });
};

UserPreferencesSchema.statics.getUsersByLangue = function(langue) {
  return this.find({ langue: langue });
};

UserPreferencesSchema.statics.getUsersByDevise = function(devise) {
  return this.find({ devise: devise });
};

UserPreferencesSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        langues: { $addToSet: '$langue' },
        devises: { $addToSet: '$devise' },
        pays: { $addToSet: '$pays' }
      }
    }
  ]);
  return stats[0] || { totalUsers: 0, langues: [], devises: [], pays: [] };
};

const UserPreferences = mongoose.model('UserPreferences', UserPreferencesSchema);

export default UserPreferences;



