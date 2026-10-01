#!/usr/bin/env node
/**
 * Vérification post-apply de la migration catalogue Métiers.
 * Connexion Atlas en lecture seule. Aucune écriture.
 *
 * Usage :
 *   node catalog/verify-post-apply.js
 *
 * Codes de sortie :
 *   0  toutes les vérifications passent
 *   1  au moins une vérification échoue
 */
import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import Service from '../models/serviceModel.js';
import { isMetiersGroupName } from '../utils/catalogText.js';
import { runMetiersCatalogMigration } from './runMetiersCatalogMigration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// IDs des raccourcis définis dans le plan
const EXPECTED_SHORTCUTS = [
  { rank: 1, id: '6961826fbff072a8b1695dbc', nom: 'Plombier' },
  { rank: 2, id: '696182cabff072a8b1695dc1', nom: 'Électricien' },
  { rank: 3, id: '670db0b8628e163918cf32f2', nom: 'Aide ménagère à domicile' },
  { rank: 4, id: '69617a33bff072a8b1695d8a', nom: 'Maçon' },
  { rank: 5, id: '6963dc678eda1aafc5de5697', nom: 'Mécanicien auto' },
  { rank: 6, id: '6966bb8331f7f3c834546e67', nom: 'Coiffeur / coiffeuse pour hommes' },
];

// Catégories attendues après migration (10 existantes + 2 nouvelles)
const EXPECTED_NEW_CATEGORIES = [
  'Jardinage & Espaces verts',
  'Événementiel & Animation',
];

// Clés de services créés (échantillon de 5 représentatifs)
const EXPECTED_CATALOG_KEYS_SAMPLE = [
  'metiers.nuisibles',
  'metiers.elagueur',
  'metiers.dj',
  'metiers.monteur-meubles',
  'metiers.chauffe-eau',
];

// Requêtes de recherche et leurs résultats attendus
const SEARCH_CHECKS = [
  {
    query: "fuite d'eau",
    scope: 'metiers',
    expectedServiceName: /plombier/i,
    expectedMatchKinds: ['exact-need', 'contains-need', 'typo-tokens'],
    desc: "recherche par besoin 'fuite d'eau' → Plombier",
  },
  {
    query: 'chaussure',
    scope: 'metiers',
    expectedServiceName: /cordonnier/i,
    expectedMatchKinds: ['exact-need', 'contains-need', 'exact-alias', 'typo-tokens'],
    desc: "recherche par besoin 'chaussure' → Cordonnier",
  },
  {
    query: 'chaiose',
    scope: 'metiers',
    expectedServiceName: /menuisier/i,
    expectedMatchKinds: ['typo-tokens', 'partial-typo'],
    desc: "tolérance fautes 'chaiose' → Menuisier (needs: chaise cassee)",
  },
];

function redactMongoUrl(url) {
  return String(url || '').replace(/\/\/[^@]+@/, '//***:***@');
}

let passed = 0;
let failed = 0;

function ok(msg) { console.log(`  ✓ ${msg}`); passed++; }
function fail(msg) { console.error(`  ✗ ${msg}`); failed++; }
function section(title) { console.log(`\n─── ${title} ───`); }

