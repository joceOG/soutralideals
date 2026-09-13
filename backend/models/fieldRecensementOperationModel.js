/**
 * R1-07 — Opérations idempotentes FieldRecensement (patch / resubmit).
 * Pas de PII complète, pas de refs Cloudinary, pas de tokens.
 */
import mongoose from 'mongoose';

const ACTION_KINDS = Object.freeze([
  'patch',
  'resubmit',
  'request_correction',
  'reject',
  'approve',
  'publish',
  'suspend',
  'reactivate',
]);

const RESULT_KINDS = Object.freeze([
  'patched',
  'resubmitted',
  'already_applied',
  'conflict',
  'failed',
  'correction_requested',
  'rejected',
  'approved',
  'published',
  'suspended',
  'reactivated',
]);

const fieldRecensementOperationSchema = new mongoose.Schema(
  {
    fieldRecensementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FieldRecensement',
      required: true,
    },
    operationMutationId: { type: String, required: true, trim: true },
    action: { type: String, enum: ACTION_KINDS, required: true },
    operationHash: { type: String, required: true, select: false },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    result: { type: String, enum: RESULT_KINDS, required: true },
    revisionBefore: { type: Number, required: true },
    revisionAfter: { type: Number },
    httpStatus: { type: Number },
    resultCode: { type: String, maxlength: 64 },
    errorCode: { type: String, maxlength: 64 },
    /** Snapshot minimal non sensible pour rejeu idempotent. */
    responseSnapshot: {
      type: new mongoose.Schema(
        {
          id: { type: String },
          revision: { type: Number },
          reviewStatus: { type: String },
          publicationStatus: { type: String },
          clientMutationId: { type: String },
        },
        { _id: false, strict: 'throw' },
      ),
      default: undefined,
    },
    serverReceivedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: true,
    collection: 'field_recensement_operations',
    strict: 'throw',
  },
);

fieldRecensementOperationSchema.index(
  { fieldRecensementId: 1, operationMutationId: 1 },
  { unique: true, name: 'uniq_dossier_operationMutationId' },
);

const FieldRecensementOperation =
  mongoose.models.FieldRecensementOperation ||
  mongoose.model('FieldRecensementOperation', fieldRecensementOperationSchema);

export default FieldRecensementOperation;
export { ACTION_KINDS, RESULT_KINDS };
