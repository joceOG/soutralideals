/**
 * R1-12 — Journal d’exécution GC (pas de decisionHistory dossier).
 */
import mongoose from 'mongoose';

const fieldRecensementMediaGcRunSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, unique: true, maxlength: 64 },
    mode: { type: String, enum: ['report-only', 'dry-run', 'execute'], required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    scanned: { type: Number, default: 0 },
    managed: { type: Number, default: 0 },
    protected: { type: Number, default: 0 },
    unknown: { type: Number, default: 0 },
    observed: { type: Number, default: 0 },
    quarantined: { type: Number, default: 0 },
    eligible: { type: Number, default: 0 },
    wouldDelete: { type: Number, default: 0 },
    deleted: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    reasonCounts: { type: Map, of: Number, default: {} },
    configSnapshot: {
      enabled: Boolean,
      dryRun: Boolean,
      orphanTtlHours: Number,
      quarantineHours: Number,
      batchSize: Number,
    },
  },
  { timestamps: true, collection: 'field_recensement_media_gc_runs' },
);

const FieldRecensementMediaGcRun =
  mongoose.models.FieldRecensementMediaGcRun ||
  mongoose.model('FieldRecensementMediaGcRun', fieldRecensementMediaGcRunSchema);

export default FieldRecensementMediaGcRun;
