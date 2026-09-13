/**
 * R1-10 — Feature flag FIELD_RECENSEMENT_V1 + X-App-Build min.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import {
  loadFieldRecensementV1Config,
  parsePositiveBuildNumber,
  injectFieldRecensementV1Config,
  resetFieldRecensementV1Config,
  getFieldRecensementV1Config,
} from '../config/fieldRecensementV1Config.js';
import {
  enableFieldRecensementV1ForTests,
  disableFieldRecensementV1ForTests,
  TEST_FIELD_APP_BUILD,
} from './helpers/fieldRecensementV1TestEnv.js';
import Utilisateur from '../models/utilisateurModel.js';
import FieldRecensement from '../models/fieldRecensementModel.js';
import fieldRecensementV1Router from '../routes/fieldRecensementV1Routes.js';

const SECRET = 'r1-field-r110-test-secret-min-32chars!!';

describe('R1-10 — config fieldRecensementV1', () => {
  after(() => resetFieldRecensementV1Config());

  it('flag true + min build valide → enabled', () => {
    const cfg = loadFieldRecensementV1Config({
      FIELD_RECENSEMENT_V1: 'true',
      FIELD_RECENSEMENT_MIN_BUILD_ANDROID: '12',
    });
    assert.equal(cfg.enabled, true);
    assert.equal(cfg.minBuildAndroid, 12);
    assert.equal(cfg.configError, null);
  });

  it('flag false / absent / vide / inconnu → disabled (pas Boolean)', () => {
    for (const v of ['false', undefined, '', '  ', 'yes', 'on', '1', 'TRUE', 'False']) {
      const env = { FIELD_RECENSEMENT_V1: v, FIELD_RECENSEMENT_MIN_BUILD_ANDROID: '12' };
      if (v === undefined) delete env.FIELD_RECENSEMENT_V1;
      const cfg = loadFieldRecensementV1Config(env);
      assert.equal(cfg.enabled, false, `v=${v}`);
    }
  });

  it('flag true sans min build → fail-closed disabled', () => {
    const cfg = loadFieldRecensementV1Config({
      FIELD_RECENSEMENT_V1: 'true',
    });
    assert.equal(cfg.enabled, false);
    assert.ok(cfg.configError);
  });

  it('min build invalides refusés', () => {
    for (const m of ['0', '-4', '1.2', '12abc', '+12', '1e3', '']) {
      const cfg = loadFieldRecensementV1Config({
        FIELD_RECENSEMENT_V1: 'true',
        FIELD_RECENSEMENT_MIN_BUILD_ANDROID: m,
      });
      assert.equal(cfg.enabled, false, `min=${m}`);
    }
  });

  it('parsePositiveBuildNumber strict', () => {
    assert.equal(parsePositiveBuildNumber('12').ok, true);
    assert.equal(parsePositiveBuildNumber('12').value, 12);
    for (const bad of ['12abc', '1.2', '-4', '+12', '1e3', '0', '', 'NaN', null]) {
      assert.equal(parsePositiveBuildNumber(bad).ok, false, String(bad));
    }
  });

  it('injection isolée entre tests', () => {
    injectFieldRecensementV1Config({ enabled: true, minBuildAndroid: 5 });
    assert.equal(getFieldRecensementV1Config().minBuildAndroid, 5);
    injectFieldRecensementV1Config({ enabled: false, minBuildAndroid: null });
    assert.equal(getFieldRecensementV1Config().enabled, false);
    resetFieldRecensementV1Config();
  });
});

describe('R1-10 — HTTP flag + build', () => {
  let server;
  let baseUrl;
  let agent;
  let tokenAgent;
  let admin;
  let tokenAdmin;
  let fakeAdmin;
  let tokenFake;
  let serviceId;
  let tmpPhoto;

  function issueToken(userId, role = 'Client') {
    return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, {
      expiresIn: '1h',
    });
  }

  async function parseRes(res) {
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }
    return { status: res.status, body, headers: res.headers };
  }

  async function getMine({ token, build } = {}) {
    const headers = {};
    if (token !== undefined) headers.Authorization = `Bearer ${token}`;
    if (build !== undefined) headers['X-App-Build'] = String(build);
    return parseRes(await fetch(`${baseUrl}/field-recensements/mine`, { headers }));
  }

  async function postCreate({ token, build, payloadBuild, withPhoto = false } = {}) {
    const form = new FormData();
    const payload = {
      clientMutationId: '550e8400-e29b-41d4-a716-446655490001',
      operationMutationId: '550e8400-e29b-41d4-a716-446655490002',
      schemaVersion: 1,
      professionalType: 'prestataire',
      recordedAt: new Date().toISOString(),
      app: {
        version: '1.0.0',
        buildNumber: payloadBuild ?? (build != null ? Number(build) : 12),
        installationId: 'i',
      },
      person: { nom: 'K', prenoms: 'A', telephone: '+2250700112233' },
      business: {
        serviceId: String(serviceId),
        description: 'x',
        tarifDeclareMin: 1,
        tarifDeclareMax: 2,
      },
      location: { commune: 'Cocody', latitude: 5.3, longitude: -4 },
      consent: {
        recensementAccepted: true,
        textVersion: 'ci-fr-2026-09',
        acceptedAt: new Date().toISOString(),
      },
      metadata: {},
    };
    form.append('payload', JSON.stringify(payload));
    if (withPhoto && tmpPhoto) {
      const buf = fs.readFileSync(tmpPhoto);
      form.append('profilePhoto', new Blob([buf], { type: 'image/jpeg' }), 'p.jpg');
    }
    const headers = {};
    if (token !== undefined) headers.Authorization = `Bearer ${token}`;
    if (build !== undefined) headers['X-App-Build'] = String(build);
    return parseRes(
      await fetch(`${baseUrl}/field-recensements`, { method: 'POST', headers, body: form }),
    );
  }

  async function postAdmin(path, { token, build } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token !== undefined) headers.Authorization = `Bearer ${token}`;
    if (build !== undefined) headers['X-App-Build'] = String(build);
    return parseRes(
      await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          operationMutationId: '550e8400-e29b-41d4-a716-446655490099',
          expectedRevision: 1,
          reasonCode: 'OTHER',
        }),
      }),
    );
  }

  before(async () => {
    process.env.JWT_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
    process.env.TEST_CLOUDINARY_MOCK = '1';
    await startIsolatedMongo();

    tmpPhoto = path.join(os.tmpdir(), `r110-${Date.now()}.jpg`);
    fs.writeFileSync(tmpPhoto, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

    const app = express();
    app.use(express.json());
    app.use('/api/v1', fieldRecensementV1Router);
    app.use((err, _req, res, _next) => {
      res.status(err.status || 500).json({
        success: false,
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Erreur',
        retryable: err.retryable ?? false,
      });
    });
    server = http.createServer(app);
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  });

  after(async () => {
    try {
      fs.unlinkSync(tmpPhoto);
    } catch {
      /* ignore */
    }
    if (server) await new Promise((r) => server.close(r));
    await stopIsolatedMongo();
    resetFieldRecensementV1Config();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    const gId = new mongoose.Types.ObjectId();
    const catId = new mongoose.Types.ObjectId();
    serviceId = new mongoose.Types.ObjectId();
    await mongoose.connection.collection('groupes').insertOne({ _id: gId, nomgroupe: 'G' });
    await mongoose.connection.collection('categories').insertOne({
      _id: catId,
      nomcategorie: 'Batiment',
      imagecategorie: 'x.jpg',
      groupe: gId,
    });
    await mongoose.connection.collection('services').insertOne({
      _id: serviceId,
      nomservice: 'Plomberie',
      categorie: catId,
    });

    agent = await Utilisateur.create({
      nom: 'Agent',
      prenom: 'A',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: true,
      telephone: '+2250700130001',
      telephoneVerified: true,
    });
    tokenAgent = issueToken(agent._id);
    agent.tokens = [{ token: tokenAgent }];
    await agent.save();

    admin = await Utilisateur.create({
      nom: 'Admin',
      prenom: 'R',
      password: 'Secret1a!!',
      role: 'Admin',
      telephone: '+2250700130002',
      telephoneVerified: true,
    });
    tokenAdmin = issueToken(admin._id, 'Admin');
    admin.tokens = [{ token: tokenAdmin }];
    await admin.save();

    fakeAdmin = await Utilisateur.create({
      nom: 'Fake',
      prenom: 'A',
      password: 'Secret1a!!',
      role: 'Prestataire',
      canCreateRecensement: true,
      telephone: '+2250700130003',
      telephoneVerified: true,
    });
    tokenFake = issueToken(fakeAdmin._id, 'Admin');
    fakeAdmin.tokens = [{ token: tokenFake }];
    await fakeAdmin.save();
  });

  it('flag off → 503 FIELD_RECENSEMENT_V1_DISABLED ; anonyme → 401', async () => {
    disableFieldRecensementV1ForTests();
    const anon = await getMine({});
    assert.equal(anon.status, 401);

    const r = await getMine({ token: tokenAgent, build: 12 });
    assert.equal(r.status, 503);
    assert.equal(r.body.code, 'FIELD_RECENSEMENT_V1_DISABLED');
    assert.equal(r.body.retryable, true);
    assert.ok(r.headers.get('retry-after'));
    assert.equal(await FieldRecensement.countDocuments(), 0);
  });

  it('flag off + multipart → 503 sans dossier', async () => {
    disableFieldRecensementV1ForTests();
    const r = await postCreate({ token: tokenAgent, build: 12, withPhoto: true });
    assert.equal(r.status, 503);
    assert.equal(r.body.code, 'FIELD_RECENSEMENT_V1_DISABLED');
    assert.equal(await FieldRecensement.countDocuments(), 0);
  });

  it('build ancienne / absente / invalide → 426', async () => {
    enableFieldRecensementV1ForTests({ minBuild: 12 });
    const old = await getMine({ token: tokenAgent, build: 8 });
    assert.equal(old.status, 426);
    assert.equal(old.body.code, 'APP_VERSION_BLOCKED');
    assert.equal(old.body.retryable, false);
    assert.equal(old.body.details.minimumBuildNumber, 12);
    assert.equal(old.body.details.updateChannel, 'internal');

    const missing = await getMine({ token: tokenAgent });
    assert.equal(missing.status, 426);
    assert.equal(missing.body.details.reason, 'BUILD_HEADER_REQUIRED');

    for (const bad of ['12abc', '1.2', '-4', '+12', '1e3', '0']) {
      const r = await getMine({ token: tokenAgent, build: bad });
      assert.equal(r.status, 426, bad);
    }
  });

  it('build égale / supérieure OK ; mismatch payload → 400', async () => {
    enableFieldRecensementV1ForTests({ minBuild: 12 });
    const eq = await getMine({ token: tokenAgent, build: 12 });
    assert.equal(eq.status, 200);

    const hi = await getMine({ token: tokenAgent, build: 20 });
    assert.equal(hi.status, 200);

    const mismatch = await postCreate({
      token: tokenAgent,
      build: 12,
      payloadBuild: 11,
    });
    assert.equal(mismatch.status, 400);
    assert.equal(mismatch.body.code, 'APP_BUILD_MISMATCH');
  });

  it('multipart ancienne build → 426 avant Multer (pas de dossier)', async () => {
    enableFieldRecensementV1ForTests({ minBuild: 12 });
    const r = await postCreate({ token: tokenAgent, build: 8, withPhoto: true });
    assert.equal(r.status, 426);
    assert.equal(r.body.code, 'APP_VERSION_BLOCKED');
    assert.equal(await FieldRecensement.countDocuments(), 0);
  });

  it('Admin réel sans header sur approve → pas 426 (404 dossier) ; faux Admin 403', async () => {
    enableFieldRecensementV1ForTests({ minBuild: 12 });
    const id = new mongoose.Types.ObjectId();
    const adminR = await postAdmin(`/field-recensements/${id}/approve`, { token: tokenAdmin });
    assert.notEqual(adminR.status, 426);
    assert.ok([400, 404].includes(adminR.status));

    const fake = await postAdmin(`/field-recensements/${id}/approve`, { token: tokenFake });
    assert.equal(fake.status, 403);
    assert.equal(fake.body.code, 'ADMIN_REQUIRED');
  });

  it('GET détail : Admin sans header OK ; recenseur sans header 426', async () => {
    enableFieldRecensementV1ForTests({ minBuild: 12 });
    const doc = await FieldRecensement.create({
      schemaVersion: 1,
      clientMutationId: '550e8400-e29b-41d4-a716-446655490010',
      revision: 1,
      recenseur: agent._id,
      professionalType: 'prestataire',
      reviewStatus: 'pending_review',
      publicationStatus: 'not_started',
      ingestionStatus: 'completed',
      person: { nom: 'Ko', telephone: '+2250700990001' },
      business: { serviceId, description: 'x'.repeat(20), tarifDeclareMin: 1, tarifDeclareMax: 2 },
      location: { commune: 'Cocody', latitude: 5, longitude: -4 },
      consent: {
        recensementAccepted: true,
        textVersion: 'ci-fr-2026-09',
        acceptedAt: new Date(),
      },
      app: { version: '1', buildNumber: 12, installationId: 'i' },
      timing: { recordedAt: new Date(), serverReceivedAt: new Date() },
    });
    await FieldRecensement.collection.updateOne(
      { _id: doc._id },
      { $set: { requestHash: 'd'.repeat(64) } },
    );

    const agentNo = await parseRes(
      await fetch(`${baseUrl}/field-recensements/${doc._id}`, {
        headers: { Authorization: `Bearer ${tokenAgent}` },
      }),
    );
    assert.equal(agentNo.status, 426);

    const adminOk = await parseRes(
      await fetch(`${baseUrl}/field-recensements/${doc._id}`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      }),
    );
    assert.equal(adminOk.status, 200);
  });

  it('header casse X-App-Build accepté', async () => {
    enableFieldRecensementV1ForTests({ minBuild: 1 });
    const r = await parseRes(
      await fetch(`${baseUrl}/field-recensements/mine`, {
        headers: {
          Authorization: `Bearer ${tokenAgent}`,
          'x-app-build': String(TEST_FIELD_APP_BUILD),
        },
      }),
    );
    assert.equal(r.status, 200);
  });
});
