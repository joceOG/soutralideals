#!/usr/bin/env node
/**
 * Contrôle HTTP post-apply sur les routes réelles de l'API.
 *
 * Démarre un serveur Express embarqué connecté à Atlas (lecture seule),
 * effectue les requêtes HTTP réelles, vérifie le contenu des réponses,
 * puis arrête le serveur.
 *
 * Usage :
 *   node catalog/verify-http-post-apply.js              # post-apply complet (18 checks)
 *   node catalog/verify-http-post-apply.js --pre-apply  # structurel seulement (11 checks)
 *
 * En état pré-apply :
 *   Les 11 checks structuraux (HTTP 200, JSON, buckets, pagination) passent.
 *   Les 7 checks de contenu (raccourcis, Plombier par besoin) échouent — attendu.
 *   Utilisez --pre-apply pour confirmer la baseline sans déclarer d'échec.
 *
 * Codes de sortie :
 *   0  toutes les vérifications demandées passent
 *   1  au moins une vérification échoue
 *
 * Ce script complète verify-post-apply.js (moteur direct) par des appels HTTP réels.
 */
import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

import serviceRouter from '../routes/serviceRoutes.js';
import searchRouter from '../routes/searchRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function redact(s) {
  return String(s ?? '').replace(/(mongodb(\+srv)?:\/\/)[^@\s]+@/gi, '$1***:***@');
}

// ─── Requête HTTP utilitaire ──────────────────────────────────────────────────

