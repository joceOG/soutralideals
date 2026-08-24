/**
 * STAB-12F — Dry-run READ-ONLY audit index + emails utilisateurs.
 * Usage: node scripts/email-index-dryrun.js
 * Aucune écriture.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  findLegacyEmailIndex,
  EMAIL_UNIQUE_INDEX_NAME,
  normalizeEmail,
} from '../utils/emailIdentity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  if (!process.env.MONGO_URL) {
    console.error('MONGO_URL absent');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 20000 });
  const col = mongoose.connection.collection('utilisateurs');
  const indexes = await col.indexes();

  const emailNull = await col.countDocuments({ email: null });
  const emailEmpty = await col.countDocuments({ email: '' });
  const emailMissing = await col.countDocuments({ email: { $exists: false } });
  const whitespaceOnly = await col.countDocuments({
    email: { $type: 'string', $regex: /^\s+$/ },
  });

  const realEmailDupes = await col
    .aggregate([
      {
        $match: {
          email: { $exists: true, $type: 'string', $ne: '' },
        },
      },
      { $group: { _id: '$email', n: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { n: { $gt: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 20 },
    ])
    .toArray();

  const normalizedDupes = await col
    .aggregate([
      {
        $match: {
          email: { $exists: true, $type: 'string', $ne: '' },
        },
      },
      {
        $project: {
          norm: {
            $trim: { input: { $toLower: '$email' } },
          },
        },
      },
      { $match: { norm: { $ne: '' } } },
      { $group: { _id: '$norm', n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 20 },
    ])
    .toArray();

  const legacyEmail = findLegacyEmailIndex(indexes);
  const targetEmail = indexes.find((i) => i.name === EMAIL_UNIQUE_INDEX_NAME);
  const phoneVerified = indexes.find((i) => i.name === 'telephone_verified_unique');

  console.log(
    JSON.stringify(
      {
        dryRun: true,
        indexes: {
          all: indexes.map((i) => ({
            name: i.name,
            key: i.key,
            unique: i.unique ?? false,
            partialFilterExpression: i.partialFilterExpression ?? null,
          })),
          legacyEmail: legacyEmail
            ? { name: legacyEmail.name, key: legacyEmail.key }
            : null,
          targetEmail: targetEmail
            ? { name: targetEmail.name, partial: targetEmail.partialFilterExpression }
            : null,
          telephone_verified_unique: phoneVerified ? phoneVerified.name : null,
        },
        emails: {
          null: emailNull,
          emptyString: emailEmpty,
          missingField: emailMissing,
          whitespaceOnly,
          realDuplicateGroups: realEmailDupes.length,
          realDuplicatesSample: realEmailDupes,
          normalizedDuplicateGroups: normalizedDupes.length,
          normalizedDuplicatesSample: normalizedDupes,
        },
        recommendedOperation: legacyEmail
          ? {
              step1: `db.utilisateurs.dropIndex("${legacyEmail.name}")`,
              step2: 'Redémarrer backend (syncIndexes crée email_unique_nonempty)',
            }
          : targetEmail
            ? 'Index cible déjà présent — aucun drop requis'
            : 'syncIndexes() créera email_unique_nonempty si legacy absent',
        normalizeEmailSamples: {
          '  Alice@Example.COM  ': normalizeEmail('  Alice@Example.COM  '),
          null: normalizeEmail(null),
          '': normalizeEmail(''),
          '   ': normalizeEmail('   '),
        },
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(JSON.stringify({ dryRun: false, error: e.message }));
  process.exit(1);
});
