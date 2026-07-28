import admin from 'firebase-admin';

let initialized = false;

function initFirebaseAdmin() {
  if (initialized) return admin.apps.length > 0;
  initialized = true;

  try {
    if (admin.apps.length) return true;

    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) {
      const creds = JSON.parse(json);
      admin.initializeApp({
        credential: admin.credential.cert(creds),
      });
      console.log('[FCM] firebase-admin initialisé via FIREBASE_SERVICE_ACCOUNT_JSON');
      return true;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log('[FCM] firebase-admin initialisé via GOOGLE_APPLICATION_CREDENTIALS');
      return true;
    }

    console.warn('[FCM] Non configuré — définissez FIREBASE_SERVICE_ACCOUNT_JSON ou GOOGLE_APPLICATION_CREDENTIALS');
    return false;
  } catch (err) {
    console.error('[FCM] Init firebase-admin échouée:', err.message);
    return false;
  }
}

/**
 * Envoie une notification push FCM à tous les tokens d'un utilisateur.
 * Retourne { sent, failed }. No-op si Firebase non configuré.
 */
export async function sendFcmToUser(user, { title, body, data = {} } = {}) {
  if (!user) return { sent: 0, failed: 0 };
  if (!initFirebaseAdmin()) return { sent: 0, failed: 0 };

  const tokens = (user.fcmTokens || [])
    .map((t) => (typeof t === 'string' ? t : t?.token))
    .filter(Boolean);

  if (!tokens.length) return { sent: 0, failed: 0 };

  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v == null ? '' : String(v)]),
  );

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: { channelId: 'soutrali_default', sound: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    });

    // Nettoyer les tokens invalides
    const invalid = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || '';
        if (
          code.includes('registration-token-not-registered') ||
          code.includes('invalid-registration-token')
        ) {
          invalid.push(tokens[i]);
        }
      }
    });

    if (invalid.length && user.fcmTokens) {
      user.fcmTokens = user.fcmTokens.filter((t) => {
        const tok = typeof t === 'string' ? t : t?.token;
        return !invalid.includes(tok);
      });
      await user.save().catch(() => {});
    }

    return {
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (err) {
    console.error('[FCM] sendEachForMulticast:', err.message);
    return { sent: 0, failed: tokens.length };
  }
}

export function isFcmConfigured() {
  return initFirebaseAdmin();
}
