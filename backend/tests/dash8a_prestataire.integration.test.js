/**
 * DASH-8A — Prestataire admin CRUD multipart + KYC (Mongo isolé, Cloudinary mocké).
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
import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import Service from '../models/serviceModel.js';
import prestataireModel from '../models/prestataireModel.js';
import prestataireRouter from '../routes/prestataireRoutes.js';
import { assertPendingListHasNoDocumentLeak } from '../utils/prestatairePendingPresenter.js';

const SECRET = 'dash8a-prestataire-secret-min-32-chars!!';
const FAKE_ID = '000000000000000000000000';
const FIXTURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+hHgAHggJ/PchI7wAAAABJRU5ErkJggz',
  'base64',
);

let server;
let baseUrl;
let adminToken;
let clientToken;
let adminUser;
let clientUser;
let client2User;
let client2Token;
let serviceId;
let cloudinaryMock;
let destroyCalls;
let uploadCalls;

function cloudinaryUploadCallCount() {
  return uploadCalls;
}

function issueToken(userId, role, expiresIn = '1h') {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, { expiresIn });
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

function mountApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', prestataireRouter);
  return app;
}

async function seedCatalog() {
  const g = await Groupe.create({ nomgroupe: 'DASH8A_METIERS' });
  const c = await Categorie.create({
    nomcategorie: 'DASH8A_CAT',
    imagecategorie: 'https://res.cloudinary.com/demo/fix.jpg',
    groupe: g._id,
  });
  const svc = await Service.create({ nomservice: 'DASH8A_SVC', categorie: c._id });
  serviceId = String(svc._id);
}

async function seedUsers() {
  adminUser = await Utilisateur.create({
    nom: 'Dash8a',
    prenom: 'Admin',
    telephone: '+2250700000801',
    email: 'dash8a-admin@test.local',
    password: 'GateTest1a!!',
    role: 'Admin',
    isActive: true,
  });
  adminToken = issueToken(adminUser._id, 'Admin');
  adminUser.tokens = [{ token: adminToken }];
  await adminUser.save();

  clientUser = await Utilisateur.create({
    nom: 'Dash8a',
    prenom: 'Client',
    telephone: '+2250700000802',
    email: 'dash8a-client@test.local',
    password: 'GateTest1a!!',
    role: 'Client',
    isActive: true,
  });
  clientToken = issueToken(clientUser._id, 'Client');
  clientUser.tokens = [{ token: clientToken }];
  await clientUser.save();

  client2User = await Utilisateur.create({
    nom: 'Dash8a',
    prenom: 'Autre',
    telephone: '+2250700000803',
    email: 'dash8a-client2@test.local',
    password: 'GateTest1a!!',
    role: 'Client',
    isActive: true,
  });
  client2Token = issueToken(client2User._id, 'Client');
  client2User.tokens = [{ token: client2Token }];
  await client2User.save();
}

describe('DASH-8A — Prestataire admin', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';
    await startIsolatedMongo();

    destroyCalls = 0;
    uploadCalls = 0;
    cloudinaryMock = mock.method(cloudinary.v2.uploader, 'upload', async (_path, opts = {}) => {
      uploadCalls += 1;
      return {
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/fixture.jpg',
        public_id: opts.public_id || `dash8a/${opts.folder || 'kyc'}/fixture`,
      };
    });
    mock.method(cloudinary.v2.uploader, 'destroy', async () => {
      destroyCalls += 1;
      return { result: 'ok' };
    });
    mock.method(cloudinary.v2, 'url', () => 'https://res.cloudinary.com/demo/image/authenticated/signed-fixture');

    const app = mountApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    cloudinaryMock?.restore?.();
    if (server) await new Promise((resolve) => server.close(resolve));
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    process.env.JWT_SECRET = SECRET;
    destroyCalls = 0;
    uploadCalls = 0;
    await seedUsers();
    await seedCatalog();
  });

  it('POST /api/prestataire sans token → 401', async () => {
    const r = await requestMultipart('POST', '/api/prestataire', {
      fields: { service: serviceId, localisation: 'Abidjan', prixprestataire: '1000' },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 401);
    assert.equal(cloudinaryUploadCallCount(), 0);
  });

  it('POST /api/prestataire token client sans admin → 403 si utilisateur tiers', async () => {
    const r = await requestMultipart('POST', '/api/prestataire', {
      token: clientToken,
      fields: {
        utilisateur: String(adminUser._id),
        service: serviceId,
        localisation: 'Abidjan',
        prixprestataire: '1000',
      },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 403);
    assert.equal(cloudinaryUploadCallCount(), 0);
  });

  it('POST création admin nominale avec KYC mocké → 201', async () => {
    const r = await requestMultipart('POST', '/api/prestataire', {
      token: adminToken,
      fields: {
        utilisateur: String(clientUser._id),
        service: serviceId,
        localisation: 'DASH8A_ABIDJAN',
        prixprestataire: '5000',
        anneeExperience: '3',
      },
      files: { cni1: 'cni1.png', cni2: 'cni2.png', selfie: 'selfie.png' },
    });
    assert.equal(r.status, 201);
    assert.match(String(r.json.cni1), /^cld:auth:/);
    assert.equal(await prestataireModel.countDocuments({ localisation: 'DASH8A_ABIDJAN' }), 1);
  });

  it('POST localisation absente → 400', async () => {
    const before = cloudinaryUploadCallCount();
    const r = await requestMultipart('POST', '/api/prestataire', {
      token: adminToken,
      fields: {
        utilisateur: String(clientUser._id),
        service: serviceId,
        prixprestataire: '1000',
      },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 400);
    assert.equal(cloudinaryUploadCallCount(), before);
  });

  it('POST service ObjectId invalide → 400', async () => {
    const r = await requestMultipart('POST', '/api/prestataire', {
      token: adminToken,
      fields: {
        utilisateur: String(clientUser._id),
        service: 'not-an-id',
        localisation: 'X',
        prixprestataire: '1000',
      },
    });
    assert.equal(r.status, 400);
  });

  it('POST service inexistant → 404', async () => {
    const r = await requestMultipart('POST', '/api/prestataire', {
      token: adminToken,
      fields: {
        utilisateur: String(clientUser._id),
        service: FAKE_ID,
        localisation: 'X',
        prixprestataire: '1000',
      },
    });
    assert.equal(r.status, 404);
  });

  it('POST utilisateur inexistant → 404', async () => {
    const r = await requestMultipart('POST', '/api/prestataire', {
      token: adminToken,
      fields: {
        utilisateur: FAKE_ID,
        service: serviceId,
        localisation: 'X',
        prixprestataire: '1000',
      },
    });
    assert.equal(r.status, 404);
  });

  it('POST fichier MIME interdit → 400', async () => {
    const fd = new FormData();
    fd.append('utilisateur', String(clientUser._id));
    fd.append('service', serviceId);
    fd.append('localisation', 'Abidjan');
    fd.append('prixprestataire', '1000');
    fd.append('cni1', new Blob(['not-image'], { type: 'text/plain' }), 'bad.txt');
    const res = await fetch(`${baseUrl}/api/prestataire`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: fd,
    });
    assert.equal(res.status, 400);
  });

  it('GET liste admin ne contient pas d’URL KYC brute', async () => {
    await requestMultipart('POST', '/api/prestataire', {
      token: adminToken,
      fields: {
        utilisateur: String(clientUser._id),
        service: serviceId,
        localisation: 'DASH8A_LIST',
        prixprestataire: '2000',
      },
      files: { cni1: 'c1.png' },
    });
    const r = await requestJson('GET', '/api/prestataire', { token: adminToken });
    assert.equal(r.status, 200);
    const blob = JSON.stringify(r.json);
    assert.doesNotMatch(blob, /cld:auth:/);
    const first = r.json[0];
    assert.equal(typeof first.cni1, 'boolean');
  });

  it('PUT sans nouveau KYC conserve les documents', async () => {
    const created = await requestMultipart('POST', '/api/prestataire', {
      token: adminToken,
      fields: {
        utilisateur: String(clientUser._id),
        service: serviceId,
        localisation: 'DASH8A_PUT',
        prixprestataire: '3000',
      },
      files: { cni1: 'c1.png', cni2: 'c2.png', selfie: 's.png' },
    });
    assert.equal(created.status, 201);
    const id = created.json._id;
    const before = await prestataireModel.findById(id);
    const r = await requestMultipart('PUT', `/api/prestataire/${id}`, {
      token: adminToken,
      fields: { localisation: 'DASH8A_PUT_UPD', prixprestataire: '3500' },
    });
    assert.equal(r.status, 200);
    const after = await prestataireModel.findById(id);
    assert.equal(after.cni1, before.cni1);
    assert.equal(after.cni2, before.cni2);
    assert.equal(after.selfie, before.selfie);
  });

  it('PUT avec nouveau cni1 remplace après succès', async () => {
    const created = await requestMultipart('POST', '/api/prestataire', {
      token: adminToken,
      fields: {
        utilisateur: String(clientUser._id),
        service: serviceId,
        localisation: 'DASH8A_REPLACE',
        prixprestataire: '3000',
      },
      files: { cni1: 'old.png' },
    });
    const id = created.json._id;
    const oldRef = created.json.cni1;
    const r = await requestMultipart('PUT', `/api/prestataire/${id}`, {
      token: adminToken,
      fields: { localisation: 'DASH8A_REPLACE' },
      files: { cni1: 'new.png' },
    });
    assert.equal(r.status, 200);
    assert.notEqual(r.json.cni1, oldRef);
    assert.match(String(r.json.cni1), /^cld:auth:/);
  });

  it('PUT /api/prestataire/:id ID invalide → 400 sans Cloudinary', async () => {
    const before = cloudinaryUploadCallCount();
    const r = await requestMultipart('PUT', '/api/prestataire/not-valid-id', {
      token: adminToken,
      fields: { localisation: 'X' },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 400);
    assert.equal(cloudinaryUploadCallCount(), before);
  });

  it('PUT /api/prestataire/:id inexistant → 404 sans Cloudinary', async () => {
    const before = cloudinaryUploadCallCount();
    const r = await requestMultipart('PUT', `/api/prestataire/${FAKE_ID}`, {
      token: adminToken,
      fields: { localisation: 'X' },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 404);
    assert.equal(cloudinaryUploadCallCount(), before);
  });

  it('PUT /api/prestataire/:id non propriétaire → 403 sans Cloudinary', async () => {
    const created = await requestMultipart('POST', '/api/prestataire', {
      token: adminToken,
      fields: {
        utilisateur: String(clientUser._id),
        service: serviceId,
        localisation: 'DASH8A_OWNER',
        prixprestataire: '1000',
      },
    });
    assert.equal(created.status, 201);
    const before = cloudinaryUploadCallCount();
    const r = await requestMultipart('PUT', `/api/prestataire/${created.json._id}`, {
      token: client2Token,
      fields: { localisation: 'Hack' },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 403);
    assert.equal(cloudinaryUploadCallCount(), before);
  });

  describe('DASH-8A.1 — pending/list sans fuite KYC', () => {
    it('GET pending sans token → 401', async () => {
      const r = await requestJson('GET', '/api/prestataire/pending/list');
      assert.equal(r.status, 401);
    });

    it('GET pending client → 403', async () => {
      const r = await requestJson('GET', '/api/prestataire/pending/list', { token: clientToken });
      assert.equal(r.status, 403);
    });

    it('GET pending admin — booléens KYC, pas d’URL', async () => {
      await prestataireModel.create({
        utilisateur: clientUser._id,
        service: serviceId,
        prixprestataire: 1000,
        localisation: 'DASH8A_PENDING',
        status: 'pending',
        cni1: 'cld:auth:prestataires/cni/test',
        cni2: 'https://res.cloudinary.com/demo/old/cni.jpg',
        selfie: '',
      });
      const r = await requestJson('GET', '/api/prestataire/pending/list', { token: adminToken });
      assert.equal(r.status, 200);
      assertPendingListHasNoDocumentLeak(r.json);
      const row = r.json.find((x) => x.localisation === 'DASH8A_PENDING');
      assert.ok(row);
      assert.equal(row.kyc.cniRectoPresent, true);
      assert.equal(row.kyc.cniVersoPresent, true);
      assert.equal(row.kyc.selfiePresent, false);
      assert.equal(row.kyc.legacyDocumentDetected, true);
      assert.equal(typeof row.identite.nom, 'string');
    });
  });
});
