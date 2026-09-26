/**
 * DASH-7C — GET /api/statistiques/* (Mongo isolé, node:test).
 * DASH-7C.1 — évolutions + filtre période global.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';

import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import Utilisateur from '../models/utilisateurModel.js';
import Commande from '../models/commandeModel.js';
import Paiement from '../models/paiementModel.js';
import statistiquesRouter from '../routes/statistiquesRoutes.js';
import { computeEvolution } from '../utils/statistiquesPeriod.js';

const SECRET = 'dash7c-statistiques-secret-min-32-chars!!';
const PREFIX = 'dash7c_';

let server;
let baseUrl;
let adminToken;
let clientToken;
let clientUser;

function issueToken(userId, role, expiresIn = '1h') {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, { expiresIn });
}

async function requestJson(method, urlPath, { token, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
  const headers = { 'Content-Type': 'application/json' };
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${urlPath}${qs}`, { method, headers });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, text };
}

function mountApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', statistiquesRouter);
  return app;
}

async function seedUsers() {
  const adminUser = await Utilisateur.create({
    nom: PREFIX + 'Admin',
    prenom: 'Stats',
    telephone: '+2250700000801',
    email: `${PREFIX}admin@test.local`,
    password: 'GateTest1a!!',
    role: 'Admin',
    isActive: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  });
  adminToken = issueToken(adminUser._id, 'Admin');
  adminUser.tokens = [{ token: adminToken }];
  await adminUser.save();

  clientUser = await Utilisateur.create({
    nom: PREFIX + 'Client',
    prenom: 'Stats',
    telephone: '+2250700000802',
    email: `${PREFIX}client@test.local`,
    password: 'GateTest1a!!',
    role: 'Client',
    isActive: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  });
  clientToken = issueToken(clientUser._id, 'Client');
  clientUser.tokens = [{ token: clientToken }];
  await clientUser.save();

  await Utilisateur.create({
    nom: PREFIX + 'Client2',
    prenom: 'Stats',
    telephone: '+2250700000803',
    email: `${PREFIX}client2@test.local`,
    password: 'GateTest1a!!',
    role: 'Client',
    isActive: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  });
}

async function seedActivity({ commandeDate = new Date(), paiementDate = new Date() } = {}) {
  const commande = await Commande.create({
    utilisateur: clientUser._id,
    infoCommande: {
      addresse: 'Rue test',
      ville: 'Abidjan',
      telephone: '+2250700000000',
      codePostal: '00225',
      pays: 'CI',
    },
    articles: [{ nom: 'Article', quantite: 1, prix: 500 }],
    prixArticles: 500,
    prixLivraison: 0,
    prixTotal: 500,
    statusCommande: 'Confirmée',
    dateCreation: commandeDate,
  });

  await Paiement.create({
    numeroTransaction: `${PREFIX}valide_${Date.now()}_${Math.random()}`,
    payeur: clientUser._id,
    typeObjet: 'COMMANDE',
    objetId: commande._id,
    montantOriginal: 1000,
    montantFrais: 0,
    montantNet: 1000,
    methodePaiement: 'MOBILE_MONEY_MTN',
    fournisseurPaiement: 'MTN_MOMO',
    description: 'Test DASH-7C paiement valide',
    statut: 'VALIDE',
    dateInitiation: paiementDate,
    dateValidation: paiementDate,
  });
}

describe('DASH-7C — statistiques admin', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    await startIsolatedMongo();
    const app = mountApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    process.env.JWT_SECRET = SECRET;
    await seedUsers();
  });

  it('computeEvolution — previous=0 current>0 → null new', () => {
    const r = computeEvolution(3, 0);
    assert.equal(r.value, null);
    assert.equal(r.status, 'new');
  });

  it('computeEvolution — 0/0 → stable', () => {
    const r = computeEvolution(0, 0);
    assert.equal(r.value, 0);
    assert.equal(r.status, 'stable');
  });

  it('computeEvolution — previous>0 current=0 → -100 down', () => {
    const r = computeEvolution(0, 5);
    assert.equal(r.value, -100);
    assert.equal(r.status, 'down');
  });

  it('401 sans token sur /generales', async () => {
    const r = await requestJson('GET', '/api/statistiques/generales', { query: { periode: '30j' } });
    assert.equal(r.status, 401);
  });

  it('403 Client sur /generales', async () => {
    const r = await requestJson('GET', '/api/statistiques/generales', {
      token: clientToken,
      query: { periode: '30j' },
    });
    assert.equal(r.status, 403);
  });

  it('400 période invalide sur generales, categories, paiements, geo', async () => {
    for (const path of [
      '/api/statistiques/generales',
      '/api/statistiques/categories',
      '/api/statistiques/paiements',
      '/api/statistiques/geographiques',
    ]) {
      const r = await requestJson('GET', path, {
        token: adminToken,
        query: { periode: '2y' },
      });
      assert.equal(r.status, 400, path);
    }
  });

  it('400 dates personnalisées invalides', async () => {
    const r = await requestJson('GET', '/api/statistiques/paiements', {
      token: adminToken,
      query: { periode: 'personnalise', dateDebut: '2024-02-01', dateFin: '2024-01-01' },
    });
    assert.equal(r.status, 400);
  });

  it('200 base vide — évolution clients new (prev=0, current>0)', async () => {
    const r = await requestJson('GET', '/api/statistiques/generales', {
      token: adminToken,
      query: { periode: '30j' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.totalUtilisateurs, 2);
    assert.equal(r.json.evolutionUtilisateurs, null);
    assert.equal(r.json.evolutionUtilisateursStatus, 'new');
    const payload = JSON.stringify(r.json);
    assert.ok(!payload.includes('NaN'));
    assert.ok(!payload.includes('Infinity'));
  });

  it('200 fixtures — CA validé et paiements filtrés 30j', async () => {
    await seedActivity();
    const r = await requestJson('GET', '/api/statistiques/generales', {
      token: adminToken,
      query: { periode: '30j' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.totalCommandes, 1);
    assert.equal(r.json.chiffreAffaires, 1000);

    const pay = await requestJson('GET', '/api/statistiques/paiements', {
      token: adminToken,
      query: { periode: '30j' },
    });
    assert.equal(pay.status, 200);
    const mtn = pay.json.find((x) => x.methode.includes('MTN'));
    assert.ok(mtn);
    assert.equal(mtn.montant, 1000);
  });

  it('paiements hors période exclus (7j)', async () => {
    const old = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    await seedActivity({ commandeDate: old, paiementDate: old });
    const pay = await requestJson('GET', '/api/statistiques/paiements', {
      token: adminToken,
      query: { periode: '7j' },
    });
    assert.equal(pay.status, 200);
    assert.equal(pay.json.length, 0);
  });

  it('geographiques exclut commandes hors période', async () => {
    const old = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    await seedActivity({ commandeDate: old, paiementDate: old });
    const geo = await requestJson('GET', '/api/statistiques/geographiques', {
      token: adminToken,
      query: { periode: '7j' },
    });
    assert.equal(geo.status, 200);
    assert.equal(geo.json.length, 0);
  });

  it('200 geographiques dans la période', async () => {
    await seedActivity();
    const geo = await requestJson('GET', '/api/statistiques/geographiques', {
      token: adminToken,
      query: { periode: '30j' },
    });
    assert.equal(geo.status, 200);
    assert.equal(geo.json[0].ville, 'Abidjan');
    assert.equal(geo.json[0].commandes, 1);
  });

  it('200 categories accepte période', async () => {
    const cat = await requestJson('GET', '/api/statistiques/categories', {
      token: adminToken,
      query: { periode: '30j' },
    });
    assert.equal(cat.status, 200);
    assert.ok(Array.isArray(cat.json));
  });

  it('alias 30d accepté', async () => {
    const r = await requestJson('GET', '/api/statistiques/generales', {
      token: adminToken,
      query: { periode: '30d' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.periode, '30j');
  });
});
