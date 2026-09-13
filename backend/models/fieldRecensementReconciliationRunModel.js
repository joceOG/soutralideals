/**
 * R1-15 — Journal d’exécution reconciler.
 */
import mongoose from 'mongoose';

const fieldRecensementReconciliationRunSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, unique: true, maxlength: 64 },
    mode: { type: String, enum: ['report-only', 'dry-run', 'execute'], required: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date },
    scanned: { type: Number, default: 0 },
    consistent: { type: Number, default: 0 },
    tooRecent: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    recoverable: { type: Number, default: 0 },
    repaired: { type: Number, default: 0 },
    contained: { type: Number, default: 0 },
    manualReview: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    reasonCounts: { type: Map, of: Number, default: {} },
    configSnapshot: {
      enabled: Boolean,
      dryRun: Boolean,
      staleAfterMinutes: Number,
      batchSize: Number,
      leaseMs: Number,
      maxAttempts: Number,
    },
  },
  { timestamps: true, collection: 'field_recensement_reconciliation_runs' },
);

const FieldRecensementReconciliationRun =
  mongoose.models.FieldRecensementReconciliationRun ||
  mongoose.model('FieldRecensementReconciliationRun', fieldRecensementReconciliationRunSchema);

export default FieldRecensementReconciliationRun;
