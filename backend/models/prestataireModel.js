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
  note: { type: String },
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
  motifRejet: { type: String },
}, { timestamps: true });

const prestataireModel = mongoose.model("Prestataire", prestataireSchema);
export default prestataireModel;
