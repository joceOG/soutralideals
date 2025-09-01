import mongoose from "mongoose";

const prestataireSchema = new mongoose.Schema({
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  prixprestataire: { type: Number, required: true },
  localisation: { type: String, required: true },
  note: { type: String },
  cni1: { type: String },   // URL de l'image (Cloudinary)
  cni2: { type: String },
  selfie: { type: String },
  verifier: { type: Boolean, default: false },
}, { timestamps: true });

const prestataireModel = mongoose.model("Prestataire", prestataireSchema);

export default prestataireModel;
