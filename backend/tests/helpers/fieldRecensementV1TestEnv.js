/**
 * Helpers R1-10 — active V1 explicitement dans les tests HTTP.
 */
import {
  injectFieldRecensementV1Config,
  resetFieldRecensementV1Config,
} from '../../config/fieldRecensementV1Config.js';

/** Build de test ≥ minimum injecté (aligné payloads create existants). */
export const TEST_FIELD_APP_BUILD = 12;

/**
 * Active V1 pour la suite de tests (pas via Boolean env ambigu).
 * @param {{ minBuild?: number, buildHeader?: number }} [opts]
 */
export function enableFieldRecensementV1ForTests(opts = {}) {
  const minBuild = opts.minBuild ?? 1;
  injectFieldRecensementV1Config({
    enabled: true,
    minBuildAndroid: minBuild,
    retryAfterSeconds: 300,
    configError: null,
  });
  return {
    minBuild,
    buildHeader: String(opts.buildHeader ?? TEST_FIELD_APP_BUILD),
  };
}

export function disableFieldRecensementV1ForTests() {
  injectFieldRecensementV1Config({
    enabled: false,
    minBuildAndroid: null,
    retryAfterSeconds: 300,
    configError: null,
  });
}

export function restoreFieldRecensementV1ConfigFromEnv() {
  resetFieldRecensementV1Config();
}

/**
 * Headers agent terrain (Authorization + X-App-Build).
 */
export function fieldAgentAuthHeaders(token, build = TEST_FIELD_APP_BUILD) {
  const headers = {
    'X-App-Build': String(build),
  };
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export default enableFieldRecensementV1ForTests;
