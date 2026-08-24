#!/usr/bin/env node
/**
 * STAB-07 — Migration téléphone (DRY-RUN par défaut).
 *
 * Usage:
 *   node scripts/migrate-phones-e164.js
 *   node scripts/migrate-phones-e164.js --apply   # écrit uniquement status ok|normalize
 *
 * Ne touche JAMAIS les numéros "ambiguous" / "invalid" / collisions.
 * Les PhoneOtp TTL courts : laisser expirer (pas de migration).
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Utilisateur from '../models/utilisateurModel.js';
import { proposePhoneMigration } from '../utils/phone.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const APPLY = process.argv.includes('--apply');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI manquant');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const users = await Utilisateur.find({
    telephone: { $exists: true, $nin: [null, ''] },
  }).select('_id telephone email');

  const report = {
    ok: [],
    normalize: [],
    ambiguous: [],
    invalid: [],
    collision: [],
  };

  const proposedIndex = new Map(); // e164 → userId

  for (const u of users) {
    const proposal = proposePhoneMigration(u.telephone);
    const row = {
      userId: String(u._id),
      email: u.email || null,
      current: proposal.current,
      proposed: proposal.proposed,
      status: proposal.status,
      country: proposal.country,
      reason: proposal.reason,
    };

    if (proposal.proposed) {
      const other = await Utilisateur.findOne({
        telephone: proposal.proposed,
        _id: { $ne: u._id },
      }).select('_id');
      if (other) {
        row.status = 'collision';
        row.collisionWith = String(other._id);
        report.collision.push(row);
        continue;
      }
      const seen = proposedIndex.get(proposal.proposed);
      if (seen && seen !== String(u._id)) {
        row.status = 'collision';
        row.collisionWith = seen;
        report.collision.push(row);
        continue;
      }
      proposedIndex.set(proposal.proposed, String(u._id));
    }

    if (report[row.status]) report[row.status].push(row);
    else report.invalid.push(row);
  }

  console.log(JSON.stringify({
    mode: APPLY ? 'APPLY' : 'DRY_RUN',
    totals: {
      scanned: users.length,
      ok: report.ok.length,
      normalize: report.normalize.length,
      ambiguous: report.ambiguous.length,
      invalid: report.invalid.length,
      collision: report.collision.length,
    },
    report,
  }, null, 2));

  if (APPLY) {
    let written = 0;
    for (const row of [...report.ok, ...report.normalize]) {
      if (!row.proposed || row.proposed === row.current) continue;
      await Utilisateur.updateOne(
        { _id: row.userId },
        { $set: { telephone: row.proposed } },
      );
      written += 1;
    }
    console.error(`[migrate-phones] écrits: ${written}`);
  } else {
    console.error('[migrate-phones] dry-run — aucune écriture');
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
