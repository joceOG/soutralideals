/**
 * R1-15 — Job réconciliation publications (pas de scheduler prod).
 */
import { runFieldRecensementReconciliation } from '../services/fieldRecensementReconciliationService.js';

/**
 * @param {{
 *   execute?: boolean,
 *   confirm?: string,
 *   reportOnly?: boolean,
 *   maxDocs?: number,
 * }} opts
 */
export async function runFieldRecensementReconciliationJob(opts = {}) {
  return runFieldRecensementReconciliation({
    cli: {
      execute: opts.execute === true,
      confirm: opts.confirm,
      reportOnly: opts.reportOnly === true,
    },
    maxDocs: opts.maxDocs,
    writeRun: opts.reportOnly !== true,
  });
}

export default runFieldRecensementReconciliationJob;
