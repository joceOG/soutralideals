import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  // 👥 Participants de la conversation
  expediteur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true
  },

  destinataire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true
  },

  // 📝 Contenu du message
  contenu: {
    type: String,
    required: true,
    maxlength: 2000
  },

  // 📎 Pièces jointes
  pieceJointe: {
    type: String, // URL Cloudinary
    required: false
  },

  typePieceJointe: {
    type: String,
    enum: ['IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO'],
    required: false
  },

  // 🔖 Type de message
  typeMessage: {
    type: String,
    enum: [
      'NORMAL',          // Message normal
      'COMMANDE',        // Relatif à une commande
      'PRESTATION',      // Relatif à une prestation
      'SUPPORT',         // Message de support
      'AUTOMATIQUE'      // Message automatique du système
    ],
    default: 'NORMAL'
  },

  // 🔗 Référence à un objet (commande, prestation, etc.)
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },

  referenceType: {
    type: String,
    enum: ['Commande', 'Prestation', 'Service', 'Article'],
    required: false
  },

  // 📊 Statut du message
  statut: {
    type: String,
    enum: ['ENVOYE', 'DELIVRE', 'LU'],
    default: 'ENVOYE'
  },

  // 📅 Dates importantes
  dateDelivrance: {
    type: Date,
    required: false
  },

  dateLecture: {
    type: Date,
    required: false
  },

  // 🔔 Notifications
  notificationEnvoyee: {
    type: Boolean,
    default: false
  },

  // 💬 Conversation groupée
  conversationId: {
    type: String,
    required: true,
    index: true
  },

  // 🚫 Message supprimé
  supprimePar: [{
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Utilisateur'
    },
    dateSuppression: {
      type: Date,
      default: Date.now
    }
  }],

  estSupprime: {
    type: Boolean,
    default: false
  },

  // 📍 Géolocalisation (optionnelle)
  localisation: {
    latitude: { type: Number },
    longitude: { type: Number }
  }

}, {
  timestamps: true
});

// 🔍 Index pour optimiser les requêtes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ expediteur: 1, destinataire: 1 });
MessageSchema.index({ statut: 1, createdAt: -1 });

// 🎯 Méthode statique pour générer un ID de conversation
MessageSchema.statics.genererConversationId = function(userId1, userId2) {
  // Toujours mettre l'ID le plus petit en premier pour la cohérence
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `conv_${ids[0]}_${ids[1]}`;
};

// 📊 Méthode statique pour obtenir les conversations d'un utilisateur
MessageSchema.statics.getConversations = async function(userId) {
  return await this.aggregate([
    {
      $match: {
        $or: [
          { expediteur: mongoose.Types.ObjectId(userId) },
          { destinataire: mongoose.Types.ObjectId(userId) }
        ],
        estSupprime: false
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$conversationId',
        dernierMessage: { $first: '$$ROOT' },
        nombreNonLus: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$destinataire', mongoose.Types.ObjectId(userId)] },
                  { $ne: ['$statut', 'LU'] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'utilisateurs',
        localField: 'dernierMessage.expediteur',
        foreignField: '_id',
        as: 'expediteurInfo'
      }
    },
    {
      $lookup: {
        from: 'utilisateurs',
        localField: 'dernierMessage.destinataire',
        foreignField: '_id',
        as: 'destinataireInfo'
      }
    }
  ]);
};

// 📖 Méthode pour marquer comme lu
MessageSchema.methods.marquerCommeLu = async function() {
  if (this.statut !== 'LU') {
    this.statut = 'LU';
    this.dateLecture = new Date();
    return await this.save();
  }
  return this;
};

// 🗑️ Méthode pour supprimer pour un utilisateur
MessageSchema.methods.supprimerPourUtilisateur = async function(userId) {
  const dejaSupprime = this.supprimePar.some(
    supp => supp.utilisateur.toString() === userId.toString()
  );
  
  if (!dejaSupprime) {
    this.supprimePar.push({
      utilisateur: userId,
      dateSuppression: new Date()
    });
    
    // Si supprimé par les deux participants, marquer comme supprimé
    if (this.supprimePar.length >= 2) {
      this.estSupprime = true;
    }
    
    return await this.save();
  }
  return this;
};

const messageModel = mongoose.model('Message', MessageSchema);

export default messageModel;

