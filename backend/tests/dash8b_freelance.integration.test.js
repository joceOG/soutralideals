/**
 * DASH-8B — Freelance admin CRUD multipart + KYC (Mongo isolé, Cloudinary mocké).
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
import freelanceModel from '../models/freelanceModel.js';
import freelanceRouter from '../routes/freelanceRoutes.js';
import { assertFreelancePendingListHasNoDocumentLeak } from '../utils/freelancePendingPresenter.js';

const SECRET = 'dash8b-freelance-secret-min-32-chars!!';
const FAKE_ID = '000000000000000000000000';
const FIXTURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+hHgAHggJ/PchI7wAAAABJRU5ErkJggz',
  'base64',
);

const BASE_FIELDS = {
  name: 'Dash8B Nom',
  job: 'Développeur',
  category: 'Tech',
  location: 'Abidjan',
  hourlyRate: '5000',
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
  app.use('/api', freelanceRouter);
  return app;
}

async function seedUsers() {
  adminUser = await Utilisateur.create({
    nom: 'Dash8b',
    prenom: 'Admin',
    telephone: '+2250700000901',
    email: 'dash8b-admin@test.local',
    password: 'GateTest1b!!',
    role: 'Admin',
    isActive: true,
  });
  adminToken = issueToken(adminUser._id, 'Admin');
  adminUser.tokens = [{ token: adminToken }];
  await adminUser.save();

  clientUser = await Utilisateur.create({
    nom: 'Dash8b',
    prenom: 'Client',
    telephone: '+2250700000902',
    email: 'dash8b-client@test.local',
    password: 'GateTest1b!!',
    role: 'Client',
    isActive: true,
  });
  clientToken = issueToken(clientUser._id, 'Client');
  clientUser.tokens = [{ token: clientToken }];
  await clientUser.save();

  client2User = await Utilisateur.create({
    nom: 'Dash8b',
    prenom: 'Autre',
    telephone: '+2250700000903',
    email: 'dash8b-client2@test.local',
    password: 'GateTest1b!!',
    role: 'Client',
    isActive: true,
  });
  client2Token = issueToken(client2User._id, 'Client');
  client2User.tokens = [{ token: client2Token }];
  await client2User.save();
}

describe('DASH-8B — Freelance admin', () => {
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
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/fixture.jpg',
        public_id: opts.public_id || `dash8b/${opts.folder || 'kyc'}/fixture-${uploadSeq}`,
      };
    });
    mock.method(cloudinary.v2.uploader, 'destroy', async () => ({ result: 'ok' }));
    mock.method(cloudinary.v2, 'url', () => 'https://res.cloudinary.com/demo/image/authenticated/signed-fixture');

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
    uploadCalls = 0;
    uploadSeq = 0;
    await seedUsers();
  });

  it('POST /api/freelance sans token → 401', async () => {
    const r = await requestMultipart('POST', '/api/freelance', {
      fields: { ...BASE_FIELDS, utilisateur: String(clientUser._id) },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 401);
    assert.equal(cloudinaryUploadCallCount(), 0);
  });

  it('POST token client avec utilisateur tiers → 403 sans Cloudinary', async () => {
    const r = await requestMultipart('POST', '/api/freelance', {
      token: clientToken,
      fields: { ...BASE_FIELDS, utilisateur: String(adminUser._id) },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 403);
    assert.equal(cloudinaryUploadCallCount(), 0);
  });

  it('POST création admin nominale avec KYC mocké → 201', async () => {
    const r = await requestMultipart('POST', '/api/freelance', {
      token: adminToken,
      fields: { ...BASE_FIELDS, utilisateur: String(clientUser._id) },
      files: { cni1: 'c1.png', cni2: 'c2.png', selfie: 's.png', profileImage: 'p.png' },
    });
    assert.equal(r.status, 201);
    const doc = await freelanceModel.findOne({ name: 'Dash8B Nom' });
    assert.match(String(doc.verificationDocuments.cni1), /^cld:auth:/);
    assert.equal(await freelanceModel.countDocuments({ name: 'Dash8B Nom' }), 1);
  });

  it('POST self-service client sans imposer utilisateur tiers → 201', async () => {
    const r = await requestMultipart('POST', '/api/freelance', {
      token: client2Token,
      fields: { ...BASE_FIELDS, name: 'Self Service' },
    });
    assert.equal(r.status, 201);
    assert.equal(String(r.json.utilisateur._id || r.json.utilisateur), String(client2User._id));
  });

  it('POST champ obligatoire absent → 400', async () => {
    const before = cloudinaryUploadCallCount();
    const r = await requestMultipart('POST', '/api/freelance', {
      token: adminToken,
      fields: { utilisateur: String(clientUser._id), job: 'X', category: 'Y', hourlyRate: '100' },
    });
    assert.equal(r.status, 400);
    assert.equal(cloudinaryUploadCallCount(), before);
  });

  it('POST utilisateur ObjectId invalide → 400', async () => {
    const r = await requestMultipart('POST', '/api/freelance', {
      token: adminToken,
      fields: { ...BASE_FIELDS, utilisateur: 'bad-id' },
    });
    assert.equal(r.status, 400);
  });

  it('POST utilisateur inexistant → 404', async () => {
    const r = await requestMultipart('POST', '/api/freelance', {
      token: adminToken,
      fields: { ...BASE_FIELDS, utilisateur: FAKE_ID },
    });
    assert.equal(r.status, 404);
  });

  it('POST doublon même utilisateur → 409', async () => {
    await requestMultipart('POST', '/api/freelance', {
      token: adminToken,
      fields: { ...BASE_FIELDS, utilisateur: String(clientUser._id) },
    });
    const r = await requestMultipart('POST', '/api/freelance', {
      token: adminToken,
      fields: { ...BASE_FIELDS, name: 'Dup', utilisateur: String(clientUser._id) },
    });
    assert.equal(r.status, 409);
  });

  it('POST fichier MIME interdit → 400', async () => {
    const fd = new FormData();
    fd.append('utilisateur', String(clientUser._id));
    Object.entries(BASE_FIELDS).forEach(([k, v]) => fd.append(k, v));
    fd.append('cni1', new Blob(['not-image'], { type: 'text/plain' }), 'bad.txt');
    const res = await fetch(`${baseUrl}/api/freelance`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: fd,
    });
    assert.equal(res.status, 400);
  });

  it('GET liste sans URL KYC ni cld:auth', async () => {
    await requestMultipart('POST', '/api/freelance', {
      token: adminToken,
      fields: { ...BASE_FIELDS, location: 'DASH8B_LIST', utilisateur: String(clientUser._id) },
      files: { cni1: 'c1.png' },
    });
    const r = await requestJson('GET', '/api/freelance?page=1&limit=50', { token: adminToken });
    assert.equal(r.status, 200);
    const blob = JSON.stringify(r.json);
    assert.doesNotMatch(blob, /cld:auth:/);
    const first = r.json.freelances[0];
    assert.equal(typeof first.verificationDocuments.cni1, 'boolean');
  });

  it('PUT sans nouveau KYC conserve les documents', async () => {
    const created = await requestMultipart('POST', '/api/freelance', {
      token: adminToken,
      fields: { ...BASE_FIELDS, location: 'DASH8B_PUT', utilisateur: String(clientUser._id) },
      files: { cni1: 'c1.png', cni2: 'c2.png' },
    });
    assert.equal(created.status, 201);
    const id = created.json._id;
    const before = await freelanceModel.findById(id);
    const r = await requestMultipart('PUT', `/api/freelance/${id}`, {
      token: adminToken,
      fields: { location: 'DASH8B_PUT_UPD', hourlyRate: '6000' },
    });
    assert.equal(r.status, 200);
    const after = await freelanceModel.findById(id);
    assert.equal(after.verificationDocuments.cni1, before.verificationDocuments.cni1);
    assert.equal(after.verificationDocuments.cni2, before.verificationDocuments.cni2);
  });

  it('PUT remplace cni1 après succès', async () => {
    const created = await requestMultipart('POST', '/api/freelance', {
      token: adminToken,
      fields: { ...BASE_FIELDS, location: 'DASH8B_REP', utilisateur: String(clientUser._id) },
      files: { cni1: 'old.png' },
    });
    const id = created.json._id;
    const before = await freelanceModel.findById(id);
    const oldRef = before.verificationDocuments.cni1;
    const r = await requestMultipart('PUT', `/api/freelance/${id}`, {
      token: adminToken,
      fields: { location: 'DASH8B_REP' },
      files: { cni1: 'new.png' },
    });
    assert.equal(r.status, 200);
    const after = await freelanceModel.findById(id);
    assert.notEqual(after.verificationDocuments.cni1, oldRef);
    assert.match(String(after.verificationDocuments.cni1), /^cld:auth:/);
  });

  it('PUT ID invalide → 400 sans Cloudinary', async () => {
    const before = cloudinaryUploadCallCount();
    const r = await requestMultipart('PUT', '/api/freelance/not-valid', {
      token: adminToken,
      fields: { location: 'X' },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 400);
    assert.equal(cloudinaryUploadCallCount(), before);
  });

  it('PUT inexistant → 404 sans Cloudinary', async () => {
    const before = cloudinaryUploadCallCount();
    const r = await requestMultipart('PUT', `/api/freelance/${FAKE_ID}`, {
      token: adminToken,
      fields: { location: 'X' },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 404);
    assert.equal(cloudinaryUploadCallCount(), before);
  });

  it('PUT non propriétaire → 403 sans Cloudinary', async () => {
    const created = await requestMultipart('POST', '/api/freelance', {
      token: adminToken,
      fields: { ...BASE_FIELDS, location: 'DASH8B_OWN', utilisateur: String(clientUser._id) },
    });
    const before = cloudinaryUploadCallCount();
    const r = await requestMultipart('PUT', `/api/freelance/${created.json._id}`, {
      token: client2Token,
      fields: { location: 'Hack' },
      files: { cni1: 'x.png' },
    });
    assert.equal(r.status, 403);
    assert.equal(cloudinaryUploadCallCount(), before);
  });

  it('GET pending/list client → 403', async () => {
    const r = await requestJson('GET', '/api/freelance/pending/list', { token: clientToken });
    assert.equal(r.status, 403);
  });

  it('GET pending/list admin — booléens KYC, pas d’URL', async () => {
    await freelanceModel.create({
      utilisateur: clientUser._id,
      name: 'Pending FL',
      job: 'Designer',
      category: 'Créa',
      location: 'DASH8B_PENDING',
      hourlyRate: 4000,
      status: 'pending',
      verificationDocuments: {
        cni1: 'cld:auth:freelances/cni/test',
        cni2: 'https://res.cloudinary.com/demo/old/cni.jpg',
        selfie: '',
        isVerified: false,
      },
    });
    const r = await requestJson('GET', '/api/freelance/pending/list', { token: adminToken });
    assert.equal(r.status, 200);
    assertFreelancePendingListHasNoDocumentLeak(r.json);
    const row = r.json.find((x) => x.location === 'DASH8B_PENDING');
    assert.ok(row);
    assert.equal(row.kyc.cniRectoPresent, true);
    assert.equal(row.kyc.legacyDocumentDetected, true);
    assert.equal(typeof row.identite.nom, 'string');
  });
});
