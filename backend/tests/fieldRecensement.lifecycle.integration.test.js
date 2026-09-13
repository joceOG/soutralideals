/**
 * R1-08B — suspend / reactivate fail-safe + fencing + concurrence.
 * Pré-implémentation : routes absentes → 404 (prouvé avant wiring).
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'node:crypto';

import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import Utilisateur from '../models/utilisateurModel.js';
import FieldRecensement from '../models/fieldRecensementModel.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import fieldRecensementV1Router from '../routes/fieldRecensementV1Routes.js';
import { publishFieldRecensement } from '../services/fieldRecensementPublishService.js';
import {
  suspendFieldRecensement,
  reactivateFieldRecensement,
} from '../services/fieldRecensementLifecycleService.js';
import {
  enableFieldRecensementV1ForTests,
  TEST_FIELD_APP_BUILD,
} from './helpers/fieldRecensementV1TestEnv.js';
import {
  applyPrestatairePublicMatch,
  isPrestatairePubliclyVisible,
  isProPubliclyVisible,
} from '../utils/proPublicFilter.js';

const SECRET = 'r1-field-lifecycle-test-secret-min-32!!';

let server;
let baseUrl;
let agent;
let tokenAgent;
let admin;
let tokenAdmin;
let fakeAdmin;
let tokenFake;
let serviceId;
let categoryId;

function issueToken(userId, role = 'Client') {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, {
    expiresIn: '1h',
  });
}

function op(n) {
  return `550e8400-e29b-41d4-a716-44665548${String(n).padStart(4, '0')}`;
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

function assertNoSecrets(body) {
  const s = JSON.stringify(body);
  assert.ok(!s.includes('publicationLinkedUtilisateurId'));
  assert.ok(!s.includes('publicationFenceEpoch'));
  assert.ok(!s.includes('cld:auth:'));
  assert.ok(!s.includes('matchedUtilisateurId'));
}

async function seedCatalog() {
  const gId = new mongoose.Types.ObjectId();
  categoryId = new mongoose.Types.ObjectId();
  serviceId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('groupes').insertOne({ _id: gId, nomgroupe: 'G' });
  await mongoose.connection.collection('categories').insertOne({
    _id: categoryId,
    nomcategorie: 'Batiment',
    imagecategorie: 'x.jpg',
    groupe: gId,
  });
  await mongoose.connection.collection('services').insertOne({
    _id: serviceId,
    nomservice: 'Plomberie',
    categorie: categoryId,
  });
}

async function createPending(overrides = {}) {
  const tel =
    overrides.person?.telephone ||
    `+2250700${String(Math.floor(100000 + Math.random() * 899999))}`;
  const professionalType = overrides.professionalType || 'prestataire';
  let business = {
    serviceId,
    description: 'Plomberie',
    tarifDeclareMin: 1000,
    tarifDeclareMax: 5000,
  };
  if (professionalType === 'freelance') {
    business = {
      displayName: 'Awa Design',
      jobTitle: 'Designer',
      categoryId,
      hourlyRate: 5000,
      bio: 'Bio',
      skills: ['UI'],
    };
  } else if (professionalType === 'vendeur') {
    business = {
      shopName: 'Boutique Awa',
      shopDescription: 'Vente',
      businessType: 'Particulier',
      businessCategoryIds: [categoryId],
      productTypeLabels: ['Mode'],
    };
  }
  Object.assign(business, overrides.business || {});

  const doc = await FieldRecensement.create({
    schemaVersion: 1,
    clientMutationId: overrides.clientMutationId || op(7000 + Math.floor(Math.random() * 900)),
    revision: overrides.revision ?? 1,
    recenseur: overrides.recenseur || agent._id,
    professionalType,
    reviewStatus: overrides.reviewStatus || 'pending_review',
    publicationStatus: overrides.publicationStatus || 'not_started',
    ingestionStatus: 'completed',
    person: { nom: 'Kouassi', prenoms: 'Awa', telephone: tel, ...(overrides.person || {}) },
    business,
    location: { commune: 'Cocody', latitude: 5.35, longitude: -4.0 },
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
  });
  await FieldRecensement.collection.updateOne(
    { _id: doc._id },
    {
      $set: {
        requestHash: 'c'.repeat(64),
        'media.profilePhoto.ref': 'cld:auth:field/x',
        'media.profilePhoto.publicId': 'field/x',
      },
    },
  );
  return FieldRecensement.findById(doc._id);
}

async function approveAndPublish(doc, n) {
  const r = await postJson(
    `/field-recensements/${doc._id}/approve`,
    { operationMutationId: op(n), expectedRevision: doc.revision, reasonCode: 'OTHER' },
    { token: tokenAdmin },
  );
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.code, 'RECENSEMENT_PUBLISHED');
  return FieldRecensement.findById(doc._id);
}

describe('R1-08B — suspend / reactivate', () => {
  before(async () => {
    process.env.JWT_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
    process.env.TEST_CLOUDINARY_MOCK = '1';
    enableFieldRecensementV1ForTests({ minBuild: 1 });
    delete process.env.TEST_SUSPEND_CRASH_AFTER;
    delete process.env.TEST_REACTIVATE_CRASH_AFTER;
    await startIsolatedMongo();
    await seedCatalog();

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
    if (server) await new Promise((r) => server.close(r));
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    await seedCatalog();
    delete process.env.TEST_SUSPEND_CRASH_AFTER;
    delete process.env.TEST_REACTIVATE_CRASH_AFTER;
    process.env.TEST_CLOUDINARY_MOCK = '1';

    agent = await Utilisateur.create({
      nom: 'Agent',
      prenom: 'A',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: true,
      telephone: '+2250700121001',
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
      telephone: '+2250700121002',
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
      telephone: '+2250700121003',
      telephoneVerified: true,
    });
    tokenFake = issueToken(fakeAdmin._id, 'Admin');
    fakeAdmin.tokens = [{ token: tokenFake }];
    await fakeAdmin.save();
  });

  it('authz suspend/reactivate : 401/403', async () => {
    const doc = await createPending({ reviewStatus: 'approved', revision: 2 });
    const payload = {
      operationMutationId: op(1),
      expectedRevision: 2,
      reasonCode: 'POLICY_VIOLATION',
    };
    assert.equal((await postJson(`/field-recensements/${doc._id}/suspend`, payload)).status, 401);
    assert.equal(
      (await postJson(`/field-recensements/${doc._id}/suspend`, payload, { token: tokenAgent }))
        .status,
      403,
    );
    assert.equal(
      (await postJson(`/field-recensements/${doc._id}/suspend`, payload, { token: tokenFake }))
        .status,
      403,
    );
    const rp = {
      operationMutationId: op(2),
      expectedRevision: 2,
      reasonCode: 'ISSUE_RESOLVED',
    };
    assert.equal(
      (await postJson(`/field-recensements/${doc._id}/reactivate`, rp, { token: tokenAgent }))
        .status,
      403,
    );
  });

  it('suspend prestataire/freelance/vendeur : masque public, user inchangé', async () => {
    for (const type of ['prestataire', 'freelance', 'vendeur']) {
      const doc = await createPending({
        professionalType: type,
        clientMutationId: op(10 + ['prestataire', 'freelance', 'vendeur'].indexOf(type)),
      });
      const published = await approveAndPublish(
        doc,
        20 + ['prestataire', 'freelance', 'vendeur'].indexOf(type),
      );
      const usersBefore = await Utilisateur.countDocuments();
      const r = await postJson(
        `/field-recensements/${published._id}/suspend`,
        {
          operationMutationId: op(30 + ['prestataire', 'freelance', 'vendeur'].indexOf(type)),
          expectedRevision: published.revision,
          reasonCode: 'POLICY_VIOLATION',
        },
        { token: tokenAdmin },
      );
      assert.equal(r.status, 200, type);
      assert.equal(r.body.code, 'RECENSEMENT_SUSPENDED');
      assert.equal(r.body.data.reviewStatus, 'suspended');
      assert.equal(r.body.data.publicationStatus, 'suspended');
      assertNoSecrets(r.body);
      assert.equal(await Utilisateur.countDocuments(), usersBefore);

      const Model =
        type === 'prestataire'
          ? prestataireModel
          : type === 'freelance'
            ? freelanceModel
            : vendeurModel;
      const profile = await Model.findOne({ sourceFieldRecensementId: published._id });
      assert.equal(profile.fieldPublicationStatus, 'suspended');
      assert.equal(profile.status, 'suspended');
      if (type === 'prestataire') {
        assert.equal(isPrestatairePubliclyVisible(profile), false);
      } else {
        assert.equal(isProPubliclyVisible(profile), false);
      }
    }
  });

  it('reactivate : même user/profil/public_id ; visible seulement après published', async () => {
    const doc = await createPending();
    const published = await approveAndPublish(doc, 40);
    const profileBefore = await prestataireModel.findOne({
      sourceFieldRecensementId: published._id,
    });
    const usersBefore = await Utilisateur.countDocuments();

    await postJson(
      `/field-recensements/${published._id}/suspend`,
      {
        operationMutationId: op(41),
        expectedRevision: published.revision,
        reasonCode: 'QUALITY_ISSUE',
      },
      { token: tokenAdmin },
    );
    const suspended = await FieldRecensement.findById(published._id);

    const r = await postJson(
      `/field-recensements/${suspended._id}/reactivate`,
      {
        operationMutationId: op(42),
        expectedRevision: suspended.revision,
        reasonCode: 'ISSUE_RESOLVED',
      },
      { token: tokenAdmin },
    );
    assert.equal(r.status, 200);
    assert.equal(r.body.code, 'RECENSEMENT_REACTIVATED');
    assert.equal(r.body.data.reviewStatus, 'approved');
    assert.equal(r.body.data.publicationStatus, 'published');
    assert.equal(await Utilisateur.countDocuments(), usersBefore);
    assert.equal(await prestataireModel.countDocuments({ sourceFieldRecensementId: published._id }), 1);
    const profileAfter = await prestataireModel.findOne({
      sourceFieldRecensementId: published._id,
    });
    assert.equal(String(profileAfter._id), String(profileBefore._id));
    assert.equal(String(profileAfter.utilisateur), String(profileBefore.utilisateur));
    assert.equal(profileAfter.fieldPublicationStatus, 'published');
    assert.equal(isPrestatairePubliclyVisible(profileAfter), true);

    const stub = await Utilisateur.findById(profileAfter.utilisateur);
    if (stub.activationStatus === 'pending_claim') {
      assert.equal(stub.isActive, false);
      assert.equal(!!stub.telephoneVerified, false);
    }
  });

  it('crash suspension après hide → profil masqué ; retry converge', async () => {
    const doc = await createPending();
    const published = await approveAndPublish(doc, 50);
    process.env.TEST_SUSPEND_CRASH_AFTER = 'before_audit';
    const fail = await suspendFieldRecensement({
      id: String(published._id),
      actorUser: admin,
      body: {
        operationMutationId: op(51),
        expectedRevision: published.revision,
        reasonCode: 'POLICY_VIOLATION',
      },
    });
    assert.ok(fail.status === 503 || fail.code === 'RECENSEMENT_SUSPENDED' || fail.success === false);
    const mid = await prestataireModel.findOne({ sourceFieldRecensementId: published._id });
    assert.equal(isPrestatairePubliclyVisible(mid), false);
    delete process.env.TEST_SUSPEND_CRASH_AFTER;
    const dossier = await FieldRecensement.findById(published._id);
    // Si transition déjà appliquée : ALREADY ou état suspended
    if (dossier.reviewStatus === 'suspended') {
      const again = await suspendFieldRecensement({
        id: String(published._id),
        actorUser: admin,
        body: {
          operationMutationId: op(51),
          expectedRevision: published.revision,
          reasonCode: 'POLICY_VIOLATION',
        },
      });
      assert.ok(
        again.code === 'RECENSEMENT_ALREADY_APPLIED' || again.code === 'RECENSEMENT_SUSPENDED',
      );
    }
  });

  it('crash réactivation avant published → profil non public', async () => {
    const doc = await createPending();
    const published = await approveAndPublish(doc, 60);
    await postJson(
      `/field-recensements/${published._id}/suspend`,
      {
        operationMutationId: op(61),
        expectedRevision: published.revision,
        reasonCode: 'POLICY_VIOLATION',
      },
      { token: tokenAdmin },
    );
    const suspended = await FieldRecensement.findById(published._id);
    process.env.TEST_PUBLISH_CRASH_AFTER = 'before_published';
    const fail = await reactivateFieldRecensement({
      id: String(suspended._id),
      actorUser: admin,
      body: {
        operationMutationId: op(62),
        expectedRevision: suspended.revision,
        reasonCode: 'ISSUE_RESOLVED',
      },
    });
    assert.ok(fail.success === false || fail.status >= 400);
    const mid = await prestataireModel.findOne({ sourceFieldRecensementId: published._id });
    assert.equal(isPrestatairePubliclyVisible(mid), false);
    delete process.env.TEST_PUBLISH_CRASH_AFTER;
    const fresh = await FieldRecensement.findById(published._id);
    if (fresh.reviewStatus === 'suspended') {
      const ok = await reactivateFieldRecensement({
        id: String(fresh._id),
        actorUser: admin,
        body: {
          operationMutationId: op(63),
          expectedRevision: fresh.revision,
          reasonCode: 'ISSUE_RESOLVED',
        },
      });
      assert.equal(ok.code, 'RECENSEMENT_REACTIVATED');
    }
  });

  it('10 suspensions concurrentes → 1 transition, 1 révision', async () => {
    const doc = await createPending();
    const published = await approveAndPublish(doc, 70);
    const rev = published.revision;
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        suspendFieldRecensement({
          id: String(published._id),
          actorUser: admin,
          body: {
            operationMutationId: op(700 + i),
            expectedRevision: rev,
            reasonCode: 'POLICY_VIOLATION',
          },
        }).catch((e) => ({ error: true, status: e.status || 500, code: e.code })),
      ),
    );
    assert.ok(results.every((r) => !r.error || r.status !== 500));
    const ok = results.filter((r) => r.code === 'RECENSEMENT_SUSPENDED');
    assert.equal(ok.length, 1);
    const final = await FieldRecensement.findById(published._id);
    assert.equal(final.reviewStatus, 'suspended');
    assert.equal(final.revision, rev + 1);
  });

  it('suspend contre publish : fencing empêche seal périmé', async () => {
    const doc = await createPending({ reviewStatus: 'approved', revision: 2 });
    // Bloquer publish juste avant seal
    process.env.TEST_PUBLISH_CRASH_AFTER = 'before_published';
    await assert.rejects(() =>
      publishFieldRecensement({
        id: String(doc._id),
        actorUser: admin,
        ownerKey: 'pub-race',
      }),
    );
    delete process.env.TEST_PUBLISH_CRASH_AFTER;

    // Profil ready mais pas published — suspend
    const mid = await FieldRecensement.findById(doc._id);
    // Forcer approved si failed
    await FieldRecensement.updateOne(
      { _id: doc._id },
      { $set: { reviewStatus: 'approved', revision: mid.revision } },
    );
    const d2 = await FieldRecensement.findById(doc._id);
    const sus = await suspendFieldRecensement({
      id: String(d2._id),
      actorUser: admin,
      body: {
        operationMutationId: op(80),
        expectedRevision: d2.revision,
        reasonCode: 'POLICY_VIOLATION',
      },
    });
    assert.equal(sus.code, 'RECENSEMENT_SUSPENDED');

    // Ancien worker tente de republier
    const pub = await publishFieldRecensement({
      id: String(d2._id),
      actorUser: admin,
      ownerKey: 'stale-worker',
    }).catch((e) => e);
    assert.ok(pub.status === 409 || pub.code === 'RECENSEMENT_INVALID_STATE');
    const profile = await prestataireModel.findOne({ sourceFieldRecensementId: d2._id });
    if (profile) {
      assert.notEqual(profile.fieldPublicationStatus, 'published');
      assert.equal(isPrestatairePubliclyVisible(profile), false);
    }
  });

  it('autre profil même user non affecté ; legacy visible', async () => {
    const otherUser = await Utilisateur.create({
      nom: 'Multi',
      prenom: 'P',
      password: 'Secret1a!!',
      role: 'Client',
      telephone: '+2250700887766',
      telephoneVerified: true,
    });
    const legacy = await prestataireModel.create({
      utilisateur: otherUser._id,
      service: serviceId,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'active',
      verifier: true,
      source: 'web',
    });
    // Dossier V1 sur un autre téléphone → stub distinct (ne pas bloquer sur profil legacy)
    const doc = await createPending({ person: { telephone: '+2250700887799' } });
    const published = await approveAndPublish(doc, 90);
    await postJson(
      `/field-recensements/${published._id}/suspend`,
      {
        operationMutationId: op(91),
        expectedRevision: published.revision,
        reasonCode: 'POLICY_VIOLATION',
      },
      { token: tokenAdmin },
    );
    const legacyFresh = await prestataireModel.findById(legacy._id);
    assert.equal(legacyFresh.status, 'active');
    assert.equal(isPrestatairePubliclyVisible(legacyFresh), true);
    assert.equal(
      await prestataireModel.countDocuments(applyPrestatairePublicMatch({})),
      1,
    );
    const u = await Utilisateur.findById(otherUser._id);
    assert.equal(u.isActive, true);
  });

  it('idempotence + validation stricte', async () => {
    const doc = await createPending();
    const published = await approveAndPublish(doc, 100);
    const payload = {
      operationMutationId: op(101),
      expectedRevision: published.revision,
      reasonCode: 'POLICY_VIOLATION',
    };
    const a = await postJson(`/field-recensements/${published._id}/suspend`, payload, {
      token: tokenAdmin,
    });
    const b = await postJson(`/field-recensements/${published._id}/suspend`, payload, {
      token: tokenAdmin,
    });
    assert.equal(a.status, 200);
    assert.equal(b.body.code, 'RECENSEMENT_ALREADY_APPLIED');
    const bad = await postJson(
      `/field-recensements/${published._id}/suspend`,
      { ...payload, reasonCode: 'OTHER', message: 'x' },
      { token: tokenAdmin },
    );
    assert.equal(bad.status, 409);
    assert.equal(bad.body.code, 'IDEMPOTENCY_KEY_REUSED');
  });
});
