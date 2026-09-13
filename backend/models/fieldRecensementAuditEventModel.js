/**
 * R1-01 / R1-08A — Audit long FieldRecensement (décisions admin).
 */
import mongoose from 'mongoose';

const fieldRecensementAuditEventSchema = new mongoose.Schema(
  {
    fieldRecensementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FieldRecensement',
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ['decision', 'attempt', 'amendment', 'kyc_access', 'other'],
      required: true,
    },
    /** Idempotence audit décision (unique si présent). */
    operationMutationId: {
      type: String,
      trim: true,
      default: undefined,
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' },
    at: { type: Date, default: Date.now },
    meta: {
      type: new mongoose.Schema(
        {
          action: { type: String, maxlength: 64 },
          outcome: { type: String, maxlength: 64 },
          errorCode: { type: String, maxlength: 64 },
          note: { type: String, maxlength: 500 },
          reasonCode: { type: String, maxlength: 64 },
          previousStatus: { type: String, maxlength: 32 },
          nextStatus: { type: String, maxlength: 32 },
          revisionBefore: { type: Number },
          revisionAfter: { type: Number },
          fields: { type: [String], default: undefined },
        },
        { _id: false, strict: 'throw' },
      ),
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: 'field_recensement_audit_events',
    strict: 'throw',
  },
);

fieldRecensementAuditEventSchema.index({ fieldRecensementId: 1, at: -1 });
fieldRecensementAuditEventSchema.index(
  { operationMutationId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      operationMutationId: { $type: 'string' },
      kind: 'decision',
    },
    name: 'uniq_audit_decision_operationMutationId',
  },
);

const FieldRecensementAuditEvent =
  mongoose.models.FieldRecensementAuditEvent ||
  mongoose.model('FieldRecensementAuditEvent', fieldRecensementAuditEventSchema);

export default FieldRecensementAuditEvent;
