/**
 * Initialisation Sentry — doit être importé juste après bootstrapEnv.js
 * https://docs.sentry.io/platforms/javascript/guides/node/
 */
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  console.log('✅ Sentry initialisé');
} else {
  console.warn('[Sentry] SENTRY_DSN absent — monitoring désactivé');
}

export default Sentry;
