/**
 * Vérifie la restauration BSON sur la base locale isolée.
 * Connexion locale uniquement — jamais sur Atlas.
 */
import mongoose from 'mongoose';

const LOCAL = 'mongodb://127.0.0.1:27017/sdeals_backup_verify';
await mongoose.connect(LOCAL, { serverSelectionTimeoutMS: 5000 });
const db = mongoose.connection.db;

// ── Comptages ────────────────────────────────────────────────────────────────
const gCount = await db.collection('groupes').countDocuments();
const cCount = await db.collection('categories').countDocuments();
const sCount = await db.collection('services').countDocuments();

console.log('=== COMPTAGES (doivent correspondre à l\'export Atlas) ===');
console.log(`  groupes   : ${gCount}   (attendu:   3)`);
console.log(`  categories: ${cCount}  (attendu:  35)`);
console.log(`  services  : ${sCount} (attendu: 535)`);

const ok_counts = gCount === 3 && cCount === 35 && sCount === 535;
console.log(`  Résultat  : ${ok_counts ? '✓ OK' : '✗ ÉCART DÉTECTÉ'}`);

// ── Groupes ──────────────────────────────────────────────────────────────────
const groupes = await db.collection('groupes').find({}).toArray();
console.log('\n=== GROUPES ===');
groupes.forEach(g => console.log(`  ${g._id}  ${g.nomgroupe}`));

// ── Références catégorie → groupe ────────────────────────────────────────────
const cats = await db.collection('categories').find({}).toArray();
const groupeIds = new Set(groupes.map(g => g._id.toString()));
const brokenCat = cats.filter(c => !groupeIds.has(c.groupe?.toString()));
console.log('\n=== RÉFÉRENCES categories.groupe ===');
console.log(`  Valides : ${cats.length - brokenCat.length}/${cats.length}`);
if (brokenCat.length > 0) {
  console.error(`  CASSÉES : ${brokenCat.map(c => `${c._id} (${c.nomcategorie})`).join(', ')}`);
} else {
  console.log('  ✓ Toutes les références groupe sont valides');
}

// ── Références service → catégorie ───────────────────────────────────────────
const services = await db.collection('services').find({}).toArray();
const catIds = new Set(cats.map(c => c._id.toString()));
const brokenSvc = services.filter(s => !catIds.has(s.categorie?.toString()));
console.log('\n=== RÉFÉRENCES services.categorie ===');
console.log(`  Valides  : ${services.length - brokenSvc.length}/${services.length}`);
console.log(`  Cassées  : ${brokenSvc.length}  (19 attendus — orphelins connus, catégorie non nulle mais document absent)`);
const brokenIds = brokenSvc.map(s => s._id.toString());
console.log(`  IDs      : ${brokenIds.join(', ')}`);

// ── Champs utiles à la migration ─────────────────────────────────────────────
const shortcutRankCount = services.filter(s => s.shortcutRank != null).length;
const catalogKeyCount = services.filter(s => s.catalogKey != null).length;
const aliasesCount = services.filter(s => Array.isArray(s.aliases) && s.aliases.length > 0).length;
const needsCount = services.filter(s => Array.isArray(s.needs) && s.needs.length > 0).length;
console.log('\n=== CHAMPS MIGRATION (avant apply) ===');
console.log(`  shortcutRank défini : ${shortcutRankCount}  (attendu: 0 — migration non encore appliquée)`);
console.log(`  catalogKey défini   : ${catalogKeyCount}  (attendu: 0)`);
console.log(`  aliases non vides   : ${aliasesCount}`);
console.log(`  needs non vides     : ${needsCount}`);

// ── Catégories Métiers ───────────────────────────────────────────────────────
const metiersGroupe = groupes.find(g => /m[eé]tier/i.test(g.nomgroupe));
if (metiersGroupe) {
  const metiersCats = cats.filter(c => c.groupe?.toString() === metiersGroupe._id.toString());
  console.log('\n=== CATÉGORIES MÉTIERS ===');
  console.log(`  Groupe _id : ${metiersGroupe._id}`);
  console.log(`  Catégories : ${metiersCats.length}  (attendu: 10 — Jardinage et Événementiel absents avant migration)`);
  metiersCats.forEach(c => console.log(`    ${c._id}  "${c.nomcategorie}"`));
}

// ── Raccourcis existants (6 attendus après apply) ─────────────────────────────
// Avant apply, on vérifie juste que les services cibles existent avec leurs IDs
const EXPECTED_SHORTCUT_IDS = [
  '6961826fbff072a8b1695dbc',
  '696182cabff072a8b1695dc1',
  '670db0b8628e163918cf32f2',
  '69617a33bff072a8b1695d8a',
  '6963dc678eda1aafc5de5697',
  '6966bb8331f7f3c834546e67',
];
console.log('\n=== SERVICES CIBLES DES RACCOURCIS ===');
for (const id of EXPECTED_SHORTCUT_IDS) {
  const svc = services.find(s => s._id.toString() === id);
  if (svc) {
    console.log(`  ✓ ${id}  "${svc.nomservice}"  shortcutRank=${svc.shortcutRank ?? 'absent (normal avant migration)'}`);
  } else {
    console.error(`  ✗ ${id}  INTROUVABLE dans la sauvegarde`);
  }
}

await mongoose.disconnect();
console.log('\n=== RÉSUMÉ ===');
const ok_refs = brokenSvc.length === 19 && brokenCat.length === 0;
console.log(`Comptages     : ${ok_counts ? '✓' : '✗'}`);
console.log(`Refs cat→grp  : ${brokenCat.length === 0 ? '✓' : '✗'}`);
console.log(`Refs svc→cat  : ${brokenSvc.length === 19 ? '✓ 19 orphelins connus' : `✗ attendu 19, obtenu ${brokenSvc.length}`}`);
console.log(`Pré-migration : ${shortcutRankCount === 0 && catalogKeyCount === 0 ? '✓ shortcutRank/catalogKey absents' : '⚠ champs migration déjà présents'}`);
