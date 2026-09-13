/**
 * R1-08A — Modération admin : request-correction, reject, approve
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import Utilisateur from '../models/utilisateurModel.js';
import FieldRecensement from '../models/fieldRecensementModel.js';
import FieldRecensementAuditEvent from '../models/fieldRecensementAuditEventModel.js';
import FieldRecensementOperation from '../models/fieldRecensementOperationModel.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import fieldRecensementV1Router from '../routes/fieldRecensementV1Routes.js';
import {
  enableFieldRecensementV1ForTests,
  TEST_FIELD_APP_BUILD,
} from './helpers/fieldRecensementV1TestEnv.js';

const SECRET = 'r1-field-admin-test-secret-min-32chars!!';

let server;
let baseUrl;
let agent;
let tokenAgent;
let admin;
let tokenAdmin;
let fakeAdmin;
let tokenFake;
let ordinary;
let tokenOrdinary;
let serviceId;

function issueToken(userId, role = 'Client') {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, {
    expiresIn: '1h',
  });
}

function op(n) {
  return `550e8400-e29b-41d4-a716-44665546${String(n).padStart(4, '0')}`;
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

async function postJson(path, payload, { token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-App-Build'] = String(TEST_FIELD_APP_BUILD);
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parseRes(res);
}

async function getJson(path, { token } = {}) {
  const headers = {};
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-App-Build'] = String(TEST_FIELD_APP_BUILD);
  }
  const res = await fetch(`${baseUrl}${path}`, { headers });
  return parseRes(res);
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

function assertNoSecrets(body) {
  const s = JSON.stringify(body);
  assert.ok(!s.includes('matchedUtilisateurId'));
  assert.ok(!s.includes('requestHash'));
  assert.ok(!s.includes('currentContentHash'));
  assert.ok(!s.includes('cld:auth:'));
  assert.ok(!s.includes('publicId'));
}

async function seedService() {
  const gId = new mongoose.Types.ObjectId();
  const catId = new mongoose.Types.ObjectId();
  serviceId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('groupes').insertOne({
    _id: gId,
    nomgroupe: 'G',
  });
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
}

async function createPending(overrides = {}) {
  const tel =
    overrides.person?.telephone ||
    `+2250700${String(Math.floor(100000 + Math.random() * 899999))}`;
  const doc = await FieldRecensement.create({
    schemaVersion: 1,
    clientMutationId: overrides.clientMutationId || op(9000 + Math.floor(Math.random() * 900)),
    revision: overrides.revision ?? 1,
    recenseur: overrides.recenseur || agent._id,
    professionalType: 'prestataire',
    reviewStatus: overrides.reviewStatus || 'pending_review',
    publicationStatus: 'not_started',
    ingestionStatus: overrides.ingestionStatus || 'completed',
    person: {
      nom: 'Kouassi',
      prenoms: 'Awa',
      telephone: tel,
      ...(overrides.person || {}),
    },
    business: {
      serviceId,
      description: 'Plomberie',
      tarifDeclareMin: 1000,
      tarifDeclareMax: 5000,
      ...(overrides.business || {}),
    },
    location: {
      commune: 'Cocody',
      latitude: 5.35,
      longitude: -4.0,
    },
    consent: {
      recensementAccepted: true,
      textVersion: 'ci-fr-2026-09',
      acceptedAt: new Date(),
    },
    app: { version: '1.0.0', buildNumber: 1, installationId: 'i' },
    timing: { recordedAt: new Date(), serverReceivedAt: new Date() },
    media: {
      profilePhoto: {
        ref: 'cld:auth:field/x',
        publicId: 'field/x',
        kind: 'profile_pending_private',
        sha256: 'abc',
      },
    },
    correction: overrides.correction,
  });
  await FieldRecensement.collection.updateOne(
    { _id: doc._id },
    {
      $set: {
        requestHash: 'a'.repeat(64),
        'media.profilePhoto.ref': 'cld:auth:field/x',
        'media.profilePhoto.publicId': 'field/x',
      },
    },
  );
  return doc;
}

describe('R1-08A — modération admin', () => {
  before(async () => {
    process.env.JWT_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
    enableFieldRecensementV1ForTests({ minBuild: 1 });
    await startIsolatedMongo();
    await seedService();

    const app = express();
    app.use(express.json());
    app.use('/api/v1', fieldRecensementV1Router);
    app.use((err, _req, res, _next) => {
      res.status(err.status || 500).json({
        success: false,
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Erreur',
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
    await seedService();
    process.env.TEST_AUDIT_FAIL = '0';

    agent = await Utilisateur.create({
      nom: 'Agent',
      prenom: 'A',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: true,
      telephone: '+2250700118001',
      telephoneVerified: true,
    });
    tokenAgent = issueToken(agent._id);
    agent.tokens = [{ token: tokenAgent }];
    await agent.save();

    admin = await Utilisateur.create({
      nom: 'Admin',
      prenom: 'Real',
      password: 'Secret1a!!',
      role: 'Admin',
      telephone: '+2250700118002',
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
      telephone: '+2250700118003',
      telephoneVerified: true,
    });
    tokenFake = issueToken(fakeAdmin._id, 'Admin');
    fakeAdmin.tokens = [{ token: tokenFake }];
    await fakeAdmin.save();

    ordinary = await Utilisateur.create({
      nom: 'User',
      prenom: 'O',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: false,
      telephone: '+2250700118004',
      telephoneVerified: true,
    });
    tokenOrdinary = issueToken(ordinary._id);
    ordinary.tokens = [{ token: tokenOrdinary }];
    await ordinary.save();
  });

  it('authz : anonyme 401 ; non-admin 403 ; faux admin 403 ; admin OK', async () => {
    const doc = await createPending();
    const body = {
      operationMutationId: op(1),
      expectedRevision: 1,
      reasonCode: 'PHOTO_UNCLEAR',
      fields: ['profilePhoto'],
    };
    assert.equal(
      (await postJson(`/field-recensements/${doc._id}/request-correction`, body)).status,
      401,
    );
    assert.equal(
      (
        await postJson(`/field-recensements/${doc._id}/request-correction`, body, {
          token: 'bad',
        })
      ).status,
      401,
    );
    for (const t of [tokenAgent, tokenOrdinary, tokenFake]) {
      const r = await postJson(`/field-recensements/${doc._id}/request-correction`, body, {
        token: t,
      });
      assert.equal(r.status, 403);
      assert.equal(r.body.code, 'ADMIN_REQUIRED');
    }
  });

  it('validation : id / uuid / props / raison / fields', async () => {
    const doc = await createPending();
    assert.equal(
      (
        await postJson(
          `/field-recensements/not-id/request-correction`,
          {
            operationMutationId: op(2),
            expectedRevision: 1,
            reasonCode: 'PHOTO_UNCLEAR',
            fields: ['profilePhoto'],
          },
          { token: tokenAdmin },
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await postJson(
          `/field-recensements/${doc._id}/request-correction`,
          {
            operationMutationId: 'nope',
            expectedRevision: 1,
            reasonCode: 'PHOTO_UNCLEAR',
            fields: ['profilePhoto'],
          },
          { token: tokenAdmin },
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await postJson(
          `/field-recensements/${doc._id}/request-correction`,
          {
            operationMutationId: op(3),
            expectedRevision: 1,
            reasonCode: 'PHOTO_UNCLEAR',
            fields: ['profilePhoto'],
            evil: true,
          },
          { token: tokenAdmin },
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await postJson(
          `/field-recensements/${doc._id}/request-correction`,
          {
            operationMutationId: op(4),
            expectedRevision: 1,
            reasonCode: 'NOT_A_REASON',
            fields: ['profilePhoto'],
          },
          { token: tokenAdmin },
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await postJson(
          `/field-recensements/${doc._id}/request-correction`,
          {
            operationMutationId: op(5),
            expectedRevision: 1,
            reasonCode: 'PHOTO_UNCLEAR',
            fields: [],
          },
          { token: tokenAdmin },
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await postJson(
          `/field-recensements/${doc._id}/request-correction`,
          {
            operationMutationId: op(6),
            expectedRevision: 1,
            reasonCode: 'PHOTO_UNCLEAR',
            fields: ['recenseur'],
          },
          { token: tokenAdmin },
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await postJson(
          `/field-recensements/${doc._id}/request-correction`,
          {
            operationMutationId: op(7),
            expectedRevision: 1,
            reasonCode: 'PHOTO_UNCLEAR',
            fields: ['business.shopName'],
          },
          { token: tokenAdmin },
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await postJson(
          `/field-recensements/${doc._id}/request-correction`,
          {
            operationMutationId: op(8),
            expectedRevision: 1,
            reasonCode: 'PHOTO_UNCLEAR',
            fields: ['$set'],
          },
          { token: tokenAdmin },
        )
      ).status,
      400,
    );
    const missing = await postJson(
      `/field-recensements/${new mongoose.Types.ObjectId()}/request-correction`,
      {
        operationMutationId: op(9),
        expectedRevision: 1,
        reasonCode: 'PHOTO_UNCLEAR',
        fields: ['profilePhoto'],
      },
      { token: tokenAdmin },
    );
    assert.equal(missing.status, 404);
  });

  it('request-correction → needs_correction ; visible agent ; PATCH/resubmit', async () => {
    const doc = await createPending();
    const usersBefore = await Utilisateur.countDocuments();
    const r = await postJson(
      `/field-recensements/${doc._id}/request-correction`,
      {
        operationMutationId: op(10),
        expectedRevision: 1,
        reasonCode: 'PHOTO_UNCLEAR',
        message: 'Reprendre la photo.',
        fields: ['profilePhoto', 'business.description'],
      },
      { token: tokenAdmin },
    );
    assert.equal(r.status, 200);
    assert.equal(r.body.code, 'RECENSEMENT_CORRECTION_REQUESTED');
    assert.equal(r.body.data.reviewStatus, 'needs_correction');
    assert.equal(r.body.data.revision, 2);
    assert.equal(r.body.data.publicationStatus, 'not_started');
    assertNoSecrets(r.body);
    assert.deepEqual(Object.keys(r.body.data.correction || {}).sort(), [
      'fields',
      'message',
      'reasonCode',
      'requestedAt',
    ]);

    const mine = await getJson('/field-recensements/mine', { token: tokenAgent });
    assert.equal(mine.status, 200);
    assert.equal(mine.body.data.items[0].reviewStatus, 'needs_correction');
    assert.equal(mine.body.data.items[0].correction?.reasonCode, 'PHOTO_UNCLEAR');

    const detail = await getJson(`/field-recensements/${doc._id}`, { token: tokenAgent });
    assert.equal(detail.body.data.correction.message, 'Reprendre la photo.');
    assert.ok(!('requestedBy' in (detail.body.data.correction || {})));

    const beforeBiz = (await FieldRecensement.findById(doc._id)).business.description;
    const patched = await patchJson(
      doc._id,
      {
        operationMutationId: op(11),
        expectedRevision: 2,
        changes: { 'business.description': 'Nouvelle desc' },
      },
      { token: tokenAgent },
    );
    assert.equal(patched.status, 200);
    // photo still required for resubmit — address profilePhoto via second patch without file not possible
    // mark addressed by patching description only then complete photo field via addressedFields inject for resubmit path
    await FieldRecensement.collection.updateOne(
      { _id: doc._id },
      { $set: { 'correction.addressedFields': ['business.description', 'profilePhoto'] } },
    );
    const after = await FieldRecensement.findById(doc._id);
    assert.notEqual(after.business.description, beforeBiz);
    assert.equal(after.revision, 3);

    const resub = await postJson(
      `/field-recensements/${doc._id}/resubmit`,
      { operationMutationId: op(12), expectedRevision: 3 },
      { token: tokenAgent },
    );
    assert.equal(resub.status, 200);
    assert.equal(resub.body.data.reviewStatus, 'pending_review');
    assert.equal(await Utilisateur.countDocuments(), usersBefore);
    assert.equal(await prestataireModel.countDocuments(), 0);
  });

  it('reject pending et needs_correction ; états interdits', async () => {
    const d1 = await createPending();
    const rej = await postJson(
      `/field-recensements/${d1._id}/reject`,
      {
        operationMutationId: op(20),
        expectedRevision: 1,
        reasonCode: 'OUT_OF_SCOPE',
        message: 'Hors zone',
      },
      { token: tokenAdmin },
    );
    assert.equal(rej.status, 200);
    assert.equal(rej.body.code, 'RECENSEMENT_REJECTED');
    assert.equal(rej.body.data.reviewStatus, 'rejected');
    assert.equal(rej.body.data.publicationStatus, 'not_started');

    const d2 = await createPending({
      clientMutationId: op(21),
      reviewStatus: 'needs_correction',
      correction: {
        reasonCode: 'PHOTO_UNCLEAR',
        message: 'x',
        fields: ['profilePhoto'],
        requestedAt: new Date(),
        addressedFields: [],
      },
    });
    const rej2 = await postJson(
      `/field-recensements/${d2._id}/reject`,
      { operationMutationId: op(22), expectedRevision: 1, reasonCode: 'FRAUD_SUSPECTED' },
      { token: tokenAdmin },
    );
    assert.equal(rej2.status, 200);
    const after = await FieldRecensement.findById(d2._id);
    assert.ok(after.correction.resolvedAt);

    const approved = await createPending({
      clientMutationId: op(23),
      reviewStatus: 'approved',
    });
    const bad = await postJson(
      `/field-recensements/${approved._id}/reject`,
      { operationMutationId: op(24), expectedRevision: 1, reasonCode: 'OTHER' },
      { token: tokenAdmin },
    );
    assert.equal(bad.status, 409);
    assert.equal(await vendeurModel.countDocuments(), 0);
    assert.equal(await freelanceModel.countDocuments(), 0);
  });

  it('approve valide → publication ; crée stub + profil ; rejeu sans doublon', async () => {
    const doc = await createPending();
    const usersBefore = await Utilisateur.countDocuments();
    const r = await postJson(
      `/field-recensements/${doc._id}/approve`,
      {
        operationMutationId: op(30),
        expectedRevision: 1,
        reasonCode: 'OTHER',
      },
      { token: tokenAdmin },
    );
    assert.equal(r.status, 200);
    assert.equal(r.body.code, 'RECENSEMENT_PUBLISHED');
    assert.equal(r.body.data.reviewStatus, 'approved');
    assert.equal(r.body.data.publicationStatus, 'published');
    assertNoSecrets(r.body);
    assert.equal(await Utilisateur.countDocuments(), usersBefore + 1);
    assert.equal(await prestataireModel.countDocuments(), 1);
    const stub = await Utilisateur.findOne({ sourceFieldRecensementId: doc._id });
    assert.equal(stub.isActive, false);
    assert.equal(stub.activationStatus, 'pending_claim');
    assert.equal(stub.telephoneVerified, false);

    const notReady = await createPending({
      clientMutationId: op(31),
      ingestionStatus: 'failed',
    });
    const bad = await postJson(
      `/field-recensements/${notReady._id}/approve`,
      { operationMutationId: op(32), expectedRevision: 1, reasonCode: 'OTHER' },
      { token: tokenAdmin },
    );
    assert.equal(bad.status, 409);

    const fromCorr = await createPending({
      clientMutationId: op(33),
      reviewStatus: 'needs_correction',
      correction: {
        reasonCode: 'X',
        message: 'm',
        fields: ['profilePhoto'],
        requestedAt: new Date(),
      },
    });
    const bad2 = await postJson(
      `/field-recensements/${fromCorr._id}/approve`,
      { operationMutationId: op(34), expectedRevision: 1, reasonCode: 'OTHER' },
      { token: tokenAdmin },
    );
    assert.equal(bad2.status, 409);
  });

  it('approve refuse doublon métier', async () => {
    const tel = '+2250700998877';
    await createPending({ person: { telephone: tel }, clientMutationId: op(40) });
    const doc = await createPending({ person: { telephone: tel }, clientMutationId: op(41) });
    const r = await postJson(
      `/field-recensements/${doc._id}/approve`,
      { operationMutationId: op(42), expectedRevision: 1, reasonCode: 'OTHER' },
      { token: tokenAdmin },
    );
    assert.equal(r.status, 409);
    assert.equal(r.body.code, 'RECENSEMENT_DUPLICATE_SUSPECTED');
  });

  it('idempotence + concurrence décisions', async () => {
    const doc = await createPending();
    const payload = {
      operationMutationId: op(50),
      expectedRevision: 1,
      reasonCode: 'PHOTO_UNCLEAR',
      fields: ['profilePhoto'],
    };
    const a = await postJson(`/field-recensements/${doc._id}/request-correction`, payload, {
      token: tokenAdmin,
    });
    assert.equal(a.status, 200);
    const replay = await postJson(`/field-recensements/${doc._id}/request-correction`, payload, {
      token: tokenAdmin,
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.code, 'RECENSEMENT_ALREADY_APPLIED');
    assert.equal(replay.body.data.revision, 2);

    const reuse = await postJson(
      `/field-recensements/${doc._id}/request-correction`,
      { ...payload, message: 'autre' },
      { token: tokenAdmin },
    );
    assert.equal(reuse.status, 409);
    assert.equal(reuse.body.code, 'IDEMPOTENCY_KEY_REUSED');

    const d2 = await createPending({ clientMutationId: op(51) });
    const results = await Promise.all([
      postJson(
        `/field-recensements/${d2._id}/approve`,
        { operationMutationId: op(52), expectedRevision: 1, reasonCode: 'OTHER' },
        { token: tokenAdmin },
      ),
      postJson(
        `/field-recensements/${d2._id}/reject`,
        { operationMutationId: op(53), expectedRevision: 1, reasonCode: 'OTHER' },
        { token: tokenAdmin },
      ),
      postJson(
        `/field-recensements/${d2._id}/request-correction`,
        {
          operationMutationId: op(54),
          expectedRevision: 1,
          reasonCode: 'PHOTO_UNCLEAR',
          fields: ['profilePhoto'],
        },
        { token: tokenAdmin },
      ),
    ]);
    const ok = results.filter((r) => r.status === 200 || r.status === 202);
    const conflict = results.filter((r) => r.status === 409);
    assert.equal(ok.length, 1);
    assert.equal(conflict.length, 2);
    const final = await FieldRecensement.findById(d2._id);
    assert.equal(final.revision, 2);
    assert.equal(await FieldRecensement.countDocuments({ _id: d2._id }), 1);
  });

  it('audit créé ; échec audit puis retry sans 2e transition', async () => {
    const doc = await createPending();
    process.env.TEST_AUDIT_FAIL = '1';
    const payload = {
      operationMutationId: op(60),
      expectedRevision: 1,
      reasonCode: 'PHOTO_UNCLEAR',
      fields: ['business.description'],
    };
    const fail = await postJson(`/field-recensements/${doc._id}/request-correction`, payload, {
      token: tokenAdmin,
    });
    // transition peut réussir avant audit — si audit throw après op create
    // R1-11 : SERVER_TEMPORARY_ERROR (503) remplace l’ancien 500 RECENSEMENT_AUDIT_FAILED
    assert.ok([200, 500, 503].includes(fail.status));
    const mid = await FieldRecensement.findById(doc._id);
    if (mid.reviewStatus === 'needs_correction') {
      assert.equal(mid.revision, 2);
      process.env.TEST_AUDIT_FAIL = '0';
      const retry = await postJson(`/field-recensements/${doc._id}/request-correction`, payload, {
        token: tokenAdmin,
      });
      assert.equal(retry.status, 200);
      assert.equal(retry.body.code, 'RECENSEMENT_ALREADY_APPLIED');
      assert.equal((await FieldRecensement.findById(doc._id)).revision, 2);
      const audits = await FieldRecensementAuditEvent.find({
        operationMutationId: op(60),
        kind: 'decision',
      });
      assert.equal(audits.length, 1);
      const s = JSON.stringify(audits[0]);
      assert.ok(!s.includes('cld:auth:'));
      assert.ok(!s.includes('password'));
    } else {
      process.env.TEST_AUDIT_FAIL = '0';
      const ok = await postJson(`/field-recensements/${doc._id}/request-correction`, payload, {
        token: tokenAdmin,
      });
      assert.equal(ok.status, 200);
      assert.equal(
        await FieldRecensementAuditEvent.countDocuments({ operationMutationId: op(60) }),
        1,
      );
    }
  });
});
