/**
 * DASH-8C.2 — Création article (vendeur + photo obligatoires, Mongo isolé).
 */
import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import cloudinary from 'cloudinary';

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

const SECRET = 'dash8c2-article-create-secret-min-32!!';
const FAKE_ID = '000000000000000000000000';
const FIXTURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+hHgAHggJ/PchI7wAAAABJRU5ErkJggz',
  'base64',
);

let server;
let baseUrl;
let adminToken;
let ownerToken;
let adminUser;
let ownerUser;
let vendeurA;
let vendeurB;
let categorieId;
let uploadMock;
let destroyMock;
let uploadCalls;

function issueToken(userId, role) {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, { expiresIn: '1h' });
}

async function requestJson(method, urlPath, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function requestMultipart(method, urlPath, { token, fields = {}, fileField, fileName = 'fixture.png' } = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, String(v));
  }
  if (fileField) {
    fd.append(fileField, new Blob([FIXTURE_PNG], { type: 'image/png' }), fileName);
  }
  const headers = {};
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${urlPath}`, { method, headers, body: fd });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

function baseArticleFields(vendeurId) {
  return {
    nomArticle: 'dash8c2_article',
    prixArticle: '1200',
    quantiteArticle: '4',
    vendeur: String(vendeurId),
    categorie: categorieId,
    tags: '["dash8c2"]',
  };
}

async function seed() {
  adminUser = await Utilisateur.create({
    nom: 'Dash8c2',
    prenom: 'Admin',
    telephone: '+2250700001201',
    email: 'dash8c2-admin@test.local',
    password: 'GateTest1c!!',
    role: 'Admin',
    isActive: true,
  });
  adminToken = issueToken(adminUser._id, 'Admin');
  adminUser.tokens = [{ token: adminToken }];
  await adminUser.save();

  ownerUser = await Utilisateur.create({
    nom: 'Dash8c2',
    prenom: 'Owner',
    telephone: '+2250700001202',
    email: 'dash8c2-owner@test.local',
    password: 'GateTest1c!!',
    role: 'Client',
    isActive: true,
  });
  ownerToken = issueToken(ownerUser._id, 'Client');
  ownerUser.tokens = [{ token: ownerToken }];
  await ownerUser.save();

  const g = await Groupe.create({ nomgroupe: 'dash8c2_EMARKET' });
  const cat = await Categorie.create({
    nomcategorie: 'dash8c2_CAT',
    imagecategorie: 'https://res.cloudinary.com/demo/fix.jpg',
    groupe: g._id,
  });
  categorieId = String(cat._id);

  vendeurA = await vendeurModel.create({
    utilisateur: ownerUser._id,
    shopName: 'dash8c2_shop_owner',
    shopDescription: 'Owner shop',
    businessType: 'Particulier',
    businessCategories: ['Mode'],
    status: 'active',
    accountStatus: 'Active',
    verificationDocuments: { isVerified: true },
  });

  vendeurB = await vendeurModel.create({
    utilisateur: adminUser._id,
    shopName: 'dash8c2_shop_admin',
    shopDescription: 'Admin shop',
    businessType: 'Particulier',
    businessCategories: ['Mode'],
    status: 'active',
    accountStatus: 'Active',
    verificationDocuments: { isVerified: true },
  });
}

describe('DASH-8C.2 — création article vendeur + photo', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';
    await startIsolatedMongo();

    uploadCalls = 0;
    uploadMock = mock.method(cloudinary.v2.uploader, 'upload', async () => {
      uploadCalls += 1;
      return {
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/dash8c2_fixture.jpg',
        public_id: 'dash8c2_fixture',
      };
    });
    destroyMock = mock.method(cloudinary.v2.uploader, 'destroy', async () => ({}));

    const app = express();
    app.use(express.json());
    app.use('/api', articleRouter);
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    uploadMock?.restore?.();
    destroyMock?.restore?.();
    if (server) await new Promise((resolve) => server.close(resolve));
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    process.env.JWT_SECRET = SECRET;
    uploadCalls = 0;
    await seed();
  });

  it('1 — création sans vendeur → 400', async () => {
    const before = uploadCalls;
    const r = await requestMultipart('POST', '/api/article', {
      token: adminToken,
      fields: {
        nomArticle: 'x',
        prixArticle: '1',
        quantiteArticle: '1',
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 400);
    assert.equal(uploadCalls, before);
  });

  it('2 — vendeur invalide → 400', async () => {
    const before = uploadCalls;
    const r = await requestMultipart('POST', '/api/article', {
      token: adminToken,
      fields: { ...baseArticleFields('not-an-id') },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 400);
    assert.equal(uploadCalls, before);
  });

  it('3 — vendeur inexistant → 404', async () => {
    const before = uploadCalls;
    const r = await requestMultipart('POST', '/api/article', {
      token: adminToken,
      fields: { ...baseArticleFields(FAKE_ID) },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 404);
    assert.equal(uploadCalls, before);
  });

  it('4 — création sans photo → 400', async () => {
    const before = uploadCalls;
    const r = await requestMultipart('POST', '/api/article', {
      token: adminToken,
      fields: { ...baseArticleFields(vendeurB._id) },
    });
    assert.equal(r.status, 400);
    assert.equal(uploadCalls, before);
  });

  it('5 — création Admin valide → 201', async () => {
    const r = await requestMultipart('POST', '/api/article', {
      token: adminToken,
      fields: { ...baseArticleFields(vendeurB._id) },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 201);
    assert.ok(r.json.photoArticle);
    const vendeurRef = r.json.vendeur?._id || r.json.vendeur;
    assert.equal(String(vendeurRef), String(vendeurB._id));
  });

  it('6 — propriétaire créant pour sa boutique → 201', async () => {
    const r = await requestMultipart('POST', '/api/article', {
      token: ownerToken,
      fields: { ...baseArticleFields(vendeurA._id) },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 201);
  });

  it('7 — propriétaire ciblant une autre boutique → 403', async () => {
    const before = uploadCalls;
    const r = await requestMultipart('POST', '/api/article', {
      token: ownerToken,
      fields: { ...baseArticleFields(vendeurB._id) },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 403);
    assert.equal(uploadCalls, before);
  });

  it('8 — Cloudinary non appelé sur 400/403/404', async () => {
    const start = uploadCalls;
    await requestMultipart('POST', '/api/article', {
      token: adminToken,
      fields: { ...baseArticleFields(FAKE_ID) },
      fileField: 'photoArticle',
    });
    await requestMultipart('POST', '/api/article', {
      token: ownerToken,
      fields: { ...baseArticleFields(vendeurB._id) },
      fileField: 'photoArticle',
    });
    await requestMultipart('POST', '/api/article', {
      token: adminToken,
      fields: { nomArticle: 'x', categorie: categorieId },
      fileField: 'photoArticle',
    });
    assert.equal(uploadCalls, start);
  });

  it('9 — création nominale avec média mocké', async () => {
    const r = await requestMultipart('POST', '/api/article', {
      token: adminToken,
      fields: { ...baseArticleFields(vendeurB._id), nomArticle: 'dash8c2_media_ok' },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 201);
    assert.match(r.json.photoArticle, /cloudinary/);
    assert.equal(uploadCalls >= 1, true);
  });

  it('10 — modification sans photo conserve l’ancienne', async () => {
    const created = await requestMultipart('POST', '/api/article', {
      token: adminToken,
      fields: { ...baseArticleFields(vendeurB._id), nomArticle: 'dash8c2_keep_photo' },
      fileField: 'photoArticle',
    });
    const id = created.json._id;
    const oldPhoto = created.json.photoArticle;
    const beforeUpload = uploadCalls;
    const updated = await requestJson('PUT', `/api/article/${id}`, {
      token: adminToken,
      body: { nomArticle: 'dash8c2_renamed' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.json.photoArticle, oldPhoto);
    assert.equal(uploadCalls, beforeUpload);
  });

  it('11 — remplacement photo : destroy ancien après succès', async () => {
    const created = await requestMultipart('POST', '/api/article', {
      token: adminToken,
      fields: { ...baseArticleFields(vendeurB._id), nomArticle: 'dash8c2_replace' },
      fileField: 'photoArticle',
    });
    const id = created.json._id;
    const uploadBefore = uploadCalls;
    const destroyBefore = destroyMock.mock.calls.length;
    const updated = await requestMultipart('PUT', `/api/article/${id}`, {
      token: adminToken,
      fields: { nomArticle: 'dash8c2_replace_new' },
      fileField: 'photoArticle',
    });
    assert.equal(updated.status, 200);
    assert.ok(uploadCalls > uploadBefore);
    assert.ok(destroyMock.mock.calls.length > destroyBefore);
  });

  it('12 — erreur Mongo → nettoyage du nouveau média', async () => {
    const realSave = articleModel.prototype.save;
    articleModel.prototype.save = function saveFail() {
      return Promise.reject(new Error('dash8c2_mongo_fail'));
    };
    try {
      const beforeDestroy = destroyMock.mock.calls.length;
      const r = await requestMultipart('POST', '/api/article', {
        token: adminToken,
        fields: { ...baseArticleFields(vendeurB._id), nomArticle: 'dash8c2_mongo' },
        fileField: 'photoArticle',
      });
      assert.equal(r.status, 500);
      assert.ok(destroyMock.mock.calls.length > beforeDestroy);
    } finally {
      articleModel.prototype.save = realSave;
    }
  });

  it('13 — champs Article existants inchangés (tags, quantite)', async () => {
    const r = await requestMultipart('POST', '/api/article', {
      token: adminToken,
      fields: {
        ...baseArticleFields(vendeurB._id),
        nomArticle: 'dash8c2_fields',
        quantiteArticle: '7',
        tags: '["a","b"]',
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 201);
    assert.deepEqual(r.json.tags, ['a', 'b']);
    assert.equal(r.json.quantiteArticle, 7);
  });
});
