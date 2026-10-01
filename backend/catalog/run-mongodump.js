#!/usr/bin/env node
/**
 * mongodump des trois collections touchées par la migration catalogue.
 * L'URI est lue depuis .env et ne transite pas par les logs ou le terminal.
 * La sortie de mongodump est filtrée pour masquer toute trace d'identifiant.
 *
 * Usage :
 *   node catalog/run-mongodump.js [--out <chemin_absolu_hors_depot>]
 *
 * Chemin par défaut : %USERPROFILE%\Documents\sdeals-backup-<YYYY-MM-DDTHH-MM>
 *
 * Codes de sortie :
 *   0  toutes les collections sauvegardées
 *   1  erreur ou au moins une collection échouée
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODUMP = 'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe';
const DB_NAME = 'soutralideals';
const COLLECTIONS = ['groupes', 'categories', 'services'];

const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
if (!mongoUrl) { console.error('[ERREUR] MONGO_URL absent du .env'); process.exit(1); }

// Dossier de sortie : hors du dépôt Git par défaut
const outIdx = process.argv.indexOf('--out');
const ts = new Date().toISOString().slice(0, 16).replace('T', 'T').replace(':', '-');
const defaultOut = path.join(
  process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\Public',
  'Documents',
  `sdeals-backup-${ts}`,
);
const outDir = outIdx >= 0 ? path.resolve(process.argv[outIdx + 1]) : defaultOut;

// Refuser d'écrire dans le dépôt Git
const repoRoot = path.resolve(__dirname, '..', '..'); // soutralideals/soutralideals
if (path.resolve(outDir).startsWith(repoRoot + path.sep) || path.resolve(outDir) === repoRoot) {
  console.error(`[BLOQUÉ] "${outDir}" est dans le dépôt Git.`);
  console.error('Utilisez --out vers un chemin hors du dépôt.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

function redact(s) {
  return String(s ?? '').replace(/(mongodb(\+srv)?:\/\/)[^@\s]+@/gi, '$1***:***@');
}

console.log('Outil        :', MONGODUMP.split('\\').pop());
console.log('URI (masquée):', redact(mongoUrl));
console.log('Base         :', DB_NAME);
console.log('Collections  :', COLLECTIONS.join(', '));
console.log('Sortie       :', outDir);

let allOk = true;

for (const col of COLLECTIONS) {
  process.stdout.write(`\n→ ${col} ... `);

  const r = spawnSync(
    MONGODUMP,
    ['--uri', mongoUrl, '--db', DB_NAME, '--collection', col, '--out', outDir],
    { encoding: 'utf8', timeout: 120_000 },
  );

  if (r.error) {
    console.log('ERREUR');
    console.error(`  ${r.error.message}`);
    allOk = false;
    continue;
  }

  // Filtrer la sortie pour masquer l'URI si elle y apparaît
  const stderr = redact(r.stderr || '');
  const lastLine = stderr.trim().split('\n').filter(Boolean).pop() ?? '';

  if (r.status !== 0) {
    console.log('ÉCHEC');
    console.error(`  Code : ${r.status}`);
    if (lastLine) console.error(`  Détail : ${lastLine}`);
    allOk = false;
  } else {
    // Lister les fichiers BSON + métadonnées produits
    const subDir = path.join(outDir, DB_NAME);
    const files = fs.readdirSync(subDir).filter(f => f.startsWith(col));
    const sizes = files.map(f => {
      const sz = fs.statSync(path.join(subDir, f)).size;
      return `${f} (${(sz / 1024).toFixed(1)} Ko)`;
    });
    console.log('OK');
    sizes.forEach(s => console.log(`    ${s}`));
  }
}

console.log('\n──────────────────────────────────────');
if (!allOk) {
  console.error('[ÉCHEC] Au moins une collection n\'a pas été sauvegardée.');
  process.exit(1);
}
console.log('[OK] Sauvegarde BSON complète.');
console.log('Dossier :', outDir);
console.log('[ATTENTION] Fichiers de production — ne pas versionner ni partager sans chiffrement.');
