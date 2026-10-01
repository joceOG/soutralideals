#!/usr/bin/env node
/**
 * Sauvegarde des collections touchées par la migration, sans mongodump.
 *
 * AVERTISSEMENT : ce script exporte en JSON (sans index ni métadonnées BSON).
 * Il N'EST PAS une alternative complète à mongodump.
 * Utilisez-le uniquement si MongoDB Database Tools ne sont pas encore installés.
 *
 * Collections exportées :
 *   - services    (tous les documents, ~200+ entrées)
 *   - categories  (toutes, ~10 entrées)
 *   - groupes     (tous, quelques entrées)
 *
 * Usage :
 *   node catalog/pre-apply-backup.js
 *
 * Sortie :
 *   catalog/backup-YYYY-MM-DDTHH-MM/services.json
 *   catalog/backup-YYYY-MM-DDTHH-MM/categories.json
 *   catalog/backup-YYYY-MM-DDTHH-MM/groupes.json
 *   catalog/backup-YYYY-MM-DDTHH-MM/backup-meta.json
 *
 * Restauration sur une base isolée (MongoMemoryServer ou locale) :
 *   node catalog/pre-apply-backup.js --restore catalog/backup-YYYY-MM-DDTHH-MM
 *
 * Aucune écriture sur Atlas dans les deux modes.
 * Codes de sortie : 0 ok, 1 erreur.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const RESTORE_IDX = process.argv.indexOf('--restore');
const RESTORE_DIR = RESTORE_IDX >= 0 ? process.argv[RESTORE_IDX + 1] : null;

// Collections exportées, dans l'ordre (groupes avant categories avant services
// pour que la restauration respecte les clés étrangères).
const COLLECTIONS = ['groupes', 'categories', 'services'];

function redactMongoUrl(url) {
  return String(url || '').replace(/\/\/[^@]+@/, '//***:***@');
}

function sha256Json(arr) {
  return createHash('sha256').update(JSON.stringify(arr)).digest('hex');
}

function isoTag() {
  return new Date().toISOString().slice(0, 16).replace(':', '-');
}

// ─── Export ───────────────────────────────────────────────────────────────────

async function exportBackup() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!mongoUrl) { console.error('MONGO_URL manquant'); process.exit(1); }

  const tag = isoTag();
  const backupDir = path.join(__dirname, `backup-${tag}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log('URI (masquée) :', redactMongoUrl(mongoUrl));
  console.log('Dossier       :', backupDir);

  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  const meta = { exportedAt: new Date().toISOString(), collections: {} };

  try {
    for (const col of COLLECTIONS) {
      const docs = await db.collection(col).find({}).toArray();
      // Convertir les ObjectId en chaînes pour le JSON
      const serialized = JSON.parse(JSON.stringify(docs));
      const hash = sha256Json(serialized);
      const filePath = path.join(backupDir, `${col}.json`);
      fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2), 'utf8');
      meta.collections[col] = { count: docs.length, sha256: hash };
      console.log(`  ${col}: ${docs.length} documents → ${filePath}`);
    }
  } finally {
    await mongoose.disconnect();
  }

  const metaPath = path.join(backupDir, 'backup-meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  console.log('Méta          :', metaPath);
  console.log('\n[OK] Sauvegarde complète.');
  console.log(
    '[ATTENTION] Export JSON sans index. Préférez mongodump si disponible.\n' +
    '            Voir : https://www.mongodb.com/try/download/database-tools',
  );

  return backupDir;
}

// ─── Restauration sur base isolée ─────────────────────────────────────────────

async function restoreBackup(backupDir) {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!mongoUrl) { console.error('MONGO_URL manquant'); process.exit(1); }

  const metaPath = path.join(backupDir, 'backup-meta.json');
  if (!fs.existsSync(metaPath)) {
    console.error(`Dossier de sauvegarde introuvable ou incomplet : ${backupDir}`);
    process.exit(1);
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

  // Refuser toute restauration vers Atlas production.
  const u = mongoUrl.toLowerCase();
  if (u.includes('mongodb.net') || u.includes('mongodb+srv://')) {
    console.error('[BLOQUÉ] Restauration refusée sur Atlas/production.');
    console.error('Configurez MONGO_URL vers une base locale ou isolée (ex : mongodb://localhost/soutralideals_restore).');
    process.exit(2);
  }

  console.log('URI (masquée) :', redactMongoUrl(mongoUrl));
  console.log('Restauration depuis :', backupDir);

  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;

  try {
    for (const col of COLLECTIONS) {
      const filePath = path.join(backupDir, `${col}.json`);
      if (!fs.existsSync(filePath)) { console.warn(`  Absent : ${filePath}`); continue; }

      const docs = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Vérifier l'intégrité via le hash
      const hash = sha256Json(docs);
      const expectedHash = meta.collections?.[col]?.sha256;
      if (expectedHash && hash !== expectedHash) {
        console.error(`[BLOQUÉ] Corruption détectée dans ${col}.json — hash ne correspond pas.`);
        process.exit(1);
      }

      // Vider la collection cible, puis insérer
      await db.collection(col).deleteMany({});
      if (docs.length > 0) await db.collection(col).insertMany(docs);
      console.log(`  ${col}: ${docs.length} documents restaurés (hash ✓)`);
    }
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n[OK] Restauration terminée sur la base isolée.');
  console.log('[NOTE] Les index ne sont pas restaurés par ce script. Relancez le serveur pour les recréer (autoIndex Mongoose).');
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

async function main() {
  if (RESTORE_DIR) {
    await restoreBackup(path.resolve(RESTORE_DIR));
  } else {
    await exportBackup();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
