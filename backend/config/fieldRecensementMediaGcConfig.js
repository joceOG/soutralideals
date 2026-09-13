/**
 * R1-12 — Configuration GC médias Field Recensement V1.
 * Fail-closed : absent / invalide → aucune suppression ; dry-run par défaut.
 */
const ACCEPTED_TRUE = new Set(['true']);
const ACCEPTED_FALSE = new Set(['false']);

/** Minimums de sécurité (heures) — en dessous → suppression interdite. */
export const MEDIA_GC_MIN_ORPHAN_TTL_HOURS = 24;
export const MEDIA_GC_MIN_QUARANTINE_HOURS = 1;
export const MEDIA_GC_MIN_BATCH = 1;
export const MEDIA_GC_MAX_BATCH = 500;

export const MEDIA_GC_CONFIRM_TOKEN = 'DELETE_MANAGED_FIELD_MEDIA';

/** @type {null | FieldRecensementMediaGcConfig} */
let cached = null;

/**
 * @typedef {{
 *   enabled: boolean,
 *   dryRun: boolean,
 *   orphanTtlHours: number | null,
 *   quarantineHours: number | null,
 *   batchSize: number | null,
 *   allowExecute: boolean,
 *   configError: string | null,
 *   source: 'env' | 'injected',
 * }} FieldRecensementMediaGcConfig
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
 * @returns {FieldRecensementMediaGcConfig}
 */
export function loadFieldRecensementMediaGcConfig(env = process.env) {
  const enabledP = parseStrictBool(env.FIELD_RECENSEMENT_MEDIA_GC_ENABLED, {
    absentDefault: false,
  });
  const dryRunP = parseStrictBool(env.FIELD_RECENSEMENT_MEDIA_GC_DRY_RUN, {
    absentDefault: true,
  });

  if (!enabledP.ok || !dryRunP.ok) {
    return {
      enabled: false,
      dryRun: true,
      orphanTtlHours: null,
      quarantineHours: null,
      batchSize: null,
      allowExecute: false,
      configError: 'BOOL_INVALID',
      source: 'env',
    };
  }

  const ttlP = parsePositiveInt(env.FIELD_RECENSEMENT_MEDIA_GC_ORPHAN_TTL_HOURS, {
    min: MEDIA_GC_MIN_ORPHAN_TTL_HOURS,
    max: 24 * 365,
  });
  const qP = parsePositiveInt(env.FIELD_RECENSEMENT_MEDIA_GC_QUARANTINE_HOURS, {
    min: MEDIA_GC_MIN_QUARANTINE_HOURS,
    max: 24 * 90,
  });
  const batchP = parsePositiveInt(env.FIELD_RECENSEMENT_MEDIA_GC_BATCH_SIZE, {
    min: MEDIA_GC_MIN_BATCH,
    max: MEDIA_GC_MAX_BATCH,
  });

  // Valeurs absentes OK pour dry-run report ; execute exige des TTL valides.
  const orphanTtlHours = ttlP.ok ? ttlP.value : null;
  const quarantineHours = qP.ok ? qP.value : null;
  const batchSize = batchP.ok ? batchP.value : null;

  let configError = null;
  if (env.FIELD_RECENSEMENT_MEDIA_GC_ORPHAN_TTL_HOURS != null &&
      String(env.FIELD_RECENSEMENT_MEDIA_GC_ORPHAN_TTL_HOURS).trim() !== '' &&
      !ttlP.ok) {
    configError = `ORPHAN_TTL_${ttlP.reason}`;
  } else if (
    env.FIELD_RECENSEMENT_MEDIA_GC_QUARANTINE_HOURS != null &&
    String(env.FIELD_RECENSEMENT_MEDIA_GC_QUARANTINE_HOURS).trim() !== '' &&
    !qP.ok
  ) {
    configError = `QUARANTINE_${qP.reason}`;
  } else if (
    env.FIELD_RECENSEMENT_MEDIA_GC_BATCH_SIZE != null &&
    String(env.FIELD_RECENSEMENT_MEDIA_GC_BATCH_SIZE).trim() !== '' &&
    !batchP.ok
  ) {
    configError = `BATCH_${batchP.reason}`;
  }

  const allowExecute =
    enabledP.value === true &&
    dryRunP.value === false &&
    orphanTtlHours != null &&
    quarantineHours != null &&
    batchSize != null &&
    configError == null;

  return {
    enabled: enabledP.value,
    dryRun: dryRunP.value,
    orphanTtlHours,
    quarantineHours,
    batchSize: batchSize ?? 100,
    allowExecute,
    configError,
    source: 'env',
  };
}

export function getFieldRecensementMediaGcConfig() {
  if (!cached) cached = loadFieldRecensementMediaGcConfig();
  return cached;
}

/** @param {Partial<FieldRecensementMediaGcConfig> | null} cfg */
export function injectFieldRecensementMediaGcConfig(cfg) {
  if (cfg == null) {
    cached = null;
    return;
  }
  cached = {
    enabled: cfg.enabled === true,
    dryRun: cfg.dryRun !== false,
    orphanTtlHours: cfg.orphanTtlHours ?? null,
    quarantineHours: cfg.quarantineHours ?? null,
    batchSize: cfg.batchSize ?? 100,
    allowExecute: cfg.allowExecute === true,
    configError: cfg.configError ?? null,
    source: 'injected',
  };
}

export function resetFieldRecensementMediaGcConfig() {
  cached = null;
}

/**
 * Décide si une exécution peut appeler destroy.
 * @param {{ execute?: boolean, confirm?: string, reportOnly?: boolean }} cli
 * @param {FieldRecensementMediaGcConfig} [cfg]
 */
export function resolveMediaGcExecutionMode(cli = {}, cfg = getFieldRecensementMediaGcConfig()) {
  if (cli.reportOnly === true) {
    return { mode: 'report-only', canDestroy: false, reason: 'REPORT_ONLY' };
  }
  if (cfg.configError) {
    return { mode: 'dry-run', canDestroy: false, reason: 'CONFIG_INVALID' };
  }
  if (!cfg.enabled) {
    return { mode: 'dry-run', canDestroy: false, reason: 'DISABLED' };
  }
  if (cfg.dryRun || !cli.execute) {
    return { mode: 'dry-run', canDestroy: false, reason: 'DRY_RUN' };
  }
  if (cli.confirm !== MEDIA_GC_CONFIRM_TOKEN) {
    return { mode: 'dry-run', canDestroy: false, reason: 'CONFIRM_REQUIRED' };
  }
  if (!cfg.allowExecute) {
    return { mode: 'dry-run', canDestroy: false, reason: 'EXECUTE_GATES_INCOMPLETE' };
  }
  return { mode: 'execute', canDestroy: true, reason: null };
}

export default {
  loadFieldRecensementMediaGcConfig,
  getFieldRecensementMediaGcConfig,
  injectFieldRecensementMediaGcConfig,
  resetFieldRecensementMediaGcConfig,
  resolveMediaGcExecutionMode,
  MEDIA_GC_CONFIRM_TOKEN,
};
