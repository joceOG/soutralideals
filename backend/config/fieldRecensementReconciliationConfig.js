/**
 * R1-15 — Configuration reconciler publications Field Recensement V1.
 * Fail-closed : absent / invalide → aucune mutation ; dry-run par défaut.
 */
const ACCEPTED_TRUE = new Set(['true']);
const ACCEPTED_FALSE = new Set(['false']);

export const RECONCILER_MIN_STALE_MINUTES = 1;
export const RECONCILER_MIN_BATCH = 1;
export const RECONCILER_MAX_BATCH = 500;
export const RECONCILER_MIN_LEASE_MS = 10_000;
export const RECONCILER_MAX_LEASE_MS = 600_000;
export const RECONCILER_MIN_ATTEMPTS = 1;
export const RECONCILER_MAX_ATTEMPTS_CAP = 50;

export const RECONCILE_CONFIRM_TOKEN = 'RECONCILE_FIELD_RECENSEMENTS';
export const RECONCILIATION_JOB_NAME = 'field_recensement_reconciliation';

/** @type {null | FieldRecensementReconciliationConfig} */
let cached = null;

/**
 * @typedef {{
 *   enabled: boolean,
 *   dryRun: boolean,
 *   staleAfterMinutes: number | null,
 *   batchSize: number | null,
 *   leaseMs: number | null,
 *   maxAttempts: number | null,
 *   allowExecute: boolean,
 *   configError: string | null,
 *   source: 'env' | 'injected',
 * }} FieldRecensementReconciliationConfig
 */

function parseStrictBool(raw, { absentDefault }) {
  if (raw == null || String(raw).trim() === '') return { ok: true, value: absentDefault };
  const s = String(raw).trim();
  if (ACCEPTED_TRUE.has(s)) return { ok: true, value: true };
  if (ACCEPTED_FALSE.has(s)) return { ok: true, value: false };
  return { ok: false, reason: 'INVALID_BOOL' };
}

function parsePositiveInt(raw, { min, max }) {
  if (raw == null || String(raw).trim() === '') return { ok: false, reason: 'ABSENT' };
  const s = String(raw).trim();
  if (!/^[1-9][0-9]{0,8}$/.test(s)) return { ok: false, reason: 'FORMAT' };
  const n = Number(s);
  if (!Number.isInteger(n) || n < min || n > max) return { ok: false, reason: 'RANGE' };
  return { ok: true, value: n };
}

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 */
export function loadFieldRecensementReconciliationConfig(env = process.env) {
  const enabledP = parseStrictBool(env.FIELD_RECENSEMENT_RECONCILER_ENABLED, {
    absentDefault: false,
  });
  const dryRunP = parseStrictBool(env.FIELD_RECENSEMENT_RECONCILER_DRY_RUN, {
    absentDefault: true,
  });

  if (!enabledP.ok || !dryRunP.ok) {
    return {
      enabled: false,
      dryRun: true,
      staleAfterMinutes: null,
      batchSize: null,
      leaseMs: null,
      maxAttempts: null,
      allowExecute: false,
      configError: 'BOOL_INVALID',
      source: 'env',
    };
  }

  const staleP = parsePositiveInt(env.FIELD_RECENSEMENT_RECONCILER_STALE_AFTER_MINUTES, {
    min: RECONCILER_MIN_STALE_MINUTES,
    max: 24 * 60,
  });
  const batchP = parsePositiveInt(env.FIELD_RECENSEMENT_RECONCILER_BATCH_SIZE, {
    min: RECONCILER_MIN_BATCH,
    max: RECONCILER_MAX_BATCH,
  });
  const leaseP = parsePositiveInt(env.FIELD_RECENSEMENT_RECONCILER_LEASE_MS, {
    min: RECONCILER_MIN_LEASE_MS,
    max: RECONCILER_MAX_LEASE_MS,
  });
  const maxP = parsePositiveInt(env.FIELD_RECENSEMENT_RECONCILER_MAX_ATTEMPTS, {
    min: RECONCILER_MIN_ATTEMPTS,
    max: RECONCILER_MAX_ATTEMPTS_CAP,
  });

  let configError = null;
  const check = (raw, parsed, prefix) => {
    if (raw != null && String(raw).trim() !== '' && !parsed.ok) {
      configError = `${prefix}_${parsed.reason}`;
    }
  };
  check(env.FIELD_RECENSEMENT_RECONCILER_STALE_AFTER_MINUTES, staleP, 'STALE');
  check(env.FIELD_RECENSEMENT_RECONCILER_BATCH_SIZE, batchP, 'BATCH');
  check(env.FIELD_RECENSEMENT_RECONCILER_LEASE_MS, leaseP, 'LEASE');
  check(env.FIELD_RECENSEMENT_RECONCILER_MAX_ATTEMPTS, maxP, 'MAX_ATTEMPTS');

  const staleAfterMinutes = staleP.ok ? staleP.value : null;
  const batchSize = batchP.ok ? batchP.value : null;
  const leaseMs = leaseP.ok ? leaseP.value : null;
  const maxAttempts = maxP.ok ? maxP.value : null;

  const allowExecute =
    enabledP.value === true &&
    dryRunP.value === false &&
    staleAfterMinutes != null &&
    batchSize != null &&
    leaseMs != null &&
    maxAttempts != null &&
    configError == null;

  return {
    enabled: enabledP.value,
    dryRun: dryRunP.value,
    staleAfterMinutes,
    batchSize: batchSize ?? 100,
    leaseMs: leaseMs ?? 120_000,
    maxAttempts: maxAttempts ?? 8,
    allowExecute,
    configError,
    source: 'env',
  };
}

