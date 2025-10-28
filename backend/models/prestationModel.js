import mongoose from 'mongoose';

const PrestationSchema = new mongoose.Schema({
  // 👤 Participants de la prestation
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true
  },

  prestataire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prestataire',
    required: true
  },

  // 🛠️ Service demandé
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },

  // 📅 Planification
  dateCommande: {
    type: Date,
    default: Date.now,
    required: true
  },

  datePrestation: {
    type: Date,
    required: true
  },

  heureDebut: {
    type: String, // Format "HH:mm"
    required: true
  },

  heureFin: {
    type: String, // Format "HH:mm" (estimée)
    required: false
  },

  dureeEstimee: {
    type: Number, // en minutes
    required: false
  },

  // 📍 Lieu de la prestation
  adresse: {
    type: String,
    required: true
  },

  ville: {
    type: String,
    required: true
  },

  codePostal: {
    type: String,
    required: false
  },

  localisation: {
    latitude: { type: Number },
    longitude: { type: Number }
  },

  // 💰 Tarification
  tarifHoraire: {
    type: Number,
    required: true
  },

  montantTotal: {
    type: Number,
    required: true,
    default: 0  // 💰 Par défaut gratuit
  },

  fraisDeplacements: {
    type: Number,
    default: 0
  },

  // 📋 Statuts
  statut: {
    type: String,
    enum: [
      'EN_ATTENTE',     // Demande soumise
      'ACCEPTEE',       // Acceptée par le prestataire
      'REFUSEE',        // Refusée par le prestataire
      'EN_COURS',       // Prestation en cours
      'TERMINEE',       // Prestation terminée
      'ANNULEE',        // Annulée par l'une des parties
      'LITIGE'          // En cas de problème
    ],
    default: 'EN_ATTENTE',
    required: true
  },

  statutPaiement: {
    type: String,
    enum: [
      'ATTENTE',        // En attente de paiement
      'PAYE',           // Payé
      'REMBOURSE',      // Remboursé
      'ECHEC',          // Échec de paiement
      'GRATUIT'         // 💰 Service gratuit
    ],
    default: 'GRATUIT',  // 💰 Par défaut gratuit
    required: true
  },

  // 💳 Paiement
  moyenPaiement: {
    type: String,
    enum: ['CARTE', 'MOBILE_MONEY', 'ESPECES', 'VIREMENT', 'GRATUIT'],
    required: true
  },

  referencePaiement: {
    type: String,
    required: false
  },

  // 📝 Descriptions et notes
  description: {
    type: String,
    maxlength: 1000,
    required: true
  },

  notesClient: {
    type: String,
    maxlength: 500,
    required: false
  },

  notesPrestataire: {
    type: String,
    maxlength: 500,
    required: false
  },

  // ⭐ Évaluation
  noteClient: {
    type: Number,
    min: 1,
    max: 5,
    required: false
  },

  commentaireClient: {
    type: String,
    maxlength: 500,
    required: false
  },

  notePrestataire: {
    type: Number,
    min: 1,
    max: 5,
    required: false
  },

  commentairePrestataire: {
    type: String,
    maxlength: 500,
    required: false
  },

  // 📸 Photos avant/après
  photosAvant: [{
    type: String // URLs Cloudinary
  }],

  photosApres: [{
    type: String // URLs Cloudinary
  }],

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
    commentaire: {
      type: String,
      required: false
    }
  }],

  // 📞 Contact d'urgence
  telephoneUrgence: {
    type: String,
    required: false
  },

  // 🔄 Prestation récurrente
  estRecurrente: {
    type: Boolean,
    default: false
  },

  frequenceRecurrence: {
    type: String,
    enum: ['HEBDOMADAIRE', 'MENSUELLE', 'TRIMESTRIELLE'],
    required: false
  }

}, {
  timestamps: true
});

// 🔍 Index pour optimiser les requêtes
PrestationSchema.index({ utilisateur: 1, statut: 1 });
PrestationSchema.index({ prestataire: 1, statut: 1 });
PrestationSchema.index({ datePrestation: 1, statut: 1 });
PrestationSchema.index({ ville: 1, statut: 1 });

// 📊 Méthodes statiques pour statistiques
PrestationSchema.statics.getStatsPrestataire = async function(prestataireId) {
  return await this.aggregate([
    { $match: { prestataire: mongoose.Types.ObjectId(prestataireId) } },
    {
      $group: {
        _id: '$statut',
        count: { $sum: 1 },
        totalRevenu: { $sum: '$montantTotal' }
      }
    }
  ]);
};

PrestationSchema.statics.getStatsUtilisateur = async function(utilisateurId) {
  return await this.aggregate([
    { $match: { utilisateur: mongoose.Types.ObjectId(utilisateurId) } },
    {
      $group: {
        _id: '$statut',
        count: { $sum: 1 },
        totalDepense: { $sum: '$montantTotal' }
      }
    }
  ]);
};

// 🔄 Méthode pour changer le statut avec historique
PrestationSchema.methods.changerStatut = async function(nouveauStatut, commentaire = '') {
  this.historiqueStatuts.push({
    statut: this.statut,
    date: new Date(),
    commentaire
  });
  
  this.statut = nouveauStatut;
  return await this.save();
};

const prestationModel = mongoose.model('Prestation', PrestationSchema);

export default prestationModel;
