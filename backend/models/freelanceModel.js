import mongoose from 'mongoose';

const FreelanceSchema = mongoose.Schema({
    // ✅ Champs de base (compatibles sdealsapp)
    utilisateur: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Utilisateur' },
    name: { type: String, required: true }, // Nom complet pour affichage
    job: { type: String, required: true }, // Titre du métier
    category: { type: String, required: true }, // Catégorie principale
    imagePath: { type: String }, // Photo de profil principale
    
    // ✅ Système de notation et performances (sdealsapp)
    rating: { type: Number, default: 0, min: 0, max: 5 }, // Note moyenne
    completedJobs: { type: Number, default: 0 }, // Projets terminés
    isTopRated: { type: Boolean, default: false }, // Freelance top
    isFeatured: { type: Boolean, default: false }, // Freelance mis en avant
    isNew: { type: Boolean, default: true }, // Nouveau freelance
    responseTime: { type: Number, default: 24 }, // Temps de réponse en heures
    
    // ✅ Compétences et tarification (sdealsapp)
    skills: [{ type: String }], // Compétences techniques
    hourlyRate: { type: Number, required: true, min: 0 }, // Tarif horaire
    description: { type: String }, // Description du freelance
    
    // ✅ Informations professionnelles (étendues)
    experienceLevel: { type: String, enum: ['Débutant', 'Intermédiaire', 'Expert'], default: 'Débutant' },
    availabilityStatus: { type: String, enum: ['Disponible', 'Occupé', 'En pause'], default: 'Disponible' },
    workingHours: { type: String, enum: ['Temps plein', 'Temps partiel', 'Ponctuel'], default: 'Temps partiel' },
    
    // ✅ Localisation et contact
    location: { type: String, required: true },
    phoneNumber: { type: String },
    
    // ✅ Portfolio et vérification
    portfolioItems: [{ 
        title: String,
        description: String,
        imageUrl: String,
        projectUrl: String
    }],
    
    // ✅ Documents de vérification
    verificationDocuments: {
        cni1: { type: String }, // URL Cloudinary
        cni2: { type: String }, // URL Cloudinary  
        selfie: { type: String }, // URL Cloudinary
        isVerified: { type: Boolean, default: false }
    },
    
    // ✅ Statistiques business
    totalEarnings: { type: Number, default: 0 }, // Revenus totaux
    currentProjects: { type: Number, default: 0 }, // Projets en cours
    clientSatisfaction: { type: Number, default: 0, min: 0, max: 100 }, // Satisfaction client %
    
    // ✅ Préférences et paramètres
    preferredCategories: [{ type: String }], // Catégories préférées
    minimumProjectBudget: { type: Number, default: 0 }, // Budget minimum projet
    maxProjectsPerMonth: { type: Number, default: 10 }, // Limite projets/mois
    
    // ✅ Activité et historique
    lastActive: { type: Date, default: Date.now }, // Dernière activité
    joinedDate: { type: Date, default: Date.now }, // Date d'inscription
    profileViews: { type: Number, default: 0 }, // Vues du profil
    
    // ✅ Statut du compte
    accountStatus: { type: String, enum: ['Active', 'Suspended', 'Pending'], default: 'Pending' },
    subscriptionType: { type: String, enum: ['Free', 'Premium', 'Pro'], default: 'Free' },

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
}, { timestamps: true });

const freelanceModel = mongoose.model('Freelance', FreelanceSchema);

export default freelanceModel;
