import mongoose from 'mongoose';

const AvisSchema = new mongoose.Schema({
  // 👤 Auteur de l'avis
  auteur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true
  },

  // 🎯 Objet de l'avis (peut être un prestataire, vendeur, freelance, article, service)
  objetType: {
    type: String,
    enum: ['PRESTATAIRE', 'VENDEUR', 'FREELANCE', 'ARTICLE', 'SERVICE', 'PRESTATION', 'COMMANDE'],
    required: true
  },

  objetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  // ⭐ Note et évaluation
  note: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  // 📝 Contenu de l'avis (texte optionnel — seule la note est requise)
  titre: {
    type: String,
    required: false,
    maxlength: 100
  },

  commentaire: {
    type: String,
    required: false,
    maxlength: 1000
  },

  // 🏷️ Catégories d'évaluation
  categories: [{
    nom: {
      type: String,
      enum: ['QUALITE', 'PONCTUALITE', 'COMMUNICATION', 'PROFESSIONNALISME', 'RAPPORT_QUALITE_PRIX', 'SERVICE_CLIENT']
    },
    note: {
      type: Number,
      min: 1,
      max: 5
    }
  }],

  // 📸 Photos/vidéos jointes
  medias: [{
    type: {
      type: String,
      enum: ['IMAGE', 'VIDEO']
    },
    url: String,
    description: String
  }],

  // 🎯 Recommandation
  recommande: {
    type: Boolean,
    default: true
  },

  // 📊 Métriques
  utile: {
    type: Number,
    default: 0
  },

  pasUtile: {
    type: Number,
    default: 0
  },

  // 🔄 Réponse du professionnel
  reponse: {
    contenu: String,
    date: Date,
    auteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur'
    }
  },

  // ✅ Statut de l'avis
  statut: {
    type: String,
    enum: ['EN_ATTENTE', 'PUBLIE', 'MODERE', 'SUPPRIME'],
    default: 'EN_ATTENTE'
  },

  // 🚨 Signalement
  signale: {
    type: Boolean,
    default: false
  },

  motifsSignalement: [{
    type: String,
    enum: ['CONTENU_INAPPROPRIE', 'FAUSSE_INFORMATION', 'SPAM', 'HARCELEMENT', 'AUTRE']
  }],

  // 📍 Localisation (optionnelle)
  localisation: {
    ville: String,
    pays: String
  },

  // 🏷️ Tags
  tags: [String],

  // 📊 Métadonnées
  ipAddress: String,
  userAgent: String,

  // 🔍 Visibilité
  anonyme: {
    type: Boolean,
    default: false
  },

  // 📈 Statistiques
  vues: {
    type: Number,
    default: 0
  },

  partages: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔍 INDEX POUR OPTIMISER LES REQUÊTES
AvisSchema.index({ auteur: 1 });
AvisSchema.index({ objetType: 1, objetId: 1 });
AvisSchema.index({ note: 1 });
AvisSchema.index({ statut: 1 });
AvisSchema.index({ createdAt: -1 });
AvisSchema.index({ utile: -1 });

// 🔍 INDEX COMPOSÉ POUR RECHERCHE
AvisSchema.index({ objetType: 1, objetId: 1, statut: 1 });

// 📊 VIRTUELS
AvisSchema.virtual('scoreUtilite').get(function() {
  const total = this.utile + this.pasUtile;
  return total > 0 ? (this.utile / total) * 100 : 0;
});

AvisSchema.virtual('ageAvis').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// 🔄 MIDDLEWARE PRE-SAVE
AvisSchema.pre('save', async function(next) {
  try {
    if (this.isNew && this.auteur) {
      const Utilisateur = mongoose.model('Utilisateur');
      const user = await Utilisateur.findById(this.auteur).select('telephoneVerified role');
      if (user?.telephoneVerified || user?.role === 'Admin') {
        this.statut = 'PUBLIE';
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

// 📊 MÉTHODES STATIQUES
AvisSchema.statics.getStatsByObjet = function(objetType, objetId) {
  return this.aggregate([
    { $match: { objetType, objetId, statut: 'PUBLIE' } },
    {
      $group: {
        _id: null,
        totalAvis: { $sum: 1 },
        moyenneNote: { $avg: '$note' },
        distributionNotes: {
          $push: {
            $switch: {
              branches: [
                { case: { $eq: ['$note', 1] }, then: 'note1' },
                { case: { $eq: ['$note', 2] }, then: 'note2' },
                { case: { $eq: ['$note', 3] }, then: 'note3' },
                { case: { $eq: ['$note', 4] }, then: 'note4' },
                { case: { $eq: ['$note', 5] }, then: 'note5' }
              ],
              default: 'autre'
            }
          }
        }
      }
    }
  ]);
};

AvisSchema.statics.getAvisRecents = function(limit = 10) {
  return this.find({ statut: 'PUBLIE' })
    .populate('auteur', 'nom prenom photoProfil')
    .sort({ createdAt: -1 })
    .limit(limit);
};

const Avis = mongoose.model('Avis', AvisSchema);

export default Avis;



