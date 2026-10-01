#!/usr/bin/env node
/**
 * Migration catalogue Métiers.
 * Défaut : dry-run (aucune écriture).
 * Usage :
 *   node scripts/migrate-metiers-catalog.js
 *   node scripts/migrate-metiers-catalog.js --apply
 *   node scripts/migrate-metiers-catalog.js --rollback
 *
 * Refuse d’écrire si l’URI ressemble à Atlas/production, sauf
 * SDEALS_ALLOW_CATALOG_MIGRATE=1 explicitement.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import Service from '../models/serviceModel.js';
import {
  mergeJournal,
  rollbackPartial,
  runMetiersCatalogMigration,
} from '../catalog/runMetiersCatalogMigration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const APPLY = process.argv.includes('--apply');
const ROLLBACK = process.argv.includes('--rollback');
const JOURNAL_PATH = path.join(__dirname, '..', 'catalog', 'metiers-catalog-journal.json');

function redactMongoUrl(url) {
  return String(url || '').replace(/\/\/[^@]+@/, '//***:***@');
}

function isLikelyProd(url) {
  const u = String(url || '').toLowerCase();
  return u.includes('mongodb.net') || u.includes('mongodb+srv://');
}

function loadJournal() {
  try {
    const raw = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
    if (raw && (Array.isArray(raw.applied) || Array.isArray(raw.dryRuns))) {
      return {
        version: 2,
        applied: raw.applied || [],
        dryRuns: raw.dryRuns || [],
        runs: raw.runs,
      };
    }
    return { version: 2, applied: [], dryRuns: Array.isArray(raw.runs) ? raw.runs : [], legacyRuns: raw.runs };
  } catch {
    return { version: 2, applied: [], dryRuns: [] };
  }
}

function saveJournal(doc) {
  fs.mkdirSync(path.dirname(JOURNAL_PATH), { recursive: true });
  fs.writeFileSync(JOURNAL_PATH, JSON.stringify(doc, null, 2), 'utf8');
}

async function persistJournal(entry) {
  const current = loadJournal();
  saveJournal(mergeJournal(current, {
    at: new Date().toISOString(),
    uri: redactMongoUrl(process.env.MONGO_URL || process.env.MONGODB_URI),
    ...entry,
  }));
}

async function main() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!mongoUrl) {
    console.error('MONGO_URL manquant');
    process.exit(1);
  }

  const writes = APPLY || ROLLBACK;
  console.log('Environnement:', process.env.NODE_ENV || 'undefined');
  console.log('URI (masquée):', redactMongoUrl(mongoUrl));
  console.log('Mode:', ROLLBACK ? 'ROLLBACK_PARTIEL' : (APPLY ? 'APPLY' : 'DRY-RUN'));

  if (writes && isLikelyProd(mongoUrl) && process.env.SDEALS_ALLOW_CATALOG_MIGRATE !== '1') {
    console.error(
      'Refus d’écriture : URI distante/Atlas. Relancez en dry-run, ou définissez SDEALS_ALLOW_CATALOG_MIGRATE=1 après revue.',
    );
    process.exit(2);
  }

  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 20000 });

  if (ROLLBACK) {
    const journal = loadJournal();
    const last = [...(journal.applied || [])].reverse().find((r) => r.apply);
    if (!last) {
      console.error('Aucun run applied à restaurer.');
      await mongoose.disconnect();
      process.exit(1);
    }
    const result = await rollbackPartial({
      lastRun: last,
      Service,
      Categorie,
      apply: true,
    });
    journal.rollback = journal.rollback || [];
    journal.rollback.push({ at: new Date().toISOString(), ofRunId: last.runId, result });
    saveJournal(journal);
    console.log(JSON.stringify({
      mode: 'rollback_partiel',
      ofRunId: last.runId,
      restored: result.restored.length,
      conflicts: result.conflicts,
      keptCreations: result.keptCreations,
      note: result.note,
    }, null, 2));
    await mongoose.disconnect();
    return;
  }

  const result = await runMetiersCatalogMigration({
    apply: APPLY,
    mongoose,
    Groupe,
    Categorie,
    Service,
    persistJournal: async (partial) => {
      await persistJournal({
        apply: APPLY,
        runId: partial.runId,
        operations: partial.operations,
        createdIds: partial.createdIds,
        failed: partial.failed,
        noops: partial.noops,
        skipped: partial.skipped,
      });
    },
  });

  await persistJournal({
    apply: APPLY,
    runId: result.runId,
    counts: result.counts,
    operations: result.operations,
    createdIds: result.createdIds,
    failed: result.failed,
    noops: result.noops,
    skipped: result.skipped,
    aRevoir: result.aRevoir,
    orphanIds: result.orphanIds,
  });

  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    runId: result.runId,
    counts: result.counts,
    createdIds: result.createdIds,
    failed: result.failed,
    skippedSample: result.skipped.slice(0, 20),
    journal: JOURNAL_PATH,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
