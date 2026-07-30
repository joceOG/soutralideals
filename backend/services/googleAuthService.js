import { OAuth2Client } from 'google-auth-library';

let client = null;

function getClient() {
  if (client) return client;
  client = new OAuth2Client();
  return client;
}

/**
 * Vérifie un idToken Google et retourne le payload.
 * Audiences acceptées : client Web + Android (env).
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('idToken Google manquant');
  }

  const audiences = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ].filter(Boolean);

  if (!audiences.length) {
    throw new Error(
      'GOOGLE_CLIENT_ID (ou GOOGLE_WEB_CLIENT_ID) manquant dans .env',
    );
  }

  const ticket = await getClient().verifyIdToken({
    idToken,
    audience: audiences.length === 1 ? audiences[0] : audiences,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw new Error('Token Google invalide');
  }
  if (payload.email_verified === false) {
    throw new Error('Email Google non vérifié');
  }

  return {
    googleId: payload.sub,
    email: (payload.email || '').toLowerCase().trim(),
    prenom: payload.given_name || '',
    nom: payload.family_name || payload.name || 'Utilisateur',
    photoProfil: payload.picture || '',
  };
}