async function main() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!mongoUrl) { console.error('MONGO_URL manquant'); process.exit(1); }

  console.log('URI (masquée) :', redactMongoUrl(mongoUrl));
  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 20000 });

  try {
    // ── 1. Catégories Métiers ─────────────────────────────────────────────────
    section('1. Catégories Métiers');
    const groupes = await Groupe.find().lean();
    const metiersGroupe = groupes.find((g) => isMetiersGroupName(g.nomgroupe));
    if (!metiersGroupe) { fail('Groupe Métiers introuvable'); }
    else {
      ok(`Groupe Métiers trouvé : _id=${metiersGroupe._id}`);
      const cats = await Categorie.find({ groupe: metiersGroupe._id }).lean();
      if (cats.length >= 12) {
        ok(`${cats.length} catégories (≥12 attendu — 10 initiales + 2 nouvelles)`);
      } else {
        fail(`${cats.length} catégories — attendu ≥12 (migration incomplète ?)`);
      }
      for (const expected of EXPECTED_NEW_CATEGORIES) {
        const found = cats.find((c) => c.nomcategorie === expected);
        if (found) ok(`Nouvelle catégorie présente : "${expected}" (_id=${found._id})`);
        else fail(`Nouvelle catégorie absente : "${expected}"`);
      }
      // Trim : Beauté & Soins ne doit plus avoir d'espace en tête
      const beaute = cats.find((c) => /beaut/i.test(c.nomcategorie));
      if (!beaute) fail('Catégorie Beauté & Soins introuvable');
      else if (beaute.nomcategorie.startsWith(' ')) fail(`"${beaute.nomcategorie}" commence toujours par un espace`);
      else ok(`Trim Beauté & Soins : "${beaute.nomcategorie}" (pas d'espace initial)`);
    }

    // ── 2. Raccourcis ─────────────────────────────────────────────────────────
    section('2. Raccourcis (shortcutRank 1–6)');
    const shortcuts = await Service.find({ shortcutRank: { $gte: 1, $lte: 6 } })
      .sort({ shortcutRank: 1 })
      .lean();
    if (shortcuts.length === 6) {
      ok('Exactement 6 raccourcis définis');
    } else {
      fail(`${shortcuts.length} raccourcis — attendu 6`);
    }
    for (const exp of EXPECTED_SHORTCUTS) {
      const svc = shortcuts.find((s) => String(s._id) === exp.id);
      if (!svc) {
        fail(`Raccourci rank=${exp.rank} : service ${exp.id} (${exp.nom}) introuvable`);
      } else if (svc.shortcutRank !== exp.rank) {
        fail(`Raccourci rank=${exp.rank} : _id=${exp.id} a shortcutRank=${svc.shortcutRank}`);
      } else {
        ok(`rank ${exp.rank} : ${svc.nomservice} (_id=${svc._id})`);
      }
    }

    // ── 3. Nouveaux services (catalogKey) ─────────────────────────────────────
    section('3. Nouveaux services (catalogKey)');
    const totalCatalogKeys = await Service.countDocuments({
      catalogKey: { $exists: true, $ne: null },
    });
    if (totalCatalogKeys >= 44) {
      ok(`${totalCatalogKeys} services avec catalogKey (≥44 attendu)`);
    } else {
      fail(`${totalCatalogKeys} services avec catalogKey — attendu ≥44`);
    }
    for (const key of EXPECTED_CATALOG_KEYS_SAMPLE) {
      const svc = await Service.findOne({ catalogKey: key }).lean();
      if (svc) {
        const cat = await Categorie.findById(svc.categorie).lean();
        ok(`${key} → "${svc.nomservice}" dans catégorie "${cat?.nomcategorie ?? '?'}"`);
      } else {
        fail(`catalogKey absent : ${key}`);
      }
    }

    // ── 4. Recherche par besoin (catalogue en mémoire, sans serveur HTTP) ─────
    section('4. Recherche par besoin (matchCatalogServices)');
    const { matchCatalogServices } = await import('../utils/catalogSearch.js');
    for (const check of SEARCH_CHECKS) {
      const result = await matchCatalogServices(check.query, check.scope, { limit: 8 });
      const found = result.matches.find(
        (m) => check.expectedServiceName.test(m.service.nomservice),
      );
      if (!found) {
        fail(`${check.desc} — aucun résultat correspondant (total=${result.matches.length})`);
      } else if (!check.expectedMatchKinds.includes(found.kind)) {
        fail(`${check.desc} — matchKind="${found.kind}" inattendu (attendu: ${check.expectedMatchKinds.join('/')})`);
      } else {
        ok(`${check.desc} — "${found.service.nomservice}" kind=${found.kind} score=${found.score}`);
      }
    }

    // ── 5. Idempotence : nouveau dry-run après apply ──────────────────────────
    section('5. Idempotence (dry-run post-apply)');
    const dry2 = await runMetiersCatalogMigration({
      apply: false,
      mongoose,
      Groupe,
      Categorie,
      Service,
    });
    // planned doit être exactement 0
    if (dry2.counts.planned === 0) {
      ok(`planned = 0 (aucune opération résiduelle)`);
    } else {
      fail(`planned = ${dry2.counts.planned} — attendu 0 (opérations non appliquées ?)`);
      const residual = dry2.operations.filter((o) => o.status === 'planned').slice(0, 5);
      residual.forEach((o) => console.error(`    résiduel: ${o.type} ${o.id ?? o.catalogKey}`));
    }
    // noops : exactement 98 (2+1+32+13+6+44)
    const expectedNoops = 98;
    if (dry2.counts.noops === expectedNoops) {
      ok(`noops = ${dry2.counts.noops} (2 cat-add + 1 cat-trim + 32 rename + 13 vocab + 6 shortcut + 44 add)`);
    } else {
      fail(`noops = ${dry2.counts.noops} — attendu ${expectedNoops}`);
    }
    // skipped : exactement 6 (intentionnels)
    if (dry2.counts.skipped === 6) {
      ok(`skipped = 6 (6 exclusions intentionnelles : n°28,31,32,46,47,48)`);
    } else {
      fail(`skipped = ${dry2.counts.skipped} — attendu 6`);
    }
    if (dry2.counts.failed === 0) {
      ok('failed = 0');
    } else {
      fail(`failed = ${dry2.counts.failed}`);
    }

  } finally {
    await mongoose.disconnect();
  }

  // ── Rapport final ────────────────────────────────────────────────────────────
  console.log(`\n══════════════════════════════════════`);
  console.log(`Résultat : ${passed} OK, ${failed} ÉCHEC`);
  if (failed > 0) {
    console.error('[ÉCHEC] Des vérifications ont échoué. Voir ci-dessus.');
    process.exit(1);
  } else {
    console.log('[OK] Toutes les vérifications post-apply passent.');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
