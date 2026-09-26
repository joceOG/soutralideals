/**
 * DASH-8C — Vendeur admin CRUD multipart + KYC (Mongo isolé, Cloudinary mocké).
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
import vendeurRouter from '../routes/vendeurRoutes.js';
import { assertVendeurPendingListHasNoDocumentLeak } from '../utils/vendeurPendingPresenter.js';

const SECRET = 'dash8c-vendeur-secret-min-32-chars!!';
const FAKE_ID = '000000000000000000000000';
const FIXTURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+hHgAHggJ/PchI7wAAAABJRU5ErkJggz',
  'base64',
);

const BASE_FIELDS = {
  shopName: 'Dash8C Shop',
  shopDescription: 'Boutique test DASH-8C',
  businessType: 'Particulier',
  businessCategories: JSON.stringify(['Mode']),
  businessAddress: JSON.stringify({ city: 'Abidjan', country: "Côte d'Ivoire" }),
};

let server;
let baseUrl;
let adminToken;
let clientToken;
let client2Token;
let adminUser;
let clientUser;
let client2User;
let uploadCalls;
let uploadSeq;

function cloudinaryUploadCallCount() {
  return uploadCalls;
}

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

async function requestMultipart(method, urlPath, { token, fields = {}, files = {} }) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, String(v));
  }
  for (const [field, fileName] of Object.entries(files)) {
    fd.append(field, new Blob([FIXTURE_PNG], { type: 'image/png' }), fileName || 'fixture.png');
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

async function seedUsers() {
  adminUser = await Utilisateur.create({
    nom: 'Dash8c',
    prenom: 'Admin',
    telephone: '+2250700001001',
    email: 'dash8c-admin@test.local',
    password: 'GateTest1c!!',
    role: 'Admin',
    isActive: true,
  });
  adminToken = issueToken(adminUser._id, 'Admin');
  adminUser.tokens = [{ token: adminToken }];
  await adminUser.save();

  clientUser = await Utilisateur.create({
    nom: 'Dash8c',
    prenom: 'Client',
    telephone: '+2250700001002',
    email: 'dash8c-client@test.local',
    password: 'GateTest1c!!',
    role: 'Client',
    isActive: true,
  });
  clientToken = issueToken(clientUser._id, 'Client');
  clientUser.tokens = [{ token: clientToken }];
  await clientUser.save();

  client2User = await Utilisateur.create({
    nom: 'Dash8c',
    prenom: 'Autre',
    telephone: '+2250700001003',
    email: 'dash8c-client2@test.local',
    password: 'GateTest1c!!',
    role: 'Client',
    isActive: true,
  });
  client2Token = issueToken(client2User._id, 'Client');
  client2User.tokens = [{ token: client2Token }];
  await client2User.save();
}

describe('DASH-8C — Vendeur admin', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';
    await startIsolatedMongo();

    uploadCalls = 0;
    uploadSeq = 0;
    mock.method(cloudinary.v2.uploader, 'upload', async (_path, opts = {}) => {
      uploadCalls += 1;
      uploadSeq += 1;
      return {
        secure_url: `https://res.cloudinary.com/demo/v/${uploadSeq}.jpg`,
        public_id: opts.public_id || `dash8c/${opts.folder || 'kyc'}/fixture-${uploadSeq}`,
      };
    });
    mock.method(cloudinary.v2.uploader, 'destroy', async () => ({ result: 'ok' }));
    mock.method(cloudinary.v2, 'url', () => 'https://res.cloudinary.com/demo/image/authenticated/signed-fixture');

    const app = express();
    app.use(express.json());
    app.use('/api', vendeurRouter);
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
    uploadCalls = 0;
    uploadSeq = 0;
    await seedUsers();
  });

  it('POST /api/vendeur sans token → 401', async () => {
    const r = await requestMultipart('POST', '/api/vendeur', {
      fields: { ...BASE_FIELDS, utilisateur: String(clientUser._id) },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 401);
    assert.equal(cloudinaryUploadCallCount(), 0);
  });

  it('POST client avec utilisateur tiers → 403 sans Cloudinary', async () => {
    const r = await requestMultipart('POST', '/api/vendeur', {
      token: clientToken,
      fields: { ...BASE_FIELDS, utilisateur: String(adminUser._id) },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 403);
    assert.equal(cloudinaryUploadCallCount(), 0);
  });

  it('POST création admin avec logo public et KYC → 201', async () => {
    const r = await requestMultipart('POST', '/api/vendeur', {
      token: adminToken,
      fields: { ...BASE_FIELDS, utilisateur: String(clientUser._id) },
      files: { shopLogo: 'logo.png', cni1: 'c1.png' },
    });
    assert.equal(r.status, 201);
    const doc = await vendeurModel.findOne({ shopName: 'Dash8C Shop' });
    assert.match(String(doc.verificationDocuments.cni1), /^cld:auth:/);
    assert.match(String(doc.shopLogo), /^https:\/\/res\.cloudinary\.com/);
  });

  it('POST self-service sans utilisateur tiers → 201', async () => {
    const r = await requestMultipart('POST', '/api/vendeur', {
      token: client2Token,
      fields: { ...BASE_FIELDS, shopName: 'Self Shop' },
    });
    assert.equal(r.status, 201);
    assert.equal(String(r.json.utilisateur._id || r.json.utilisateur), String(client2User._id));
  });

  it('POST utilisateur inexistant → 404', async () => {
    const r = await requestMultipart('POST', '/api/vendeur', {
      token: adminToken,
      fields: { ...BASE_FIELDS, utilisateur: FAKE_ID },
    });
    assert.equal(r.status, 404);
  });

  it('POST doublon → 409', async () => {
    await requestMultipart('POST', '/api/vendeur', {
      token: adminToken,
      fields: { ...BASE_FIELDS, utilisateur: String(clientUser._id) },
    });
    const r = await requestMultipart('POST', '/api/vendeur', {
      token: adminToken,
      fields: { ...BASE_FIELDS, shopName: 'Dup', utilisateur: String(clientUser._id) },
    });
    assert.equal(r.status, 409);
  });

  it('POST businessType invalide → 400', async () => {
    const before = cloudinaryUploadCallCount();
    const r = await requestMultipart('POST', '/api/vendeur', {
      token: adminToken,
      fields: {
        ...BASE_FIELDS,
        businessType: 'Invalid',
        utilisateur: String(clientUser._id),
      },
    });
    assert.equal(r.status, 400);
    assert.equal(cloudinaryUploadCallCount(), before);
  });

  it('GET liste admin sans cld:auth dans le corps', async () => {
    await requestMultipart('POST', '/api/vendeur', {
      token: adminToken,
      fields: { ...BASE_FIELDS, utilisateur: String(clientUser._id) },
      files: { cni1: 'c1.png' },
    });
    const r = await requestJson('GET', '/api/vendeur?page=1&limit=50', { token: adminToken });
    assert.equal(r.status, 200);
    const blob = JSON.stringify(r.json);
    assert.doesNotMatch(blob, /cld:auth:/);
    const first = r.json.vendeurs[0];
    assert.equal(typeof first.verificationDocuments.cni1, 'boolean');
    assert.equal(typeof first.articleCount, 'number');
  });

  it('PUT sans fichier conserve KYC', async () => {
    const created = await requestMultipart('POST', '/api/vendeur', {
      token: adminToken,
      fields: { ...BASE_FIELDS, utilisateur: String(clientUser._id) },
      files: { cni1: 'c1.png' },
    });
    const id = created.json._id;
    const before = await vendeurModel.findById(id);
    const r = await requestMultipart('PUT', `/api/vendeur/${id}`, {
      token: adminToken,
      fields: { shopDescription: 'MAJ description' },
    });
    assert.equal(r.status, 200);
    const after = await vendeurModel.findById(id);
    assert.equal(after.verificationDocuments.cni1, before.verificationDocuments.cni1);
  });

  it('PUT inexistant → 404 sans Cloudinary', async () => {
    const before = cloudinaryUploadCallCount();
    const r = await requestMultipart('PUT', `/api/vendeur/${FAKE_ID}`, {
      token: adminToken,
      fields: { shopDescription: 'X' },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 404);
    assert.equal(cloudinaryUploadCallCount(), before);
  });

  it('PUT non propriétaire → 403', async () => {
    const created = await requestMultipart('POST', '/api/vendeur', {
      token: adminToken,
      fields: { ...BASE_FIELDS, utilisateur: String(clientUser._id) },
    });
    const before = cloudinaryUploadCallCount();
    const r = await requestMultipart('PUT', `/api/vendeur/${created.json._id}`, {
      token: client2Token,
      fields: { shopDescription: 'Hack' },
    });
    assert.equal(r.status, 403);
    assert.equal(cloudinaryUploadCallCount(), before);
  });

  it('PUT client ne peut pas imposer isTopRated', async () => {
    const created = await requestMultipart('POST', '/api/vendeur', {
      token: client2Token,
      fields: { ...BASE_FIELDS, shopName: 'Owner Shop' },
    });
    const id = created.json._id;
    await requestMultipart('PUT', `/api/vendeur/${id}`, {
      token: client2Token,
      fields: { shopDescription: 'OK', isTopRated: 'true' },
    });
    const doc = await vendeurModel.findById(id);
    assert.equal(doc.isTopRated, false);
  });

  it('GET pending/list expurgé', async () => {
    await vendeurModel.create({
      utilisateur: clientUser._id,
      shopName: 'Pending Shop',
      shopDescription: 'Desc',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
      status: 'pending',
      verificationDocuments: {
        cni1: 'cld:auth:v/test',
        businessLicense: 'https://res.cloudinary.com/demo/old.jpg',
        isVerified: false,
      },
    });
    const r = await requestJson('GET', '/api/vendeur/pending/list', { token: adminToken });
    assert.equal(r.status, 200);
    assertVendeurPendingListHasNoDocumentLeak(r.json);
    const row = r.json.find((x) => x.boutique?.shopName === 'Pending Shop');
    assert.ok(row);
    assert.equal(row.kyc.legacyDocumentDetected, true);
  });

  it('modèle Article inchangé — toujours référence vendeur', async () => {
    const paths = Object.keys(articleModel.schema.paths);
    assert.ok(paths.includes('vendeur'));
    assert.ok(!paths.includes('boutique'));
  });
});
