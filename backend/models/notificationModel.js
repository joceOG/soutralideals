import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  // 👤 Destinataire de la notification
  destinataire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true
  },

  // 👤 Expéditeur (optionnel, peut être le système)
  expediteur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: false
  },

  // 📝 Contenu de la notification
  titre: {
    type: String,
    required: true,
    maxlength: 100
  },

  message: {
    type: String,
    required: true,
    maxlength: 500
  },

  // 🔖 Type de notification
  type: {
    type: String,
    enum: [
      'COMMANDE',        // Nouvelle commande, statut commande
      'PRESTATION',      // Nouvelle prestation, validation
      'PAIEMENT',        // Paiement reçu, échec paiement
      'VERIFICATION',    // Document vérifié, rejeté
      'MESSAGE',         // Nouveau message
      'SYSTEME',         // Maintenance, mise à jour
      'PROMOTION',       // Offres spéciales
      'RAPPEL'          // Rappels divers
    ],
    required: true
  },

  // 🎯 Sous-type pour plus de précision
  sousType: {
    type: String,
    required: false
  },

  // 🔗 Référence à l'objet concerné
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },

  referenceType: {
    type: String,
    enum: ['Commande', 'Prestation', 'Paiement', 'Message', 'Verification'],
    required: false
  },

  // 📱 Statut de la notification
  statut: {
    type: String,
    enum: ['NON_LUE', 'LUE', 'ARCHIVEE'],
    default: 'NON_LUE'
  },

  // 🚨 Priorité
  priorite: {
    type: String,
    enum: ['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'],
    default: 'NORMALE'
  },

  // 📅 Dates importantes
  dateLue: {
    type: Date,
    required: false
  },

  dateArchivage: {
    type: Date,
    required: false
  },

  // 🔔 Paramètres d'envoi
  envoiEmail: {
    type: Boolean,
    default: false
  },

  envoiPush: {
    type: Boolean,
    default: true
  },

  envoiSMS: {
    type: Boolean,
    default: false
  },

  // 📊 Données supplémentaires (JSON flexible)
  donnees: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // 🌐 URL d'action (optionnelle)
  urlAction: {
    type: String,
    required: false
  },

  // ⏰ Date d'expiration (optionnelle)
  dateExpiration: {
    type: Date,
    required: false
  }

}, {
  timestamps: true
});

// 🔍 Index pour optimiser les requêtes
NotificationSchema.index({ destinataire: 1, statut: 1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ priorite: 1, statut: 1 });

// 🎯 Virtual pour obtenir le statut d'expiration
NotificationSchema.virtual('estExpiree').get(function() {
  if (!this.dateExpiration) return false;
  return new Date() > this.dateExpiration;
});

// 📊 Méthode statique pour obtenir les statistiques
NotificationSchema.statics.getStats = async function(userId) {
  return await this.aggregate([
    { $match: { destinataire: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$statut',
        count: { $sum: 1 }
      }
    }
  ]);
};

// 🔔 Méthode pour marquer comme lue
NotificationSchema.methods.marquerCommeLue = async function() {
  this.statut = 'LUE';
  this.dateLue = new Date();
  return await this.save();
};

// 📁 Méthode pour archiver
NotificationSchema.methods.archiver = async function() {
  this.statut = 'ARCHIVEE';
  this.dateArchivage = new Date();
  return await this.save();
};

const notificationModel = mongoose.model('Notification', NotificationSchema);

export default notificationModel;

