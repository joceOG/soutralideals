/**
 * R1-12 — Lock distribué jobs Field Recensement (lease Mongo).
 */
import mongoose from 'mongoose';
import crypto from 'node:crypto';

const jobLockSchema = new mongoose.Schema(
  {
    jobName: { type: String, required: true, unique: true, maxlength: 80 },
    ownerId: { type: String, required: true, maxlength: 80 },
    attemptId: { type: String, required: true, maxlength: 80 },
    acquiredAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'field_recensement_job_locks' },
);

const FieldRecensementJobLock =
  mongoose.models.FieldRecensementJobLock ||
  mongoose.model('FieldRecensementJobLock', jobLockSchema);

export const MEDIA_GC_JOB_NAME = 'field_recensement_media_gc';
export const MEDIA_GC_LEASE_MS = 120_000;

/**
 * @param {{ jobName?: string, ownerId?: string, leaseMs?: number, now?: Date }} opts
 */
export async function acquireFieldRecensementJobLock(opts = {}) {
  const jobName = opts.jobName || MEDIA_GC_JOB_NAME;
  const ownerId = opts.ownerId || crypto.randomUUID();
  const attemptId = crypto.randomUUID();
  const leaseMs = opts.leaseMs ?? MEDIA_GC_LEASE_MS;
  const now = opts.now || new Date();
  const expiresAt = new Date(now.getTime() + leaseMs);

  const existing = await FieldRecensementJobLock.findOne({ jobName }).lean();
  if (existing && existing.expiresAt > now && existing.ownerId !== ownerId) {
    return { acquired: false, processing: true, existing };
  }

  const doc = await FieldRecensementJobLock.findOneAndUpdate(
    {
      jobName,
      $or: [
        { expiresAt: { $lte: now } },
        { ownerId },
        { expiresAt: { $exists: false } },
      ],
    },
    {
      $set: {
        jobName,
        ownerId,
        attemptId,
        acquiredAt: now,
        expiresAt,
      },
    },
    { upsert: true, new: true },
  ).catch(async (err) => {
    // Course upsert unique
    if (err?.code === 11000) {
      const again = await FieldRecensementJobLock.findOne({ jobName }).lean();
      if (again && again.expiresAt > now && again.ownerId !== ownerId) {
        return null;
      }
    }
    throw err;
  });

  if (!doc || doc.attemptId !== attemptId) {
    return { acquired: false, processing: true };
  }
  return { acquired: true, ownerId, attemptId, expiresAt, leaseMs };
}

export async function releaseFieldRecensementJobLock({
  jobName = MEDIA_GC_JOB_NAME,
  attemptId,
} = {}) {
  if (!attemptId) return;
  await FieldRecensementJobLock.deleteOne({ jobName, attemptId }).catch(() => {});
}

export async function isFieldRecensementJobLockValid({
  jobName = MEDIA_GC_JOB_NAME,
  attemptId,
  now = new Date(),
} = {}) {
  const lock = await FieldRecensementJobLock.findOne({ jobName, attemptId }).lean();
  return Boolean(lock && lock.expiresAt > now);
}

export { FieldRecensementJobLock };
export default FieldRecensementJobLock;
