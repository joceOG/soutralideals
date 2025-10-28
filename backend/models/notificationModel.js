import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  // Utilisateur destinataire
  destinataire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilisateur",
    required: true
  },
  
  // Utilisateur expéditeur (optionnel)
  expediteur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Utilisateur"
  },
  
  // Type de notification
  type: {
    type: String,
    enum: [
      'NOUVELLE_MISSION',      // Nouvelle mission disponible
      'MISSION_ACCEPTEE',      // Mission acceptée par prestataire
      'MISSION_REFUSEE',       // Mission refusée par prestataire
      'MISSION_DEMARREE',      // Mission démarrée
      'MISSION_TERMINEE',      // Mission terminée
      'MESSAGE_RECU',          // Nouveau message
      'EVALUATION_RECUE',      // Nouvelle évaluation
      'SYSTEME'                // Notification système
    ],
    required: true
  },
  
  // Titre de la notification
  titre: {
    type: String,
    required: true
  },
  
  // Contenu de la notification
  contenu: {
    type: String,
    required: true
  },
  
  // Données supplémentaires (JSON)
  donnees: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Référence à la prestation (si applicable)
  prestation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Prestation"
  },
  
  // Statut de la notification
  statut: {
    type: String,
    enum: ['NON_LUE', 'LUE', 'ARCHIVEE'],
    default: 'NON_LUE'
  },
  
  // Priorité
  priorite: {
    type: String,
    enum: ['FAIBLE', 'NORMALE', 'HAUTE', 'URGENTE'],
    default: 'NORMALE'
  },
  
  // Date de lecture
  dateLecture: {
    type: Date
  },
  
  // Date d'expiration (optionnel)
  dateExpiration: {
    type: Date
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
notificationSchema.index({ destinataire: 1, statut: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

// Méthode pour marquer comme lue
notificationSchema.methods.marquerCommeLue = function() {
  this.statut = 'LUE';
  this.dateLecture = new Date();
  return this.save();
};

// Méthode pour archiver
notificationSchema.methods.archiver = function() {
  this.statut = 'ARCHIVEE';
  return this.save();
};

const notificationModel = mongoose.model("Notification", notificationSchema);
export default notificationModel;