import mongoose from 'mongoose';

const FavoriteSchema = new mongoose.Schema(
  {
    // 👤 Utilisateur qui a ajouté le favori
    utilisateur: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Utilisateur', 
      required: true 
    },
    
    // 🎯 Type d'objet favori
    objetType: {
      type: String,
      enum: ['PRESTATAIRE', 'VENDEUR', 'FREELANCE', 'ARTICLE', 'SERVICE', 'PRESTATION', 'COMMANDE'],
      required: true
    },
    
    // 🆔 ID de l'objet favori
    objetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    
    // 📝 Informations de l'objet
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
    
    // 🔄 Statut du favori
    statut: {
      type: String,
      enum: ['ACTIF', 'ARCHIVE', 'SUPPRIME'],
      default: 'ACTIF'
    },
    
    // 📊 Métriques
    vues: {
      type: Number,
      default: 0
    },
    
    // 🏷️ Liste personnalisée (optionnel)
    listePersonnalisee: {
      type: String,
      maxlength: 100
    },
    
    // 📝 Notes personnelles
    notesPersonnelles: {
      type: String,
      maxlength: 1000
    },
    
    // 🔔 Alertes
    alertePrix: {
      type: Boolean,
      default: false
    },
    
    alerteDisponibilite: {
      type: Boolean,
      default: false
    },
    
    // 📅 Dates importantes
    dateAjout: {
      type: Date,
      default: Date.now
    },
    
    dateDerniereConsultation: {
      type: Date,
      default: Date.now
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 🔍 INDEX POUR OPTIMISER LES REQUÊTES
FavoriteSchema.index({ utilisateur: 1, objetType: 1 });
FavoriteSchema.index({ utilisateur: 1, statut: 1 });
FavoriteSchema.index({ utilisateur: 1, listePersonnalisee: 1 });
FavoriteSchema.index({ objetType: 1, objetId: 1 });
FavoriteSchema.index({ categorie: 1 });
FavoriteSchema.index({ 'localisation.ville': 1 });
FavoriteSchema.index({ dateAjout: -1 });

// 🚫 EMPÊCHER LES DOUBLONS
FavoriteSchema.index({ 
  utilisateur: 1, 
  objetType: 1, 
  objetId: 1 
}, { 
  unique: true,
  partialFilterExpression: { statut: { $ne: 'SUPPRIME' } }
});

// 🔄 VIRTUELS
FavoriteSchema.virtual('estRecent').get(function() {
  const maintenant = new Date();
  const difference = maintenant - this.dateAjout;
  return difference < 7 * 24 * 60 * 60 * 1000; // 7 jours
});

FavoriteSchema.virtual('estArchive').get(function() {
  return this.statut === 'ARCHIVE';
});

// 🔄 MIDDLEWARE PRE-SAVE
FavoriteSchema.pre('save', function(next) {
  if (this.isNew) {
    this.dateAjout = new Date();
  }
  this.dateDerniereConsultation = new Date();
  next();
});

const Favorite = mongoose.model('Favorite', FavoriteSchema);
export default Favorite;


