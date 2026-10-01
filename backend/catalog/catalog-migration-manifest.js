#!/usr/bin/env node
/**
 * Manifeste déterministe de la migration catalogue Métiers.
 *
 * Usage :
 *   node catalog/catalog-migration-manifest.js              # génère + sauvegarde le manifeste
 *   node catalog/catalog-migration-manifest.js --check      # vérifie les préconditions sur Atlas
 *
 * Dans les deux modes, aucune écriture n'est effectuée sur la base de données.
 *
 * Codes de sortie :
 *   0   tout est correct (ou manifeste généré sans anomalie)
 *   1   dérive détectée (--check) ou erreur d'exécution
 */
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import Service from '../models/serviceModel.js';
import { runMetiersCatalogMigration } from './runMetiersCatalogMigration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CHECK = process.argv.includes('--check');
const MANIFEST_PATH = path.join(__dirname, 'metiers-catalog-manifest.json');

// Fichiers qui déterminent intégralement le comportement de migration.
const BEHAVIOR_FILES = [
  'catalog/metiersCatalogPlan.js',
  'catalog/runMetiersCatalogMigration.js',
  'utils/catalogText.js',
];

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function sha256File(relPath) {
  const abs = path.join(__dirname, '..', relPath);
  const buf = fs.readFileSync(abs);
  return createHash('sha256').update(buf).digest('hex');
}

function sha256Json(obj) {
  return createHash('sha256')
    .update(JSON.stringify(obj))
    .digest('hex');
}

function redactMongoUrl(url) {
  return String(url || '').replace(/\/\/[^@]+@/, '//***:***@');
}

// ─── Normalisation des opérations → entrées de manifeste ──────────────────────

function opToManifestEntry(op) {
  const entry = { type: op.type };

  // Clé stable selon le type : jamais dépendante d'un ID généré ou d'un horodatage.
  if (op.type === 'add') {
    entry.stableKey = `catalogKey:${op.catalogKey}`;
    entry.catalogKey = op.catalogKey;
    entry.title = op.title;
    if (op.dependsOnPlannedCategory) {
      entry.dependsOn = { type: 'category-add', nomcategorie: op.dependsOnPlannedCategory };
    } else {
      entry.dependsOn = null;
    }
    // after sans l'ID de catégorie symbolique : uniquement les données stables
    entry.after = {
      nomservice: op.after?.nomservice,
      aliases: op.after?.aliases ?? [],
      needs: op.after?.needs ?? [],
      catalogKey: op.after?.catalogKey,
    };
  } else if (op.type === 'category-add') {
    entry.stableKey = `nomcategorie:${op.after?.nomcategorie}`;
    entry.after = { nomcategorie: op.after?.nomcategorie };
    entry.dependsOn = null;
  } else if (op.type === 'category-trim') {
    entry.stableKey = `id:${op.id}`;
    entry.id = op.id;
    // before/after pour la vérification de précondition
    entry.before = op.before ?? null;
    entry.after = op.after ?? null;
    entry.dependsOn = null;
  } else {
    // rename, vocab, shortcut : id = ObjectId stable du document existant
    entry.stableKey = `id:${op.id}`;
    entry.id = op.id;
    entry.before = op.before ?? null;
    entry.after = op.after ?? null;
    entry.dependsOn = null;
  }

  return entry;
}

// ─── Génération du manifeste ───────────────────────────────────────────────────

async function generateManifest() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!mongoUrl) {
    console.error('MONGO_URL manquant');
    process.exit(1);
  }

  console.log('URI (masquée) :', redactMongoUrl(mongoUrl));
  console.log('Mode          : DRY-RUN + génération manifeste');

  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 20000 });

  let result;
  try {
    result = await runMetiersCatalogMigration({
      apply: false,
      mongoose,
      Groupe,
      Categorie,
      Service,
    });
  } finally {
    await mongoose.disconnect();
  }

  // Empreintes des fichiers de comportement
  const fingerprints = {};
  for (const rel of BEHAVIOR_FILES) {
    fingerprints[rel] = sha256File(rel);
  }

  // Entrées de manifeste triées de façon déterministe
  const entries = result.operations
    .map(opToManifestEntry)
    .sort((a, b) => {
      const order = ['category-add', 'category-trim', 'rename', 'vocab', 'shortcut', 'add'];
      const ta = order.indexOf(a.type);
      const tb = order.indexOf(b.type);
      if (ta !== tb) return ta - tb;
      return a.stableKey.localeCompare(b.stableKey);
    });

  // Résumé par type
  const byType = {};
  for (const e of entries) byType[e.type] = (byType[e.type] ?? 0) + 1;

  const dependentOnNewCategories = entries.filter(
    (e) => e.type === 'add' && e.dependsOn?.type === 'category-add',
  ).length;

  // Hash déterministe : exclut generatedAt et manifestHash eux-mêmes
  const deterministicContent = { fingerprints, operations: entries };
  const manifestHash = sha256Json(deterministicContent);

  const manifest = {
    generatedAt: new Date().toISOString(),
    uri: redactMongoUrl(mongoUrl),
    fingerprints,
    planSummary: {
      totalOps: result.counts.planned,
      byType,
      skipped: result.counts.skipped,
      dependentOnNewCategories,
    },
    operations: entries,
    skipped: result.skipped,
    manifestHash,
  };

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('\n=== Manifeste généré ===');
  console.log('Fichier      :', MANIFEST_PATH);
  console.log('totalOps     :', manifest.planSummary.totalOps);
  console.log('byType       :', JSON.stringify(byType));
  console.log('skipped      :', manifest.planSummary.skipped);
  console.log('catDépendants:', dependentOnNewCategories);
  console.log('manifestHash :', manifestHash);
  BEHAVIOR_FILES.forEach((f) => console.log(`  ${f}: ${fingerprints[f]}`));

  return manifest;
}

