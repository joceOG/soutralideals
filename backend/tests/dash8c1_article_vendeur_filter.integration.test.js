/**
 * DASH-8C.1 — Filtre articles par vendeur (Mongo isolé).
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
import vendeurModel from '../models/vendeurModel.js';
import articleModel from '../models/articleModel.js';
import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import articleRouter from '../routes/articleRoutes.js';

const SECRET = 'dash8c1-article-filter-secret-min-32!!';
const FAKE_ID = '000000000000000000000000';

let server;
let baseUrl;
let adminToken;
let adminUser;
let clientUser;
let vendeurA;
let vendeurB;
let categorieId;

function issueToken(userId, role) {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, { expiresIn: '1h' });
}

async function requestJson(method, urlPath, { token } = {}) {
  const headers = {};
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${urlPath}`, { method, headers });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function seed() {
  adminUser = await Utilisateur.create({
    nom: 'Dash8c1',
    prenom: 'Admin',
    telephone: '+2250700001101',
    email: 'dash8c1-admin@test.local',
    password: 'GateTest1c!!',
    role: 'Admin',
    isActive: true,
  });
  adminToken = issueToken(adminUser._id, 'Admin');
  adminUser.tokens = [{ token: adminToken }];
  await adminUser.save();

  clientUser = await Utilisateur.create({
    nom: 'Dash8c1',
    prenom: 'Client',
    telephone: '+2250700001102',
    email: 'dash8c1-client@test.local',
    password: 'GateTest1c!!',
    role: 'Client',
    isActive: true,
  });

  const g = await Groupe.create({ nomgroupe: 'dash8c1_EMARKET' });
  const cat = await Categorie.create({
    nomcategorie: 'dash8c1_CAT',
    imagecategorie: 'https://res.cloudinary.com/demo/fix.jpg',
    groupe: g._id,
  });
  categorieId = String(cat._id);

  vendeurA = await vendeurModel.create({
    utilisateur: adminUser._id,
    shopName: 'dash8c1_shop_a',
    shopDescription: 'A',
    businessType: 'Particulier',
    businessCategories: ['Mode'],
    status: 'active',
    accountStatus: 'Active',
    verificationDocuments: { isVerified: true },
  });

  vendeurB = await vendeurModel.create({
    utilisateur: clientUser._id,
    shopName: 'dash8c1_shop_b',
    shopDescription: 'B',
    businessType: 'Particulier',
    businessCategories: ['Mode'],
    status: 'active',
    accountStatus: 'Active',
    verificationDocuments: { isVerified: true },
  });

  await articleModel.create({
    nomArticle: 'dash8c1_article_a1',
    prixArticle: 1000,
    quantiteArticle: 5,
    photoArticle: 'https://res.cloudinary.com/demo/a.jpg',
    vendeur: vendeurA._id,
    categorie: cat._id,
    tags: ['dash8c1'],
  });

  await articleModel.create({
    nomArticle: 'dash8c1_article_b1',
    prixArticle: 2000,
    quantiteArticle: 3,
    photoArticle: 'https://res.cloudinary.com/demo/b.jpg',
    vendeur: vendeurB._id,
    categorie: cat._id,
    tags: ['dash8c1'],
  });
}

describe('DASH-8C.1 — filtre articles par vendeur', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    await startIsolatedMongo();
    const app = express();
    app.use(express.json());
    app.use('/api', articleRouter);
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
    await seed();
  });

  it('GET /articles sans filtre → tableau global (comportement public)', async () => {
    const r = await requestJson('GET', '/api/articles');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json));
  });

  it('GET filtre vendeur A → uniquement ses articles', async () => {
    const r = await requestJson('GET', `/api/articles?vendeur=${vendeurA._id}&limit=10`, {
      token: adminToken,
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.total, 1);
    assert.equal(r.json.items[0].nomArticle, 'dash8c1_article_a1');
    assert.equal(r.json.boutique.shopName, 'dash8c1_shop_a');
  });

  it('pas de contamination entre vendeurs A et B', async () => {
    const rA = await requestJson('GET', `/api/articles?vendeur=${vendeurA._id}`, { token: adminToken });
    const rB = await requestJson('GET', `/api/articles?vendeur=${vendeurB._id}`, { token: adminToken });
    assert.equal(rA.json.items.length, 1);
    assert.equal(rB.json.items.length, 1);
    assert.notEqual(rA.json.items[0].nomArticle, rB.json.items[0].nomArticle);
  });

  it('vendeur sans article → 200 liste vide', async () => {
    const empty = await vendeurModel.create({
      utilisateur: clientUser._id,
      shopName: 'dash8c1_empty',
      shopDescription: 'E',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
    });
    const r = await requestJson('GET', `/api/articles?vendeur=${empty._id}`, { token: adminToken });
    assert.equal(r.status, 200);
    assert.equal(r.json.total, 0);
    assert.deepEqual(r.json.items, []);
  });

  it('ObjectId vendeur invalide → 400', async () => {
    const r = await requestJson('GET', '/api/articles?vendeur=bad-id', { token: adminToken });
    assert.equal(r.status, 400);
  });

  it('vendeur inexistant → 404', async () => {
    const r = await requestJson('GET', `/api/articles?vendeur=${FAKE_ID}`, { token: adminToken });
    assert.equal(r.status, 404);
  });

  it('filtre vendeur sans token → 401', async () => {
    const r = await requestJson('GET', `/api/articles?vendeur=${vendeurA._id}`);
    assert.equal(r.status, 401);
  });

  it('pagination filtrée — total cohérent', async () => {
    await articleModel.create({
      nomArticle: 'dash8c1_article_a2',
      prixArticle: 500,
      quantiteArticle: 1,
      photoArticle: 'https://res.cloudinary.com/demo/c.jpg',
      vendeur: vendeurA._id,
      categorie: categorieId,
    });
    const r = await requestJson('GET', `/api/articles?vendeur=${vendeurA._id}&limit=1&page=1`, {
      token: adminToken,
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.total, 2);
    assert.equal(r.json.items.length, 1);
  });

  it('recherche + vendeur', async () => {
    const r = await requestJson(
      'GET',
      `/api/articles?vendeur=${vendeurA._id}&search=dash8c1_article_a1`,
      { token: adminToken },
    );
    assert.equal(r.status, 200);
    assert.equal(r.json.total, 1);
  });

  it('catégorie + vendeur', async () => {
    const r = await requestJson(
      'GET',
      `/api/articles?vendeur=${vendeurA._id}&categorie=${categorieId}`,
      { token: adminToken },
    );
    assert.equal(r.status, 200);
    assert.equal(r.json.total, 1);
  });

  it('réponse filtrée sans fuite cld:auth', async () => {
    const r = await requestJson('GET', `/api/articles?vendeur=${vendeurA._id}`, { token: adminToken });
    const blob = JSON.stringify(r.json);
    assert.doesNotMatch(blob, /cld:auth:/);
  });
});
