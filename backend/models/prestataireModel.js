import mongoose from "mongoose";

// Exemple de sous-schema localisationSchema
const localisationSchema = new mongoose.Schema({
  latitude: { type: Number, required: false },
  longitude: { type: Number, required : false},
}, { _id: false }); // _id: false pour ne pas créer d'ID supplémentaire

const prestataireSchema = new mongoose.Schema({
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  prixprestataire: { type: Number, required: true },
  localisation: { type: String, required: true },
  localisationmaps:{ type: localisationSchema , required : false  } ,// ✅ ajouté
<<<<<<< HEAD
  note: { type: Number, default: 0, min: 0, max: 5 },
=======
  note: { type: String },
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
  verifier: { type: Boolean, default: false },

  // Identité
  cni1: { type: String },
  cni2: { type: String },
  selfie: { type: String },
  numeroCNI: { type: String },

  // Métier
  specialite: [{ type: String }],
  anneeExperience: { type: String },
  description: { type: String },
  rayonIntervention: { type: Number }, // en km
  zoneIntervention: [{ type: String }], // ex: villes/quartiers
  tarifHoraireMin: { type: Number },
  tarifHoraireMax: { type: Number },

  // Diplômes / Certificats
  diplomeCertificat: [{ type : String }],
  attestationAssurance: { type: String },
  numeroAssurance: { type: String },
  numeroRCCM: { type: String },

  // Stats
  nbMission: { type: Number, default: 0 },
<<<<<<< HEAD
  nbAvis: { type: Number, default: 0 },
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
  revenus: { type: Number, default: 0 },
  clients: [{ type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur" }],

  // 🆕 OPTION C - Traçabilité et validation
  source: { 
    type: String, 
    enum: ['web', 'sdealsmobile', 'sdealsidentification', 'dashboard'],
    default: 'web' 
  },
  status: { 
    type: String, 
    enum: ['incomplete', 'pending', 'active', 'rejected', 'suspended'],
    default: 'incomplete'
  },
  
  // 🆕 SYSTÈME DE FINALISATION
  finalizationStatus: {
    // Documents obligatoires
    cniUploaded: { type: Boolean, default: false },
    selfieUploaded: { type: Boolean, default: false },
    locationSet: { type: Boolean, default: false },
    
    // Documents optionnels
    certificatesUploaded: { type: Boolean, default: false },
    insuranceUploaded: { type: Boolean, default: false },
    portfolioUploaded: { type: Boolean, default: false },
    
    // Calcul automatique
    isComplete: { type: Boolean, default: false }
  },
  recenseur: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Utilisateur' 
  },
  dateRecensement: { type: Date },
  validePar: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
  dateValidation: { type: Date },
  motifRejet: { type: String },
}, { timestamps: true });

<<<<<<< HEAD
<<<<<<< HEAD
// 🆕 SYNCHRONISER finalizationStatus depuis les champs réels du document
prestataireSchema.methods.syncFinalizationFromDocuments = function() {
  const fs = this.finalizationStatus;
  fs.cniUploaded = !!(this.cni1 && this.cni2);
  fs.selfieUploaded = !!this.selfie;
  fs.locationSet = !!(
    this.localisationmaps?.latitude != null &&
    this.localisationmaps?.longitude != null
  );
  fs.certificatesUploaded = !!(this.diplomeCertificat?.length);
  fs.insuranceUploaded = !!this.attestationAssurance;
  return this.calculateFinalizationStatus();
};

=======
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
// 🆕 MÉTHODE POUR CALCULER LE STATUT DE FINALISATION
prestataireSchema.methods.calculateFinalizationStatus = function() {
  const status = this.finalizationStatus;
  
  // Vérifier les documents obligatoires
  const requiredDocs = status.cniUploaded && status.selfieUploaded && status.locationSet;
  
  // Mettre à jour le statut
  status.isComplete = requiredDocs;
  
  // Si tous les documents obligatoires sont fournis, passer en "pending"
  if (requiredDocs && this.status === 'incomplete') {
    this.status = 'pending';
  }
  
  return {
    isComplete: status.isComplete,
    requiredDocs: {
      cni: status.cniUploaded,
      selfie: status.selfieUploaded,
      location: status.locationSet
    },
    optionalDocs: {
      certificates: status.certificatesUploaded,
      insurance: status.insuranceUploaded,
      portfolio: status.portfolioUploaded
    }
  };
};

const prestataireModel = mongoose.model("Prestataire", prestataireSchema);
export default prestataireModel;
