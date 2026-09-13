/**
 * Configuration rate-limit Field Recensement V1 (pilote).
 * Fail-closed sur valeurs invalides → limites par défaut sûres (pas de désactivation silencieuse).
 */
const DEFAULTS = Object.freeze({
  windowMs: 15 * 60 * 1000,
  create: 30,
  correction: 60,
  read: 120,
  admin: 120,
  /** Si le store lève : true = laisser passer (dispo) ; false = 503. Pilote = fail-open documenté. */
  failOpenOnStoreError: true,
});

function parsePositiveInt(raw, fallback) {
  if (raw == null || String(raw).trim() === '') return fallback;
  const s = String(raw).trim();
  if (!/^[1-9][0-9]{0,8}$/.test(s)) return fallback;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : fallback;
}

function parseStrictBool(raw, fallback) {
  if (raw == null || String(raw).trim() === '') return fallback;
  const s = String(raw).trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  return fallback;
}

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 */
export function loadFieldRecensementRateLimitConfig(env = process.env) {
  const windowSec = parsePositiveInt(
    env.FIELD_RECENSEMENT_RL_WINDOW_SECONDS,
    Math.floor(DEFAULTS.windowMs / 1000),
  );
  return {
    windowMs: windowSec * 1000,
    create: parsePositiveInt(env.FIELD_RECENSEMENT_RL_CREATE, DEFAULTS.create),
    correction: parsePositiveInt(
      env.FIELD_RECENSEMENT_RL_CORRECTION,
      DEFAULTS.correction,
    ),
    read: parsePositiveInt(env.FIELD_RECENSEMENT_RL_READ, DEFAULTS.read),
    admin: parsePositiveInt(env.FIELD_RECENSEMENT_RL_ADMIN, DEFAULTS.admin),
    failOpenOnStoreError: parseStrictBool(
      env.FIELD_RECENSEMENT_RL_FAIL_OPEN,
      DEFAULTS.failOpenOnStoreError,
    ),
    storeKind: 'memory',
    multiInstanceGuaranteed: false,
  };
}

/** @type {ReturnType<typeof loadFieldRecensementRateLimitConfig> | null} */
let cached = null;

export function getFieldRecensementRateLimitConfig() {
  if (!cached) cached = loadFieldRecensementRateLimitConfig();
  return cached;
}

export function injectFieldRecensementRateLimitConfig(cfg) {
  cached = cfg ? { ...loadFieldRecensementRateLimitConfig({}), ...cfg } : null;
}

export function resetFieldRecensementRateLimitConfig() {
  cached = null;
}

export default {
  loadFieldRecensementRateLimitConfig,
  getFieldRecensementRateLimitConfig,
  injectFieldRecensementRateLimitConfig,
  resetFieldRecensementRateLimitConfig,
};
