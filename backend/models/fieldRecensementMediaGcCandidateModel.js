/**
 * R1-12 — Candidats GC médias Field Recensement (quarantaine).
 * Pas de PII / URL signée / secret.
 */
import mongoose from 'mongoose';

const STATUSES = [
  'observed',
  'quarantined',
  'retained',
  'eligible',
  'deleting',
  'deleted',
  'failed',
];

const fieldRecensementMediaGcCandidateSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, trim: true, maxlength: 300 },
    resourceType: { type: String, required: true, default: 'image', maxlength: 32 },
    deliveryType: { type: String, required: true, maxlength: 32 },
    mediaKind: { type: String, maxlength: 64 },
    classification: { type: String, maxlength: 64 },
    assetFingerprint: { type: String, required: true, maxlength: 64 },
    firstSeenOrphanAt: { type: Date, required: true },
    lastCheckedAt: { type: Date, required: true },
    eligibleAfter: { type: Date },
    status: { type: String, enum: STATUSES, required: true, default: 'observed' },
    reasonCode: { type: String, maxlength: 64 },
    attempts: { type: Number, default: 0, min: 0 },
    lastFailureCode: { type: String, maxlength: 64 },
    deletedAt: { type: Date },
    sourceFieldRecensementId: { type: mongoose.Schema.Types.ObjectId },
    purpose: {
      type: String,
      enum: ['orphan_cleanup', 'public_derivative_revocation'],
      default: 'orphan_cleanup',
    },
  },
  { timestamps: true, collection: 'field_recensement_media_gc_candidates' },
);

fieldRecensementMediaGcCandidateSchema.index(
  { resourceType: 1, deliveryType: 1, publicId: 1 },
  { unique: true },
);
fieldRecensementMediaGcCandidateSchema.index({ status: 1, eligibleAfter: 1 });
fieldRecensementMediaGcCandidateSchema.index({ assetFingerprint: 1 });

export const MEDIA_GC_CANDIDATE_STATUSES = STATUSES;

const FieldRecensementMediaGcCandidate =
  mongoose.models.FieldRecensementMediaGcCandidate ||
  mongoose.model('FieldRecensementMediaGcCandidate', fieldRecensementMediaGcCandidateSchema);

export default FieldRecensementMediaGcCandidate;