// ─── Vérification des préconditions ───────────────────────────────────────────

async function checkPreconditions() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!mongoUrl) {
    console.error('MONGO_URL manquant');
    process.exit(1);
  }

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(
      "Manifeste introuvable. Exécutez d'abord sans --check pour le générer.",
    );
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  console.log('URI (masquée) :', redactMongoUrl(mongoUrl));
  console.log('Mode          : VÉRIFICATION DES PRÉCONDITIONS');
  console.log('Manifeste du  :', manifest.generatedAt);
  console.log('manifestHash  :', manifest.manifestHash);

  // Vérifier que les fichiers de comportement n'ont pas changé depuis la génération.
  console.log('\n─ Empreintes des fichiers de comportement ─');
  let fingerprintDrift = false;
  for (const [rel, expected] of Object.entries(manifest.fingerprints || {})) {
    const current = sha256File(rel);
    const ok = current === expected;
    console.log(`  ${ok ? '✓' : '✗'} ${rel}`);
    if (!ok) {
      console.log(`      attendu : ${expected}`);
      console.log(`      actuel  : ${current}`);
      fingerprintDrift = true;
    }
  }
  if (fingerprintDrift) {
    console.error(
      '\n[BLOQUÉ] Les fichiers de comportement ont changé depuis la génération du manifeste.',
    );
    console.error('Régénérez le manifeste avec : node catalog/catalog-migration-manifest.js');
    process.exit(1);
  }

  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 20000 });

  const drifts = [];
  const alreadyApplied = [];

  try {
    for (const entry of manifest.operations) {
      // ── add : vérifier qu'aucun service avec ce catalogKey n'existe déjà ──
      if (entry.type === 'add') {
        const existing = await Service.findOne({ catalogKey: entry.catalogKey }).lean();
        if (existing) {
          alreadyApplied.push({ catalogKey: entry.catalogKey, id: String(existing._id) });
        }
        continue;
      }

      // ── category-add : vérifier que la catégorie n'existe pas encore ──
      if (entry.type === 'category-add') {
        const { normalizeCatalogText } = await import('../utils/catalogText.js');
        const cats = await Categorie.find().lean();
        const exists = cats.some(
          (c) =>
            normalizeCatalogText(c.nomcategorie) ===
            normalizeCatalogText(entry.after?.nomcategorie),
        );
        if (exists) {
          alreadyApplied.push({ type: 'category-add', nomcategorie: entry.after?.nomcategorie });
        }
        continue;
      }

      // ── ops avec before : rename, vocab, shortcut, category-trim ──
      if (!entry.id || !entry.before) continue;

      const Model = entry.type === 'category-trim' ? Categorie : Service;
      const doc = await Model.findById(entry.id).lean();

      if (!doc) {
        drifts.push({
          type: entry.type,
          stableKey: entry.stableKey,
          reason: 'document_absent',
          detail: `Le document ${entry.id} est introuvable.`,
        });
        continue;
      }

      // Comparer chaque champ « before » avec la valeur courante.
      for (const [field, expected] of Object.entries(entry.before)) {
        if (expected && typeof expected === 'object' && expected.absent === true) {
          // Le champ était absent avant la migration précédente — pas vérifiable ici.
          continue;
        }
        const current = doc[field];
        const mismatch = Array.isArray(expected)
          ? JSON.stringify([...(current || [])].sort()) !==
          JSON.stringify([...(expected || [])].sort())
          : current !== expected;

        if (mismatch) {
          drifts.push({
            type: entry.type,
            stableKey: entry.stableKey,
            field,
            expected,
            current,
            detail: `Valeur avant attendue "${expected}", valeur courante "${current}".`,
          });
        }
      }
    }
  } finally {
    await mongoose.disconnect();
  }

  // ── Rapport ──────────────────────────────────────────────────────────────────

  console.log('\n─ Opérations déjà appliquées (noops attendus) ─');
  if (alreadyApplied.length === 0) {
    console.log('  Aucune — base non encore migrée (attendu avant le premier apply).');
  } else {
    console.log(`  ${alreadyApplied.length} déjà appliquées :`);
    alreadyApplied.slice(0, 20).forEach((a) =>
      console.log(`    ${JSON.stringify(a)}`),
    );
  }

  console.log('\n─ Dérives détectées (préconditions échouées) ─');
  if (drifts.length === 0) {
    console.log('  Aucune dérive — préconditions satisfaites.');
  } else {
    console.error(`  ${drifts.length} dérive(s) :`);
    drifts.forEach((d) =>
      console.error(`  [DRIFT] ${d.stableKey} | ${d.field ?? ''} : ${d.detail}`),
    );
  }

  if (drifts.length > 0) {
    console.error(
      '\n[BLOQUÉ] Des préconditions échouent. Examinez les dérives ci-dessus avant d\'appliquer.',
    );
    process.exit(1);
  }

  if (alreadyApplied.length > 0 && alreadyApplied.length === manifest.planSummary.totalOps) {
    console.log('\n[INFO] Toutes les opérations semblent déjà appliquées (base déjà migrée).');
  }

  console.log('\n[OK] Préconditions satisfaites — apply autorisé.');
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

async function main() {
  if (CHECK) {
    await checkPreconditions();
  } else {
    await generateManifest();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
