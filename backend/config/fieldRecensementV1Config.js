/**
 * R1-10 — Configuration centralisée Field Recensement V1.
 * Fail-closed : absente / invalide → V1 désactivée.
 * Ne pas utiliser Boolean(env) — "false" resterait truthy.
 */
const ACCEPTED_TRUE = new Set(['true']);
const ACCEPTED_FALSE = new Set(['false']);

/** @type {null | FieldRecensementV1Config} */
let cached = null;

/**
 * @typedef {{
 *   enabled: boolean,
 *   minBuildAndroid: number | null,
 *   retryAfterSeconds: number,
 *   configError: string | null,
 *   source: 'env' | 'injected',
 * }} FieldRecensementV1Config
 */

/**
 * Parse strict d’un entier positif décimal (pas de parseInt partiel).
 * @param {unknown} raw
 * @returns {{ ok: true, value: number } | { ok: false, reason: string }}
 */
export function parsePositiveBuildNumber(raw) {
  if (raw == null) return { ok: false, reason: 'ABSENT' };
  if (typeof raw !== 'string' && typeof raw !== 'number') {
    return { ok: false, reason: 'TYPE' };
  }
  const s = String(raw).trim();
  if (s === '') return { ok: false, reason: 'EMPTY' };
  if (!/^[1-9][0-9]{0,8}$/.test(s)) {
    return { ok: false, reason: 'FORMAT' };
  }
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1 || !Number.isSafeInteger(n)) {
    return { ok: false, reason: 'RANGE' };
  }
  return { ok: true, value: n };
}

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @returns {FieldRecensementV1Config}
 */
export function loadFieldRecensementV1Config(env = process.env) {
  const retryAfterSeconds = (() => {
    const p = parsePositiveBuildNumber(env.FIELD_RECENSEMENT_RETRY_AFTER_SECONDS);
    return p.ok ? p.value : 300;
  })();

  const flagRaw = env.FIELD_RECENSEMENT_V1;
  if (flagRaw == null || String(flagRaw).trim() === '') {
    return {
      enabled: false,
      minBuildAndroid: null,
      retryAfterSeconds,
      configError: null,
      source: 'env',
    };
  }

  // Strict : uniquement "true" / "false" exact après trim (casse non autorisée).
  const flagNorm = String(flagRaw).trim();
  if (ACCEPTED_FALSE.has(flagNorm)) {
    return {
      enabled: false,
      minBuildAndroid: null,
      retryAfterSeconds,
      configError: null,
      source: 'env',
    };
  }
  if (!ACCEPTED_TRUE.has(flagNorm)) {
    return {
      enabled: false,
      minBuildAndroid: null,
      retryAfterSeconds,
      configError: `FIELD_RECENSEMENT_V1 invalide: ${String(flagRaw).slice(0, 32)}`,
      source: 'env',
    };
  }

  const minParsed = parsePositiveBuildNumber(env.FIELD_RECENSEMENT_MIN_BUILD_ANDROID);
  if (!minParsed.ok) {
    return {
      enabled: false,
      minBuildAndroid: null,
      retryAfterSeconds,
      configError: `FIELD_RECENSEMENT_MIN_BUILD_ANDROID invalide ou absent (${minParsed.reason})`,
      source: 'env',
    };
  }

  return {
    enabled: true,
    minBuildAndroid: minParsed.value,
    retryAfterSeconds,
    configError: null,
    source: 'env',
  };
}

/**
 * Config courante (cache). Réinitialiser via resetFieldRecensementV1Config entre tests.
 * @returns {FieldRecensementV1Config}
 */
export function getFieldRecensementV1Config() {
  if (!cached) {
    cached = loadFieldRecensementV1Config();
  }
  return cached;
}

/** @param {Partial<FieldRecensementV1Config> | null} cfg */
export function injectFieldRecensementV1Config(cfg) {
  if (cfg == null) {
    cached = null;
    return;
  }
  cached = {
    enabled: Boolean(cfg.enabled),
    minBuildAndroid: cfg.minBuildAndroid ?? null,
    retryAfterSeconds: cfg.retryAfterSeconds ?? 300,
    configError: cfg.configError ?? null,
    source: 'injected',
  };
}

export function resetFieldRecensementV1Config() {
  cached = null;
}

export default {
  loadFieldRecensementV1Config,
  getFieldRecensementV1Config,
  injectFieldRecensementV1Config,
  resetFieldRecensementV1Config,
  parsePositiveBuildNumber,
};
