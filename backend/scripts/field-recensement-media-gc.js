#!/usr/bin/env node
/**
 * R1-12 — CLI GC médias Field Recensement V1.
 *
 * Dry-run (défaut) :
 *   node scripts/field-recensement-media-gc.js --dry-run
 *
 * Report-only (aucune écriture candidat) :
 *   node scripts/field-recensement-media-gc.js --report-only
 *
 * Execute (DANGER — exige env + flags) :
 *   FIELD_RECENSEMENT_MEDIA_GC_ENABLED=true \
 *   FIELD_RECENSEMENT_MEDIA_GC_DRY_RUN=false \
 *   FIELD_RECENSEMENT_MEDIA_GC_ORPHAN_TTL_HOURS=72 \
 *   FIELD_RECENSEMENT_MEDIA_GC_QUARANTINE_HOURS=24 \
 *   FIELD_RECENSEMENT_MEDIA_GC_BATCH_SIZE=100 \
 *   node scripts/field-recensement-media-gc.js --execute --confirm=DELETE_MANAGED_FIELD_MEDIA
 *
 * Ne jamais lancer --execute contre un compte Cloudinary de production sans revue.
 */
import mongoose from 'mongoose';
import { MEDIA_GC_CONFIRM_TOKEN } from '../config/fieldRecensementMediaGcConfig.js';
import { runFieldRecensementMediaGcJob } from '../jobs/fieldRecensementMediaGcJob.js';

function parseArgs(argv) {
  const out = {
    dryRun: true,
    execute: false,
    reportOnly: false,
    confirm: null,
    json: false,
  };
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--execute') {
      out.execute = true;
      out.dryRun = false;
    } else if (a === '--report-only') out.reportOnly = true;
    else if (a === '--json') out.json = true;
    else if (a.startsWith('--confirm=')) out.confirm = a.slice('--confirm='.length);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.execute && args.confirm !== MEDIA_GC_CONFIRM_TOKEN) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'CONFIRM_REQUIRED',
        hint: `--confirm=${MEDIA_GC_CONFIRM_TOKEN}`,
      }),
    );
    process.exitCode = 2;
    return;
  }

  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!mongoUrl) {
    console.error(JSON.stringify({ ok: false, error: 'MONGO_URL_REQUIRED' }));
    process.exitCode = 2;
    return;
  }

  await mongoose.connect(mongoUrl);
  try {
    const report = await runFieldRecensementMediaGcJob({
      execute: args.execute,
      confirm: args.confirm,
      reportOnly: args.reportOnly,
    });
    const safe = {
      ok: true,
      runId: report.runId,
      mode: report.mode,
      scanned: report.scanned,
      managed: report.managed,
      protected: report.protected,
      unknown: report.unknown,
      observed: report.observed,
      quarantined: report.quarantined,
      eligible: report.eligible,
      wouldDelete: report.wouldDelete,
      deleted: report.deleted,
      failed: report.failed,
      skipped: report.skipped,
      errors: report.errors,
      destroyCalls: report.destroyCalls,
      lockHeld: report.lockHeld || false,
      reasonCounts: report.reasonCounts,
    };
    console.log(JSON.stringify(safe, null, args.json ? 0 : 2));
    if (report.mode === 'execute' && report.deleted > 0) {
      console.error('[warn] suppressions effectuées — vérifier audit FieldRecensementMediaGcRun');
    }
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: 'RUN_FAILED', code: err.code || null }));
  process.exitCode = 1;
});
