import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema(
  {
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'utilisateur', required: true },
    targetType: { type: String, enum: ['SERVICE', 'PRESTATAIRE', 'UTILISATEUR', 'ARTICLE', 'MESSAGE'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['en_attente', 'en_cours', 'résolu', 'rejeté'], default: 'en_attente' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    evidence: [{ type: String }],
  },
  { timestamps: true }
);

const Report = mongoose.model('Report', ReportSchema);
export default Report;