export function getFieldRecensementReconciliationConfig() {
  if (!cached) cached = loadFieldRecensementReconciliationConfig();
  return cached;
}

/** @param {Partial<FieldRecensementReconciliationConfig> | null} cfg */
export function injectFieldRecensementReconciliationConfig(cfg) {
  if (cfg == null) {
    cached = null;
    return;
  }
  cached = {
    enabled: cfg.enabled === true,
    dryRun: cfg.dryRun !== false,
    staleAfterMinutes: cfg.staleAfterMinutes ?? null,
    batchSize: cfg.batchSize ?? 100,
    leaseMs: cfg.leaseMs ?? 120_000,
    maxAttempts: cfg.maxAttempts ?? 8,
    allowExecute: cfg.allowExecute === true,
    configError: cfg.configError ?? null,
    source: 'injected',
  };
}

export function resetFieldRecensementReconciliationConfig() {
  cached = null;
}

/**
 * @param {{ execute?: boolean, confirm?: string, reportOnly?: boolean }} cli
 * @param {FieldRecensementReconciliationConfig} [cfg]
 */
export function resolveReconciliationExecutionMode(cli = {}, cfg = getFieldRecensementReconciliationConfig()) {
  if (cli.reportOnly === true) {
    return { mode: 'report-only', canMutate: false, reason: 'REPORT_ONLY' };
  }
  if (cfg.configError) {
    return { mode: 'dry-run', canMutate: false, reason: 'CONFIG_INVALID' };
  }
  if (!cfg.enabled) {
    return { mode: 'dry-run', canMutate: false, reason: 'DISABLED' };
  }
  if (cfg.dryRun || !cli.execute) {
    return { mode: 'dry-run', canMutate: false, reason: 'DRY_RUN' };
  }
  if (cli.confirm !== RECONCILE_CONFIRM_TOKEN) {
    return { mode: 'dry-run', canMutate: false, reason: 'CONFIRM_REQUIRED' };
  }
  if (!cfg.allowExecute) {
    return { mode: 'dry-run', canMutate: false, reason: 'EXECUTE_GATES_INCOMPLETE' };
  }
  return { mode: 'execute', canMutate: true, reason: null };
}

export default {
  loadFieldRecensementReconciliationConfig,
  getFieldRecensementReconciliationConfig,
  injectFieldRecensementReconciliationConfig,
  resetFieldRecensementReconciliationConfig,
  resolveReconciliationExecutionMode,
  RECONCILE_CONFIRM_TOKEN,
  RECONCILIATION_JOB_NAME,
};
