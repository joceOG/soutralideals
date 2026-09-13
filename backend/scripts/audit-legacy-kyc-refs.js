/**
 * R0-07 — Inventaire dry-run des références KYC legacy.
 *
 * Comportement STRICT par défaut :
 *   DRY-RUN · LECTURE SEULE · AUCUN UPLOAD · AUCUNE SUPPRESSION · AUCUNE MODIFICATION MONGODB
 *
 * Aucun mode --apply dans cette phase.
 *
 * Usage (hors production) :
 *   AUDIT_KYC_CONFIRM=I_UNDERSTAND_READONLY MONGO_URL=... node scripts/audit-legacy-kyc-refs.js
 *
 * Ne jamais lancer contre la production sans autorisation séparée.
 */
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  classifyKycStoredValue,
  KYC_FIELD_NAMES,
  VERIFICATION_DOC_KEYS,
} from '../utils/kycAccess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CONFIRM_TOKEN = 'I_UNDERSTAND_READONLY';

/** @typedef {'authenticated_ref'|'legacy_http_url'|'missing'|'malformed'} KycClass */

export const INVENTORY_FIELDS = Object.freeze({
  Prestataire: KYC_FIELD_NAMES.map((f) => ({ path: f, label: `Prestataire.${f}` })),
  Freelance: VERIFICATION_DOC_KEYS.filter((k) => ['cni1', 'cni2', 'selfie'].includes(k)).map(
    (f) => ({ path: `verificationDocuments.${f}`, label: `Freelance.verificationDocuments.${f}` }),
  ),
  Vendeur: VERIFICATION_DOC_KEYS.map((f) => ({
    path: `verificationDocuments.${f}`,
    label: `Vendeur.verificationDocuments.${f}`,
  })),
});

export function emptyCounts() {
  return {
    authenticated_ref: 0,
    legacy_http_url: 0,
    missing: 0,
    malformed: 0,
  };
}

export function getNested(obj, dottedPath) {
  return String(dottedPath)
    .split('.')
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/** Agrège des documents en mémoire (tests / fixtures). */
export function inventoryDocuments(docs, fields) {
  /** @type {Record<string, ReturnType<typeof emptyCounts>>} */
  const report = {};
  for (const { path: fieldPath, label } of fields) {
    report[label] = emptyCounts();
  }
  for (const doc of docs) {
    for (const { path: fieldPath, label } of fields) {
      const cls = classifyKycStoredValue(getNested(doc, fieldPath));
      report[label][cls] += 1;
    }
  }
  return report;
}

export function hashId(id) {
  return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 10);
}

export function redactMongoTarget(mongoUrl) {
  if (!mongoUrl || typeof mongoUrl !== 'string') return '(absent)';
  try {
    const u = new URL(mongoUrl.replace(/^mongodb\+srv/, 'https').replace(/^mongodb/, 'http'));
    const db = (u.pathname || '/').replace(/^\//, '') || '(default)';
    return `${u.protocol.replace('http', 'mongodb')}://${u.hostname}/${db}`;
  } catch {
    return '(url-invalide-masquee)';
  }
}

function refuseApplyArgs(argv) {
  const banned = ['--apply', '--write', '--migrate', '--delete', '--fix'];
  return argv.some((a) => banned.includes(String(a).toLowerCase()));
}

export function assertDryRunStartup({ env = process.env, argv = process.argv } = {}) {
  if (refuseApplyArgs(argv)) {
    throw new Error('Mode écriture interdit dans cette phase (aucun --apply). Dry-run uniquement.');
  }
  if (env.AUDIT_KYC_CONFIRM !== CONFIRM_TOKEN) {
    throw new Error(
      `Refus démarrage : définir AUDIT_KYC_CONFIRM=${CONFIRM_TOKEN} (lecture seule explicite).`,
    );
  }
  if (!env.MONGO_URL) {
    throw new Error('MONGO_URL absent — refus démarrage.');
  }
  return {
    dryRun: true,
    target: redactMongoTarget(env.MONGO_URL),
  };
}

function printReport(report) {
  console.log('=== AUDIT KYC LEGACY (DRY-RUN) ===');
  for (const [label, counts] of Object.entries(report)) {
    console.log(label);
    console.log(`- authenticated_ref: ${counts.authenticated_ref}`);
    console.log(`- legacy_http_url: ${counts.legacy_http_url}`);
    console.log(`- missing: ${counts.missing}`);
    console.log(`- malformed: ${counts.malformed}`);
  }
}

async function scanCollection(model, fields, batchSize = 200) {
  const report = inventoryDocuments([], fields);
  const cursor = model.find({}).select(fields.map((f) => f.path).join(' ')).lean().cursor();
  let batch = [];
  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length >= batchSize) {
      const partial = inventoryDocuments(batch, fields);
      for (const label of Object.keys(report)) {
        for (const k of Object.keys(report[label])) {
          report[label][k] += partial[label][k];
        }
      }
      batch = [];
    }
  }
  if (batch.length) {
    const partial = inventoryDocuments(batch, fields);
    for (const label of Object.keys(report)) {
      for (const k of Object.keys(report[label])) {
        report[label][k] += partial[label][k];
      }
    }
  }
  return report;
}

async function main() {
  let startup;
  try {
    startup = assertDryRunStartup();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  console.log(`Mode: DRY-RUN (lecture seule)`);
  console.log(`Cible Mongo (masquée): ${startup.target}`);

  try {
    await mongoose.connect(process.env.MONGO_URL, { serverSelectionTimeoutMS: 15000 });

    const prestataireModel = (await import('../models/prestataireModel.js')).default;
    const freelanceModel = (await import('../models/freelanceModel.js')).default;
    const vendeurModel = (await import('../models/vendeurModel.js')).default;

    const report = {
      ...(await scanCollection(prestataireModel, INVENTORY_FIELDS.Prestataire)),
      ...(await scanCollection(freelanceModel, INVENTORY_FIELDS.Freelance)),
      ...(await scanCollection(vendeurModel, INVENTORY_FIELDS.Vendeur)),
    };

    printReport(report);
    console.log('Fin audit — aucune écriture effectuée.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Échec technique audit (détail non sensible):', err?.name || 'Error');
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main();
}
