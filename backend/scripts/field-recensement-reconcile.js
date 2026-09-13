#!/usr/bin/env node
/**
 * R1-15 — CLI réconciliation publications Field Recensement V1.
 *
 * Dry-run (défaut) :
 *   node scripts/field-recensement-reconcile.js --dry-run
 *
 * Report-only :
 *   node scripts/field-recensement-reconcile.js --report-only
 *
 * Execute (DANGER — environnement contrôlé uniquement) :
 *   FIELD_RECENSEMENT_RECONCILER_ENABLED=true \
 *   FIELD_RECENSEMENT_RECONCILER_DRY_RUN=false \
 *   FIELD_RECENSEMENT_RECONCILER_STALE_AFTER_MINUTES=15 \
 *   FIELD_RECENSEMENT_RECONCILER_BATCH_SIZE=100 \
 *   FIELD_RECENSEMENT_RECONCILER_LEASE_MS=120000 \
 *   FIELD_RECENSEMENT_RECONCILER_MAX_ATTEMPTS=8 \
 *   node scripts/field-recensement-reconcile.js \
 *     --execute --confirm=RECONCILE_FIELD_RECENSEMENTS
 */
import mongoose from 'mongoose';
import { RECONCILE_CONFIRM_TOKEN } from '../config/fieldRecensementReconciliationConfig.js';
import { runFieldRecensementReconciliationJob } from '../jobs/fieldRecensementReconciliationJob.js';

function parseArgs(argv) {
  const out = {
    execute: false,
    reportOnly: false,
    confirm: null,
    json: false,
  };
  for (const a of argv) {
    if (a === '--dry-run') out.execute = false;
    else if (a === '--execute') out.execute = true;
    else if (a === '--report-only') out.reportOnly = true;
    else if (a === '--json') out.json = true;
    else if (a.startsWith('--confirm=')) out.confirm = a.slice('--confirm='.length);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.execute && args.confirm !== RECONCILE_CONFIRM_TOKEN) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'CONFIRM_REQUIRED',
        hint: `--confirm=${RECONCILE_CONFIRM_TOKEN}`,
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
    const report = await runFieldRecensementReconciliationJob({
      execute: args.execute,
      confirm: args.confirm,
      reportOnly: args.reportOnly,
    });
    const safe = {
      ok: true,
      runId: report.runId,
      mode: report.mode,
      scanned: report.scanned,
      consistent: report.consistent,
      tooRecent: report.tooRecent,
      activeOperation: report.activeOperation,
      unsafeVisible: report.unsafeVisible,
      recoverablePublish: report.recoverablePublish,
      recoverableSuspend: report.recoverableSuspend,
      recoverableReactivate: report.recoverableReactivate,
      recoverableAudit: report.recoverableAudit,
      manualReview: report.manualReview,
      wouldContain: report.wouldContain,
      wouldResume: report.wouldResume,
      wouldRepair: report.wouldRepair,
      repaired: report.repaired,
      contained: report.contained,
      failed: report.failed,
      skipped: report.skipped,
      errors: report.errors,
      cloudinaryMutations: report.cloudinaryMutations,
      cacheInvalidations: report.cacheInvalidations,
      lockHeld: report.lockHeld || false,
      reasonCounts: report.reasonCounts,
    };
    console.log(JSON.stringify(safe, null, args.json ? 0 : 2));
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main().catch(() => {
  console.error(JSON.stringify({ ok: false, error: 'RUN_FAILED' }));
  process.exitCode = 1;
});