async function get(baseUrl, route) {
  const url = `${baseUrl}${route}`;
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// ─── Vérifications ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

const PRE_APPLY = process.argv.includes('--pre-apply');

function ok(msg) { console.log(`  ✓ ${msg}`); passed++; }
function fail(msg, isContent = false) {
  if (isContent && PRE_APPLY) {
    console.log(`  — ${msg} [skip pre-apply]`);
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}
function section(t) { console.log(`\n─── ${t} ───`); }

async function checkShortcuts(baseUrl) {
  section('GET /api/service/shortcuts?scope=metiers');

  const { status, body } = await get(baseUrl, '/api/service/shortcuts?scope=metiers');

  // Code HTTP
  if (status === 200) ok(`HTTP 200`);
  else { fail(`HTTP ${status} (attendu 200)`); return; }

  // Corps = tableau
  if (!Array.isArray(body)) { fail('Corps non tableau'); return; }
  ok(`Corps est un tableau`);

  // 6 éléments
  if (body.length === 6) ok(`6 raccourcis`);
  else fail(`${body.length} raccourcis (attendu 6)`, true);

  // Classés par shortcutRank croissant
  const ranks = body.map(s => s.shortcutRank);
  const sorted = [...ranks].sort((a, b) => a - b);
  if (JSON.stringify(ranks) === JSON.stringify(sorted)) ok(`Triés par shortcutRank : ${ranks.join(', ')}`);
  else fail(`Ordre incorrect : ${ranks.join(', ')}`, true);

  // Rangs uniques 1–6
  const rankSet = new Set(ranks);
  if (rankSet.size === 6 && Math.min(...ranks) === 1 && Math.max(...ranks) === 6) ok(`Rangs 1–6 uniques`);
  else fail(`Rangs inattendus : ${ranks.join(', ')}`, true);

  // Chaque élément a _id et nomservice
  const missingFields = body.filter(s => !s._id || !s.nomservice);
  if (missingFields.length === 0) ok(`Tous les raccourcis ont _id et nomservice`);
  else fail(`${missingFields.length} raccourcis sans _id/nomservice`, true);

  // Raccourci rank 1 = Plombier
  const rank1 = body.find(s => s.shortcutRank === 1);
  if (rank1 && /plombier/i.test(rank1.nomservice)) ok(`rank 1 = "${rank1.nomservice}"`);
  else fail(`rank 1 inattendu : "${rank1?.nomservice}"`, true);

  // Raccourci rank 2 = Électricien (après renommage)
  const rank2 = body.find(s => s.shortcutRank === 2);
  if (rank2 && /lectricien/i.test(rank2.nomservice)) ok(`rank 2 = "${rank2.nomservice}"`);
  else fail(`rank 2 inattendu : "${rank2?.nomservice}"`, true);

  // IDs attendus présents
  const EXPECTED_IDS = [
    '6961826fbff072a8b1695dbc', // Plombier
    '696182cabff072a8b1695dc1', // Électricien
    '670db0b8628e163918cf32f2', // Aide ménagère
    '69617a33bff072a8b1695d8a', // Maçon
    '6963dc678eda1aafc5de5697', // Mécanicien auto
    '6966bb8331f7f3c834546e67', // Coiffeur hommes
  ];
  const returnedIds = body.map(s => String(s._id));
  const missingIds = EXPECTED_IDS.filter(id => !returnedIds.includes(id));
  if (missingIds.length === 0) ok(`6 IDs attendus présents`);
  else fail(`IDs manquants : ${missingIds.join(', ')}`, true);
}

async function checkSearch(baseUrl) {
  section("GET /api/search/global?query=fuite%20d%27eau&scope=metiers");

  const { status, body } = await get(
    baseUrl,
    "/api/search/global?query=fuite%20d%27eau&scope=metiers",
  );

  if (status === 200) ok(`HTTP 200`);
  else { fail(`HTTP ${status} (attendu 200)`); return; }

  // Structure de réponse
  if (body && typeof body === 'object') ok(`Corps JSON valide`);
  else { fail('Corps non JSON'); return; }

  if (body.scope === 'metiers') ok(`scope = "metiers"`);
  else fail(`scope = "${body.scope}" (attendu "metiers")`);

  if (body.results && typeof body.results === 'object') ok(`Champ results présent`);
  else { fail('Champ results absent'); return; }

  if (typeof body.counts?.services === 'number') ok(`counts.services = ${body.counts.services}`);
  else fail('counts.services absent');

  // Présence de services dans les résultats
  const services = body.results?.services ?? [];
  if (Array.isArray(services) && services.length >= 1) ok(`${services.length} service(s) retourné(s)`);
  else fail(`Aucun service retourné pour "fuite d'eau"`, true);

  // Plombier présent
  const plombier = services.find(s => /plombier/i.test(s.nomservice));
  if (plombier) {
    ok(`Plombier présent : "${plombier.nomservice}" matchKind=${plombier.matchKind} score=${plombier.matchScore}`);
    // matchKind lié aux besoins
    const needKinds = ['exact-need', 'contains-need', 'typo-tokens'];
    if (needKinds.includes(plombier.matchKind)) ok(`matchKind "${plombier.matchKind}" indique un match par besoin`);
    else fail(`matchKind "${plombier.matchKind}" inattendu pour un match par besoin`, true);
    // aliases et needs présents dans la réponse
    if (Array.isArray(plombier.aliases) && plombier.aliases.length > 0) ok(`aliases présents (${plombier.aliases.length})`);
    else fail('aliases absents ou vides pour Plombier', true);
    if (Array.isArray(plombier.needs) && plombier.needs.some(n => /fuite/i.test(n))) ok(`needs contient "fuite"`);
    else fail(`needs ne contient pas "fuite" : ${JSON.stringify(plombier.needs)}`, true);
  } else {
    fail(`Plombier absent des résultats. Services retournés : ${services.map(s => s.nomservice).join(', ')}`, true);
  }

  // Buckets attendus (vides si aucun prestataire)
  if (Array.isArray(body.results?.prestataires)) ok(`bucket prestataires présent`);
  else fail('bucket prestataires absent');
  if (typeof body.pagination?.paginated === 'boolean') ok(`pagination.paginated = ${body.pagination.paginated}`);
  else fail('pagination absente');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!mongoUrl) { console.error('[ERREUR] MONGO_URL absent'); process.exit(1); }

  console.log(`Mode          : ${PRE_APPLY ? 'PRÉ-APPLY (structurel uniquement)' : 'POST-APPLY (complet)'}`);
  console.log('URI (masquée) :', redact(mongoUrl));

  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 20000 });

  // Serveur Express embarqué — uniquement les routes testées
  const app = express();
  app.use(express.json());
  app.use('/api', serviceRouter);   // /api/service/shortcuts
  app.use('/api', searchRouter);    // /api/search/global

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Serveur embarqué sur ${baseUrl}`);

  try {
    await checkShortcuts(baseUrl);
    await checkSearch(baseUrl);
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log(`\n══════════════════════════════════════`);
  console.log(`Résultat HTTP : ${passed} OK, ${failed} ÉCHEC`);
  if (failed > 0) {
    console.error('[ÉCHEC] Des vérifications HTTP ont échoué.');
    process.exit(1);
  }
  console.log('[OK] Tous les contrôles HTTP post-apply passent.');
}

main().catch(err => { console.error(err); process.exit(1); });
