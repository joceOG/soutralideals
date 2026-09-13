/**
 * R1-07 — PATCH + POST resubmit FieldRecensement
 * TDD : exécuté avant implémentation (404 attendus).
 */
import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import cloudinary from 'cloudinary';

import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import Utilisateur from '../models/utilisateurModel.js';
import FieldRecensement from '../models/fieldRecensementModel.js';
import FieldRecensementOperation from '../models/fieldRecensementOperationModel.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import fieldRecensementV1Router from '../routes/fieldRecensementV1Routes.js';
import {
  enableFieldRecensementV1ForTests,
  TEST_FIELD_APP_BUILD,
} from './helpers/fieldRecensementV1TestEnv.js';

const SECRET = 'r1-field-corr-test-secret-min-32chars!!';
const MUT = '550e8400-e29b-41d4-a716-446655440700';

let server;
let baseUrl;
let agentA;
let agentB;
let tokenA;
let tokenB;
let adminUser;
let adminToken;
let fakeAdmin;
let fakeAdminToken;
let revoked;
let revokedToken;
let serviceId;
let serviceCategorieId;
let freelanceCategoryId;
/** @type {Array<object>} */
let uploadCalls = [];
/** @type {Array<object>} */
let destroyCalls = [];

function issueToken(userId, role = 'Client') {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, {
    expiresIn: '1h',
  });
}

function miniJpeg(bytes = [0xff, 0xd8, 0xff, 0xd9]) {
  const p = path.join(os.tmpdir(), `fr-corr-${crypto.randomBytes(6).toString('hex')}.jpg`);
  fs.writeFileSync(p, Buffer.from(bytes));
  return p;
}

function opMut(n) {
  return `550e8400-e29b-41d4-a716-44665545${String(n).padStart(4, '0')}`;
}

function assertNoSecrets(body) {
  const s = JSON.stringify(body);
  assert.ok(!s.includes('matchedUtilisateurId'));
  assert.ok(!s.includes('requestHash'));
  assert.ok(!s.includes('currentContentHash'));
  assert.ok(!s.includes('cld:auth:'));
  assert.ok(!s.includes('publicId'));
  assert.ok(!/"kyc"\s*:/.test(s) || !s.includes('cni_recto'));
}

