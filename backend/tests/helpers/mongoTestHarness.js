/**
 * R0-08 — Harness MongoDB isolé pour tests (node:test).
 * Jamais de connexion Atlas / distante / MONGO_URL de production.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

/** @type {MongoMemoryServer | null} */
let memoryServer = null;
/** @type {boolean} */
let usingMemoryServer = false;

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

/**
 * Valide une URI avant connexion / nettoyage destructif.
 * Ne se connecte pas — pure validation.
 * @param {string|null|undefined} uri
 * @param {{ nodeEnv?: string, allowMemoryMarker?: boolean }} [opts]
 */
export function assertSafeTestMongoUri(uri, opts = {}) {
  const nodeEnv = opts.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv !== 'test') {
    throw new Error('mongoTestHarness: NODE_ENV doit être "test" pour toute opération Mongo de test.');
  }
  if (uri == null || String(uri).trim() === '') {
    throw new Error('mongoTestHarness: URI vide — aucun fallback vers MONGO_URL / MONGODB_URI de production.');
  }
  const raw = String(uri).trim();
  const lower = raw.toLowerCase();
  if (lower.includes('mongodb.net') || lower.includes('mongodb+srv://')) {
    throw new Error('mongoTestHarness: URI Atlas / mongodb.net refusée.');
  }
  if (opts.allowMemoryMarker && lower.startsWith('memory://')) {
    return { kind: 'memory', dbName: 'sdeals_test_memory' };
  }

  let parsed;
  try {
    // mongodb:// et mongodb+srv:// → URL parser via remplacement schéma
    const normalized = raw.replace(/^mongodb\+srv:/i, 'https:').replace(/^mongodb:/i, 'http:');
    parsed = new URL(normalized);
  } catch {
    throw new Error('mongoTestHarness: URI Mongo invalide.');
  }

  const host = (parsed.hostname || '').toLowerCase();
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`mongoTestHarness: hôte distant refusé (${host || 'inconnu'}).`);
  }

  const dbName = (parsed.pathname || '/').replace(/^\//, '').split('?')[0];
  if (!dbName || dbName === 'admin' || dbName === 'local' || dbName === 'config') {
    throw new Error('mongoTestHarness: nom de base de test manquant ou réservé.');
  }
  if (!dbName.startsWith('sdeals_test_')) {
    throw new Error(
      `mongoTestHarness: la base doit commencer par "sdeals_test_" (reçu: ${dbName}).`,
    );
  }
  // Noms typiques de prod
  const prodish = ['soutralideals', 'soutrali', 'production', 'prod', 'sdeals'];
  if (prodish.includes(dbName.toLowerCase())) {
    throw new Error('mongoTestHarness: nom de base ressemblant à la production refusé.');
  }

  return { kind: 'local', host, dbName };
}

/**
 * Garde-fou avant dropDatabase / deleteMany large.
 * @param {import('mongoose').Connection} [conn]
 */
export function assertDestructiveOpsAllowed(conn = mongoose.connection) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('mongoTestHarness: nettoyage refusé hors NODE_ENV=test.');
  }
  if (process.env.SDEALS_ALLOW_PROD_MONGO === '1') {
    throw new Error('mongoTestHarness: indicateur production détecté — nettoyage refusé.');
  }
  const dbName = conn?.name || conn?.db?.databaseName;
  if (!dbName) {
    throw new Error('mongoTestHarness: aucune base active pour nettoyage.');
  }
  const isMemory = usingMemoryServer || String(dbName).startsWith('sdeals_test_');
  // mongodb-memory-server génère souvent un nom aléatoire ; on l’accepte si usingMemoryServer
  if (!usingMemoryServer && !String(dbName).startsWith('sdeals_test_')) {
    throw new Error(`mongoTestHarness: nettoyage refusé pour base "${dbName}".`);
  }
  if (!isMemory && !String(dbName).startsWith('sdeals_test_')) {
    throw new Error(`mongoTestHarness: nettoyage refusé pour base "${dbName}".`);
  }
  const host = conn?.host;
  if (host && !usingMemoryServer && !LOCAL_HOSTS.has(String(host).toLowerCase())) {
    throw new Error(`mongoTestHarness: hôte non local pour nettoyage (${host}).`);
  }
  return true;
}

/**
 * Démarre MongoMemoryServer + connexion Mongoose.
 * Ne lit jamais process.env.MONGO_URL / MONGODB_URI.
 */
export async function startIsolatedMongo() {
  process.env.NODE_ENV = 'test';

  if (mongoose.connection.readyState === 1) {
    await stopIsolatedMongo();
  }

  const dbName = `sdeals_test_${Date.now()}`;
  memoryServer = await MongoMemoryServer.create();
  usingMemoryServer = true;
  const baseUri = memoryServer.getUri().replace(/\/$/, '');
  const uri = `${baseUri}/${dbName}`;
  assertSafeTestMongoUri(uri, { nodeEnv: 'test' });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });

  return {
    uri: redactUri(uri),
    dbName: mongoose.connection.name,
    connection: mongoose.connection,
  };
}

function redactUri(uri) {
  try {
    const u = new URL(uri.replace(/^mongodb\+srv:/i, 'https:').replace(/^mongodb:/i, 'http:'));
    return `mongodb://${u.hostname}:${u.port || '27017'}/${(u.pathname || '').replace(/^\//, '')}`;
  } catch {
    return 'mongodb://127.0.0.1/(redacted)';
  }
}

/** Supprime toutes les collections de la base isolée courante. */
export async function clearIsolatedMongo() {
  assertDestructiveOpsAllowed(mongoose.connection);
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

/** dropDatabase uniquement sur base isolée validée. */
export async function dropIsolatedMongo() {
  assertDestructiveOpsAllowed(mongoose.connection);
  await mongoose.connection.dropDatabase();
}

export async function stopIsolatedMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
  usingMemoryServer = false;
}

export function getIsolatedConnection() {
  return mongoose.connection;
}

export function isUsingMemoryServer() {
  return usingMemoryServer;
}
