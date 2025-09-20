const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    targetType: { type: String, enum: ['SERVICE', 'PRESTATAIRE'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', ReportSchema);