async function parseRes(res) {
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

async function patchJson(id, payload, { token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-App-Build'] = String(TEST_FIELD_APP_BUILD);
  }
  const res = await fetch(`${baseUrl}/field-recensements/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });
  return parseRes(res);
}

async function patchMultipart(id, payload, { token, filePath } = {}) {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  if (filePath) {
    const buf = fs.readFileSync(filePath);
    form.append('profilePhoto', new Blob([buf], { type: 'image/jpeg' }), path.basename(filePath));
  }
  const headers = {};
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-App-Build'] = String(TEST_FIELD_APP_BUILD);
  }
  const res = await fetch(`${baseUrl}/field-recensements/${id}`, {
    method: 'PATCH',
    headers,
    body: form,
  });
  return parseRes(res);
}

async function resubmit(id, payload, { token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-App-Build'] = String(TEST_FIELD_APP_BUILD);
  }
  const res = await fetch(`${baseUrl}/field-recensements/${id}/resubmit`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parseRes(res);
}

async function seedCatalog() {
  const gId = new mongoose.Types.ObjectId();
  serviceCategorieId = new mongoose.Types.ObjectId();
  serviceId = new mongoose.Types.ObjectId();
  freelanceCategoryId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('groupes').insertOne({
    _id: gId,
    nomgroupe: 'TestGroupe',
  });
  await mongoose.connection.collection('categories').insertMany([
    {
      _id: serviceCategorieId,
      nomcategorie: 'Bâtiment',
      imagecategorie: 'x.jpg',
      groupe: gId,
    },
    {
      _id: freelanceCategoryId,
      nomcategorie: 'Design',
      imagecategorie: 'x.jpg',
      groupe: gId,
    },
  ]);
  await mongoose.connection.collection('services').insertOne({
    _id: serviceId,
    nomservice: 'Plomberie',
    categorie: serviceCategorieId,
  });
}

function baseNeedsCorrection(overrides = {}) {
  const tel =
    overrides.person?.telephone ||
    `+2250700${String(crypto.randomInt(100000, 999999))}`;
  const base = {
    schemaVersion: 1,
    clientMutationId: MUT,
    requestHash: 'initialrequesthash'.padEnd(64, '0'),
    currentContentHash: 'initialcontenthash'.padEnd(64, 'a'),
    revision: 2,
    professionalType: 'prestataire',
    reviewStatus: 'needs_correction',
    publicationStatus: 'not_started',
    ingestionStatus: 'completed',
    person: {
      nom: 'Kouassi',
      prenoms: 'Awa',
      telephone: tel,
    },
    business: {
      serviceId,
      description: 'Ancienne description',
      tarifDeclareMin: 1000,
      tarifDeclareMax: 5000,
    },
    location: {
      commune: 'Cocody',
      quartier: 'Angré',
      latitude: 5.35,
      longitude: -4.0,
    },
    consent: {
      recensementAccepted: true,
      textVersion: 'ci-fr-2026-09',
      acceptedAt: new Date('2026-09-01T09:59:00.000Z'),
    },
    app: { version: '1.0.0', buildNumber: 12, installationId: 'inst' },
    timing: {
      recordedAt: new Date('2026-09-01T10:00:00.000Z'),
      serverReceivedAt: new Date('2026-09-01T10:00:01.000Z'),
    },
    media: {
      profilePhoto: {
        ref: 'cld:auth:field/old',
        publicId: 'field/old',
        kind: 'profile_pending_private',
        sha256: 'oldsha',
      },
    },
    correction: {
      reasonCode: 'PHOTO_UNCLEAR',
      message: 'Reprendre la photo.',
      fields: ['business.description', 'profilePhoto'],
      requestedAt: new Date('2026-09-02T10:00:00.000Z'),
      addressedFields: [],
    },
  };
  const merged = { ...base, ...overrides };
  merged.person = { ...base.person, ...(overrides.person || {}) };
  if (!merged.person.telephone) merged.person.telephone = tel;
  merged.business = { ...base.business, ...(overrides.business || {}) };
  if (!merged.business.serviceId && merged.professionalType === 'prestataire') {
    merged.business.serviceId = serviceId;
  }
  merged.location = { ...base.location, ...(overrides.location || {}) };
  merged.consent = { ...base.consent, ...(overrides.consent || {}) };
  merged.correction = { ...base.correction, ...(overrides.correction || {}) };
  return merged;
}

async function createDoc(recenseur, overrides = {}) {
  const doc = await FieldRecensement.create({
    ...baseNeedsCorrection(overrides),
    recenseur,
  });
  // ensure select:false fields persisted
  await FieldRecensement.collection.updateOne(
    { _id: doc._id },
    {
      $set: {
        requestHash: overrides.requestHash || 'initialrequesthash'.padEnd(64, '0'),
        currentContentHash: overrides.currentContentHash || 'initialcontenthash'.padEnd(64, 'a'),
        'media.profilePhoto.ref':
          overrides.media?.profilePhoto?.ref || 'cld:auth:field/old',
        'media.profilePhoto.publicId':
          overrides.media?.profilePhoto?.publicId || 'field/old',
        'media.profilePhoto.sha256':
          overrides.media?.profilePhoto?.sha256 || 'oldsha',
      },
    },
  );
  return doc;
}

describe('R1-07 — PATCH + resubmit', () => {
  before(async () => {
    process.env.JWT_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
    enableFieldRecensementV1ForTests({ minBuild: 1 });
    await startIsolatedMongo();
    await seedCatalog();

    const app = express();
    app.use(express.json());
    app.use('/api/v1', fieldRecensementV1Router);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      res.status(status).json({
        success: false,
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Erreur',
        retryable: false,
      });
    });
    server = http.createServer(app);
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  });

  after(async () => {
    if (server) await new Promise((r) => server.close(r));
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    await seedCatalog();
    uploadCalls = [];
    destroyCalls = [];
    process.env.TEST_CLOUDINARY_FAIL = '0';
    process.env.TEST_PATCH_SAVE_FAIL = '0';
    mock.restoreAll();
    mock.method(cloudinary.v2.uploader, 'upload', async (_p, opts = {}) => {
      if (process.env.TEST_CLOUDINARY_FAIL === '1') {
        throw new Error('cloudinary fail');
      }
      uploadCalls.push({ opts });
      return { public_id: opts.public_id || 'field/new', secure_url: 'https://x' };
    });
    mock.method(cloudinary.v2.uploader, 'destroy', async (publicId, opts = {}) => {
      destroyCalls.push({ publicId, opts });
      return { result: 'ok' };
    });

    agentA = await Utilisateur.create({
      nom: 'Agent',
      prenom: 'A',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: true,
      telephone: '+2250700117001',
      telephoneVerified: true,
    });
    tokenA = issueToken(agentA._id);
    agentA.tokens = [{ token: tokenA }];
    await agentA.save();

    agentB = await Utilisateur.create({
      nom: 'Agent',
      prenom: 'B',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: true,
      telephone: '+2250700117002',
      telephoneVerified: true,
    });
    tokenB = issueToken(agentB._id);
    agentB.tokens = [{ token: tokenB }];
    await agentB.save();

    adminUser = await Utilisateur.create({
      nom: 'Admin',
      prenom: 'Real',
      password: 'Secret1a!!',
      role: 'Admin',
      canCreateRecensement: false,
      telephone: '+2250700117003',
      telephoneVerified: true,
    });
    adminToken = issueToken(adminUser._id, 'Admin');
    adminUser.tokens = [{ token: adminToken }];
    await adminUser.save();

    fakeAdmin = await Utilisateur.create({
      nom: 'Fake',
      prenom: 'Adm',
      password: 'Secret1a!!',
      role: 'Prestataire',
      canCreateRecensement: true,
      telephone: '+2250700117004',
      telephoneVerified: true,
    });
    fakeAdminToken = issueToken(fakeAdmin._id, 'Admin');
    fakeAdmin.tokens = [{ token: fakeAdminToken }];
    await fakeAdmin.save();

    revoked = await Utilisateur.create({
      nom: 'Rev',
      prenom: 'X',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: false,
      telephone: '+2250700117005',
      telephoneVerified: true,
    });
    revokedToken = issueToken(revoked._id);
    revoked.tokens = [{ token: revokedToken }];
    await revoked.save();
  });

  // —— Auth / authz PATCH ——
  it('P1 anonyme → 401', async () => {
    const id = new mongoose.Types.ObjectId();
    const r = await patchJson(id, {
      operationMutationId: opMut(1),
      expectedRevision: 2,
      changes: { 'business.description': 'x' },
    });
    assert.equal(r.status, 401);
  });

  it('P2 JWT invalide → 401', async () => {
    const id = new mongoose.Types.ObjectId();
    const r = await patchJson(
      id,
      { operationMutationId: opMut(2), expectedRevision: 2, changes: {} },
      { token: 'bad' },
    );
    assert.equal(r.status, 401);
  });

  it('P3 agent révoqué → 403', async () => {
    const doc = await createDoc(revoked._id);
    const r = await patchJson(
      doc._id,
      {
        operationMutationId: opMut(3),
        expectedRevision: 2,
        changes: { 'business.description': 'N' },
      },
      { token: revokedToken },
    );
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'RECENSEUR_PERMISSION_REVOKED');
  });

  it('P4 propriétaire needs_correction → succès', async () => {
    const doc = await createDoc(agentA._id, {
      correction: {
        reasonCode: 'DESC',
        message: 'm',
        fields: ['business.description'],
        requestedAt: new Date(),
        addressedFields: [],
      },
    });
    const r = await patchJson(
      doc._id,
      {
        operationMutationId: opMut(4),
        expectedRevision: 2,
        changes: { 'business.description': 'Nouvelle description' },
      },
      { token: tokenA },
    );
    assert.equal(r.status, 200);
    assert.equal(r.body.code, 'RECENSEMENT_UPDATED');
    assert.equal(r.body.data.id, String(doc._id));
    assert.equal(r.body.data.revision, 3);
    assert.equal(r.body.data.reviewStatus, 'needs_correction');
    assertNoSecrets(r.body);
  });

  it('P5 autre agent → 404', async () => {
    const doc = await createDoc(agentA._id);
    const r = await patchJson(
      doc._id,
      {
        operationMutationId: opMut(5),
        expectedRevision: 2,
        changes: { 'business.description': 'x' },
      },
      { token: tokenB },
    );
    assert.equal(r.status, 404);
    assert.equal(r.body.code, 'RECENSEMENT_NOT_FOUND');
  });

  it('P6 faux admin → 404', async () => {
    const doc = await createDoc(agentA._id);
    const r = await patchJson(
      doc._id,
      {
        operationMutationId: opMut(6),
        expectedRevision: 2,
        changes: { 'business.description': 'x' },
      },
      { token: fakeAdminToken },
    );
    assert.equal(r.status, 404);
  });

  it('P7 admin réel non propriétaire → 403 RECENSEMENT_FORBIDDEN', async () => {
    const doc = await createDoc(agentA._id);
    const r = await patchJson(
      doc._id,
      {
        operationMutationId: opMut(7),
        expectedRevision: 2,
        changes: { 'business.description': 'x' },
      },
      { token: adminToken },
    );
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'RECENSEMENT_FORBIDDEN');
  });

  it('P8-10 états invalides → 409', async () => {
    const states = [
      ['pending_review', 801],
      ['approved', 802],
      ['rejected', 803],
      ['suspended', 804],
    ];
    for (const [st, n] of states) {
      const doc = await createDoc(agentA._id, {
        clientMutationId: opMut(n),
        reviewStatus: st,
        correction: {
          reasonCode: 'X',
          message: 'm',
          fields: ['business.description'],
          requestedAt: new Date(),
        },
      });
      const r = await patchJson(
        doc._id,
        {
          operationMutationId: opMut(n + 10),
          expectedRevision: 2,
          changes: { 'business.description': 'x' },
        },
        { token: tokenA },
      );
      assert.equal(r.status, 409, st);
      assert.equal(r.body.code, 'RECENSEMENT_INVALID_STATE');
    }
  });

  it('P11-12 id invalide / absent', async () => {
    const bad = await patchJson(
      'not-an-id',
      {
        operationMutationId: opMut(11),
        expectedRevision: 1,
        changes: { 'business.description': 'x' },
      },
      { token: tokenA },
    );
    assert.equal(bad.status, 400);
    assert.equal(bad.body.code, 'RECENSEMENT_ID_INVALID');

    const missing = await patchJson(
      new mongoose.Types.ObjectId(),
      {
        operationMutationId: opMut(12),
        expectedRevision: 1,
        changes: { 'business.description': 'x' },
      },
      { token: tokenA },
    );
    assert.equal(missing.status, 404);
  });

  it('P13-17 champs autorisés / interdits / pollution', async () => {
    const doc = await createDoc(agentA._id, {
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: ['business.description'],
        requestedAt: new Date(),
      },
    });
    const ok = await patchJson(
      doc._id,
      {
        operationMutationId: opMut(13),
        expectedRevision: 2,
        changes: { 'business.description': 'OK desc' },
      },
      { token: tokenA },
    );
    assert.equal(ok.status, 200);

    const doc2 = await createDoc(agentA._id, {
      clientMutationId: opMut(140),
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: ['business.description'],
        requestedAt: new Date(),
      },
    });
    const notAsked = await patchJson(
      doc2._id,
      {
        operationMutationId: opMut(14),
        expectedRevision: 2,
        changes: { 'person.nom': 'Autre' },
      },
      { token: tokenA },
    );
    assert.ok([400, 403].includes(notAsked.status));
    assert.equal(notAsked.body.code, 'RECENSEMENT_CORRECTION_FIELD_FORBIDDEN');

    const inject = await patchJson(
      doc2._id,
      {
        operationMutationId: opMut(15),
        expectedRevision: 2,
        changes: {
          'business.description': 'x',
          reviewStatus: 'approved',
        },
      },
      { token: tokenA },
    );
    assert.equal(inject.status, 400);

    const dollar = await patchJson(
      doc2._id,
      {
        operationMutationId: opMut(16),
        expectedRevision: 2,
        changes: { $set: { 'business.description': 'x' } },
      },
      { token: tokenA },
    );
    assert.equal(dollar.status, 400);

    const proto = await patchJson(
      doc2._id,
      {
        operationMutationId: opMut(17),
        expectedRevision: 2,
        changes: { '__proto__.polluted': true, 'business.description': 'x' },
      },
      { token: tokenA },
    );
    assert.equal(proto.status, 400);
  });

  it('P18-21 validation métier après fusion', async () => {
    const doc = await createDoc(agentA._id, {
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: [
          'business.serviceId',
          'business.categoryId',
          'location.latitude',
          'business.tarifDeclareMin',
          'business.tarifDeclareMax',
        ],
        requestedAt: new Date(),
      },
    });

    const badSvc = await patchJson(
      doc._id,
      {
        operationMutationId: opMut(18),
        expectedRevision: 2,
        changes: { 'business.serviceId': new mongoose.Types.ObjectId().toString() },
      },
      { token: tokenA },
    );
    assert.equal(badSvc.status, 400);

    const freelance = await createDoc(agentA._id, {
      clientMutationId: opMut(190),
      professionalType: 'freelance',
      business: {
        displayName: 'A',
        jobTitle: 'J',
        categoryId: freelanceCategoryId,
      },
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: ['business.categoryId'],
        requestedAt: new Date(),
      },
    });
    const badCat = await patchJson(
      freelance._id,
      {
        operationMutationId: opMut(19),
        expectedRevision: 2,
        changes: { 'business.categoryId': new mongoose.Types.ObjectId().toString() },
      },
      { token: tokenA },
    );
    assert.equal(badCat.status, 400);

    const gpsDoc = await createDoc(agentA._id, {
      clientMutationId: opMut(200),
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: ['location.latitude'],
        requestedAt: new Date(),
      },
    });
    const badGps = await patchJson(
      gpsDoc._id,
      {
        operationMutationId: opMut(20),
        expectedRevision: 2,
        changes: { 'location.latitude': 99 },
      },
      { token: tokenA },
    );
    assert.equal(badGps.status, 400);

    const tarifDoc = await createDoc(agentA._id, {
      clientMutationId: opMut(210),
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: ['business.tarifDeclareMin', 'business.tarifDeclareMax'],
        requestedAt: new Date(),
      },
    });
    const badTarif = await patchJson(
      tarifDoc._id,
      {
        operationMutationId: opMut(21),
        expectedRevision: 2,
        changes: {
          'business.tarifDeclareMin': 9000,
          'business.tarifDeclareMax': 1000,
        },
      },
      { token: tokenA },
    );
    assert.equal(badTarif.status, 400);
  });

  it('P22-26 révision + idempotence + concurrence', async () => {
    const doc = await createDoc(agentA._id, {
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: ['business.description'],
        requestedAt: new Date(),
      },
    });
    const payload = {
      operationMutationId: opMut(22),
      expectedRevision: 2,
      changes: { 'business.description': 'Rev OK' },
    };
    const ok = await patchJson(doc._id, payload, { token: tokenA });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.revision, 3);

    const stale = await patchJson(
      doc._id,
      {
        operationMutationId: opMut(23),
        expectedRevision: 2,
        changes: { 'business.description': 'Stale' },
      },
      { token: tokenA },
    );
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, 'RECENSEMENT_REVISION_CONFLICT');

    const replay = await patchJson(doc._id, payload, { token: tokenA });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.code, 'RECENSEMENT_ALREADY_APPLIED');
    assert.equal(replay.body.data.revision, 3);

    const reuse = await patchJson(
      doc._id,
      {
        operationMutationId: opMut(22),
        expectedRevision: 3,
        changes: { 'business.description': 'Autre contenu' },
      },
      { token: tokenA },
    );
    assert.equal(reuse.status, 409);
    assert.equal(reuse.body.code, 'IDEMPOTENCY_KEY_REUSED');

    const docC = await createDoc(agentA._id, {
      clientMutationId: opMut(240),
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: ['business.description'],
        requestedAt: new Date(),
      },
    });
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        patchJson(
          docC._id,
          {
            operationMutationId: opMut(250 + i),
            expectedRevision: 2,
            changes: { 'business.description': `Conc ${i}` },
          },
          { token: tokenA },
        ),
      ),
    );
    const success = results.filter((r) => r.status === 200);
    const conflicts = results.filter((r) => r.status === 409);
    assert.equal(success.length, 1);
    assert.equal(conflicts.length, 7);
    assert.equal(await FieldRecensement.countDocuments({ _id: docC._id }), 1);
    const after = await FieldRecensement.findById(docC._id);
    assert.equal(after.revision, 3);
  });

  it('P27-32 immuables / hashes / pas de création', async () => {
    const usersBefore = await Utilisateur.countDocuments();
    const pBefore = await prestataireModel.countDocuments();
    const fBefore = await freelanceModel.countDocuments();
    const vBefore = await vendeurModel.countDocuments();
    const docsBefore = await FieldRecensement.countDocuments();

    const doc = await createDoc(agentA._id, {
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: ['business.description'],
        requestedAt: new Date(),
      },
    });
    const before = await FieldRecensement.findById(doc._id)
      .select('+requestHash +currentContentHash')
      .lean();

    const r = await patchJson(
      doc._id,
      {
        operationMutationId: opMut(27),
        expectedRevision: 2,
        changes: { 'business.description': 'Hash change' },
      },
      { token: tokenA },
    );
    assert.equal(r.status, 200);
    const after = await FieldRecensement.findById(doc._id)
      .select('+requestHash +currentContentHash +media.profilePhoto.ref')
      .lean();
    assert.equal(String(after._id), String(before._id));
    assert.equal(after.clientMutationId, before.clientMutationId);
    assert.equal(after.requestHash, before.requestHash);
    assert.notEqual(after.currentContentHash, before.currentContentHash);
    assert.equal(after.publicationStatus, 'not_started');
    assert.equal(await FieldRecensement.countDocuments(), docsBefore + 1);
    assert.equal(await Utilisateur.countDocuments(), usersBefore);
    assert.equal(await prestataireModel.countDocuments(), pBefore);
    assert.equal(await freelanceModel.countDocuments(), fBefore);
    assert.equal(await vendeurModel.countDocuments(), vBefore);
    assertNoSecrets(r.body);
  });

  // —— Photo ——
  it('PH1-10 remplacement photo', async () => {
    const docNoPhotoField = await createDoc(agentA._id, {
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: ['business.description'],
        requestedAt: new Date(),
      },
    });
    const photo = miniJpeg();
    try {
      const refuse = await patchMultipart(
        docNoPhotoField._id,
        {
          operationMutationId: opMut(31),
          expectedRevision: 2,
          changes: { 'business.description': 'x' },
        },
        { token: tokenA, filePath: photo },
      );
      assert.ok([400, 403].includes(refuse.status));

      const doc = await createDoc(agentA._id, {
        clientMutationId: opMut(320),
        correction: {
          reasonCode: 'X',
          message: 'm',
          fields: ['profilePhoto'],
          requestedAt: new Date(),
        },
      });
      const before = await FieldRecensement.findById(doc._id)
        .select('+currentContentHash +media.profilePhoto.ref +media.profilePhoto.publicId')
        .lean();

      const ok = await patchMultipart(
        doc._id,
        { operationMutationId: opMut(32), expectedRevision: 2, changes: {} },
        { token: tokenA, filePath: photo },
      );
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.equal(ok.body.data.profilePhoto?.present, true);
      assert.equal(ok.body.data.profilePhoto?.status, 'private_pending');
      assertNoSecrets(ok.body);
      const mid = await FieldRecensement.findById(doc._id)
        .select('+currentContentHash +media.profilePhoto.ref +media.profilePhoto.publicId +media.profilePhoto.sha256')
        .lean();
      assert.ok(String(mid.media.profilePhoto.ref).startsWith('cld:auth:'));
      assert.notEqual(mid.currentContentHash, before.currentContentHash);
      assert.notEqual(mid.media.profilePhoto.publicId, before.media.profilePhoto.publicId);

      const photo2 = miniJpeg([0xff, 0xd8, 0xff, 0xd9, 0xaa]);
      try {
        const diff = await patchMultipart(
          doc._id,
          { operationMutationId: opMut(33), expectedRevision: 3, changes: {} },
          { token: tokenA, filePath: photo2 },
        );
        assert.equal(diff.status, 200);
        const afterDiff = await FieldRecensement.findById(doc._id)
          .select('+currentContentHash')
          .lean();
        assert.notEqual(afterDiff.currentContentHash, mid.currentContentHash);
      } finally {
        fs.unlinkSync(photo2);
      }

      // même contenu, nom différent → même hash logique (rejeu autre op)
      const sameBytes = miniJpeg();
      const sameBytes2 = path.join(os.tmpdir(), `other-name-${Date.now()}.jpg`);
      fs.copyFileSync(sameBytes, sameBytes2);
      try {
        const docH = await createDoc(agentA._id, {
          clientMutationId: opMut(340),
          correction: {
            reasonCode: 'X',
            message: 'm',
            fields: ['profilePhoto'],
            requestedAt: new Date(),
          },
        });
        const a = await patchMultipart(
          docH._id,
          { operationMutationId: opMut(34), expectedRevision: 2, changes: {} },
          { token: tokenA, filePath: sameBytes },
        );
        assert.equal(a.status, 200);
        const h1 = (
          await FieldRecensement.findById(docH._id).select('+currentContentHash').lean()
        ).currentContentHash;
        // second patch needs new revision + field still allowed
        const b = await patchMultipart(
          docH._id,
          { operationMutationId: opMut(35), expectedRevision: 3, changes: {} },
          { token: tokenA, filePath: sameBytes2 },
        );
        assert.equal(b.status, 200);
        const h2 = (
          await FieldRecensement.findById(docH._id).select('+currentContentHash').lean()
        ).currentContentHash;
        assert.equal(h1, h2);
      } finally {
        fs.unlinkSync(sameBytes);
        fs.unlinkSync(sameBytes2);
      }

      process.env.TEST_CLOUDINARY_FAIL = '1';
      const docFail = await createDoc(agentA._id, {
        clientMutationId: opMut(360),
        correction: {
          reasonCode: 'X',
          message: 'm',
          fields: ['profilePhoto'],
          requestedAt: new Date(),
        },
      });
      const beforeFail = await FieldRecensement.findById(docFail._id)
        .select('+media.profilePhoto.ref +revision')
        .lean();
      const failPhoto = miniJpeg();
      try {
        const fail = await patchMultipart(
          docFail._id,
          { operationMutationId: opMut(36), expectedRevision: 2, changes: {} },
          { token: tokenA, filePath: failPhoto },
        );
        assert.ok(fail.status >= 400);
        const afterFail = await FieldRecensement.findById(docFail._id)
          .select('+media.profilePhoto.ref +revision')
          .lean();
        assert.equal(afterFail.revision, beforeFail.revision);
        assert.equal(afterFail.media.profilePhoto.ref, beforeFail.media.profilePhoto.ref);
      } finally {
        if (fs.existsSync(failPhoto)) fs.unlinkSync(failPhoto);
        process.env.TEST_CLOUDINARY_FAIL = '0';
      }

      process.env.TEST_PATCH_SAVE_FAIL = '1';
      const docSave = await createDoc(agentA._id, {
        clientMutationId: opMut(370),
        correction: {
          reasonCode: 'X',
          message: 'm',
          fields: ['profilePhoto'],
          requestedAt: new Date(),
        },
      });
      const beforeSave = await FieldRecensement.findById(docSave._id)
        .select('+media.profilePhoto.ref +media.profilePhoto.publicId +revision')
        .lean();
      const savePhoto = miniJpeg([0xff, 0xd8, 0x01, 0xd9]);
      try {
        const saveFail = await patchMultipart(
          docSave._id,
          { operationMutationId: opMut(37), expectedRevision: 2, changes: {} },
          { token: tokenA, filePath: savePhoto },
        );
        assert.ok(saveFail.status >= 400);
        const afterSave = await FieldRecensement.findById(docSave._id)
          .select('+media.profilePhoto.ref +media.profilePhoto.publicId +revision')
          .lean();
        assert.equal(afterSave.revision, beforeSave.revision);
        assert.equal(afterSave.media.profilePhoto.ref, beforeSave.media.profilePhoto.ref);
      } finally {
        if (fs.existsSync(savePhoto)) fs.unlinkSync(savePhoto);
        process.env.TEST_PATCH_SAVE_FAIL = '0';
      }

      // rejeu photo → une seule nouvelle active
      const docReplay = await createDoc(agentA._id, {
        clientMutationId: opMut(380),
        correction: {
          reasonCode: 'X',
          message: 'm',
          fields: ['profilePhoto'],
          requestedAt: new Date(),
        },
      });
      const rp = miniJpeg([0xff, 0xd8, 0x02, 0xd9]);
      try {
        uploadCalls = [];
        const p = {
          operationMutationId: opMut(38),
          expectedRevision: 2,
          changes: {},
        };
        const r1 = await patchMultipart(docReplay._id, p, { token: tokenA, filePath: rp });
        assert.equal(r1.status, 200);
        const uploadsAfterFirst = uploadCalls.length;
        const r2 = await patchMultipart(docReplay._id, p, { token: tokenA, filePath: rp });
        assert.equal(r2.status, 200);
        assert.equal(uploadCalls.length, uploadsAfterFirst);
        const final = await FieldRecensement.findById(docReplay._id)
          .select('+media.profilePhoto.publicId')
          .lean();
        assert.ok(final.media.profilePhoto.publicId);
        assert.ok(!String(final.media.profilePhoto.publicId).startsWith('http'));
      } finally {
        if (fs.existsSync(rp)) fs.unlinkSync(rp);
      }
    } finally {
      if (fs.existsSync(photo)) fs.unlinkSync(photo);
    }
  });

  // —— Resubmit ——
  it('R1-15 resubmit parcours', async () => {
    const doc = await createDoc(agentA._id, {
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: ['business.description', 'profilePhoto'],
        requestedAt: new Date(),
        addressedFields: [],
      },
    });
    // corriger les deux champs
    await patchJson(
      doc._id,
      {
        operationMutationId: opMut(41),
        expectedRevision: 2,
        changes: { 'business.description': 'Corrigée' },
      },
      { token: tokenA },
    );
    const ph = miniJpeg([0xff, 0xd8, 0x03, 0xd9]);
    try {
      await patchMultipart(
        doc._id,
        { operationMutationId: opMut(42), expectedRevision: 3, changes: {} },
        { token: tokenA, filePath: ph },
      );

      const other = await resubmit(
        doc._id,
        { operationMutationId: opMut(43), expectedRevision: 4 },
        { token: tokenB },
      );
      assert.equal(other.status, 404);

      const rev = await resubmit(
        doc._id,
        { operationMutationId: opMut(44), expectedRevision: 4 },
        { token: revokedToken },
      );
      assert.equal(rev.status, 403);

      const pendingDoc = await createDoc(agentA._id, {
        clientMutationId: opMut(450),
        reviewStatus: 'pending_review',
        correction: {
          reasonCode: 'X',
          message: 'm',
          fields: ['business.description'],
          requestedAt: new Date(),
          addressedFields: ['business.description'],
        },
      });
      const badState = await resubmit(
        pendingDoc._id,
        { operationMutationId: opMut(45), expectedRevision: 2 },
        { token: tokenA },
      );
      assert.equal(badState.status, 409);

      const incomplete = await createDoc(agentA._id, {
        clientMutationId: opMut(460),
        correction: {
          reasonCode: 'X',
          message: 'm',
          fields: ['business.description', 'profilePhoto'],
          requestedAt: new Date(),
          addressedFields: ['business.description'],
        },
      });
      const miss = await resubmit(
        incomplete._id,
        { operationMutationId: opMut(46), expectedRevision: 2 },
        { token: tokenA },
      );
      assert.ok([400, 409].includes(miss.status));
      assert.equal(miss.body.code, 'RECENSEMENT_CORRECTION_INCOMPLETE');

      const noMedia = await createDoc(agentA._id, {
        clientMutationId: opMut(470),
        media: {},
        correction: {
          reasonCode: 'X',
          message: 'm',
          fields: ['profilePhoto'],
          requestedAt: new Date(),
          addressedFields: ['profilePhoto'],
        },
      });
      await FieldRecensement.collection.updateOne(
        { _id: noMedia._id },
        { $unset: { 'media.profilePhoto': 1 } },
      );
      const missMedia = await resubmit(
        noMedia._id,
        { operationMutationId: opMut(47), expectedRevision: 2 },
        { token: tokenA },
      );
      assert.ok([400, 409].includes(missMedia.status));

      const usersBefore = await Utilisateur.countDocuments();
      const docsBefore = await FieldRecensement.countDocuments();
      const okBody = {
        operationMutationId: opMut(48),
        expectedRevision: 4,
      };
      const ok = await resubmit(doc._id, okBody, { token: tokenA });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.equal(ok.body.code, 'RECENSEMENT_RESUBMITTED');
      assert.equal(ok.body.data.id, String(doc._id));
      assert.equal(ok.body.data.reviewStatus, 'pending_review');
      assert.equal(ok.body.data.publicationStatus, 'not_started');
      assert.equal(ok.body.data.revision, 5);
      assertNoSecrets(ok.body);

      const after = await FieldRecensement.findById(doc._id).lean();
      assert.ok(after.correction?.resolvedAt || after.decisionHistory?.length);

      const replay = await resubmit(doc._id, okBody, { token: tokenA });
      assert.equal(replay.status, 200);
      assert.equal(replay.body.code, 'RECENSEMENT_ALREADY_APPLIED');
      assert.equal(replay.body.data.revision, 5);

      const reuse = await resubmit(
        doc._id,
        { operationMutationId: opMut(48), expectedRevision: 99 },
        { token: tokenA },
      );
      assert.equal(reuse.status, 409);
      assert.equal(reuse.body.code, 'IDEMPOTENCY_KEY_REUSED');

      assert.equal(await FieldRecensement.countDocuments(), docsBefore);
      assert.equal(await Utilisateur.countDocuments(), usersBefore);
      assert.equal(await prestataireModel.countDocuments(), 0);

      // concurrence
      const conc = await createDoc(agentA._id, {
        clientMutationId: opMut(490),
        revision: 2,
        correction: {
          reasonCode: 'X',
          message: 'm',
          fields: ['business.description'],
          requestedAt: new Date(),
          addressedFields: ['business.description'],
        },
      });
      const concResults = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          resubmit(
            conc._id,
            { operationMutationId: opMut(500 + i), expectedRevision: 2 },
            { token: tokenA },
          ),
        ),
      );
      const concOk = concResults.filter((r) => r.status === 200 && r.body.code === 'RECENSEMENT_RESUBMITTED');
      const concAlready = concResults.filter(
        (r) => r.status === 200 && r.body.code === 'RECENSEMENT_ALREADY_APPLIED',
      );
      const concConflict = concResults.filter((r) => r.status === 409);
      assert.equal(concOk.length + concAlready.length + concConflict.length, 10);
      assert.equal(
        concOk.filter((r) => r.body.data.revision === 3).length +
          (concAlready.length > 0 ? 0 : 0),
        concOk.length >= 1 ? concOk.length : 0,
      );
      const finalConc = await FieldRecensement.findById(conc._id);
      assert.equal(finalConc.reviewStatus, 'pending_review');
      assert.equal(finalConc.revision, 3);
      assert.equal(await FieldRecensement.countDocuments({ _id: conc._id }), 1);
    } finally {
      if (fs.existsSync(ph)) fs.unlinkSync(ph);
    }
  });

  it('R stale revision resubmit → 409', async () => {
    const doc = await createDoc(agentA._id, {
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: ['business.description'],
        requestedAt: new Date(),
        addressedFields: ['business.description'],
      },
    });
    const r = await resubmit(
      doc._id,
      { operationMutationId: opMut(60), expectedRevision: 1 },
      { token: tokenA },
    );
    assert.equal(r.status, 409);
    assert.equal(r.body.code, 'RECENSEMENT_REVISION_CONFLICT');
  });
});
