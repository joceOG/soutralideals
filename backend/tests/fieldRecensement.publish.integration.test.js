/**
 * R1-09 — Publication fail-safe : stub, profils, concurrence, crashes, visibilité.
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
  enableFieldRecensementV1ForTests,
  TEST_FIELD_APP_BUILD,
} from './helpers/fieldRecensementV1TestEnv.js';
import {
  applyPrestatairePublicMatch,
  applyFreelanceVendeurPublicMatch,
  isPrestatairePubliclyVisible,
  isProPubliclyVisible,
} from '../utils/proPublicFilter.js';

const SECRET = 'r1-field-publish-test-secret-min-32chars!';

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
  return `550e8400-e29b-41d4-a716-44665547${String(n).padStart(4, '0')}`;
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
  assert.ok(!s.includes('matchedUtilisateurId'));
  assert.ok(!s.includes('publicationLinkedUtilisateurId'));
  assert.ok(!s.includes('cld:auth:'));
  assert.ok(!s.includes('base64url'));
  assert.ok(!/\$2[aby]\$/.test(s));
}

async function seedCatalog() {
  const gId = new mongoose.Types.ObjectId();
  categoryId = new mongoose.Types.ObjectId();
  serviceId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('groupes').insertOne({
    _id: gId,
    nomgroupe: 'G',
  });
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
      bio: 'Bio courte',
      skills: ['UI'],
    };
  } else if (professionalType === 'vendeur') {
    business = {
      shopName: 'Boutique Awa',
      shopDescription: 'Vente diverse',
      businessType: 'Particulier',
      businessCategoryIds: [categoryId],
      productTypeLabels: ['Mode'],
    };
  }
  Object.assign(business, overrides.business || {});

  const doc = await FieldRecensement.create({
    schemaVersion: 1,
    clientMutationId: overrides.clientMutationId || op(8000 + Math.floor(Math.random() * 900)),
    revision: overrides.revision ?? 1,
    recenseur: overrides.recenseur || agent._id,
    professionalType,
    reviewStatus: overrides.reviewStatus || 'pending_review',
    publicationStatus: overrides.publicationStatus || 'not_started',
    ingestionStatus: overrides.ingestionStatus || 'completed',
    person: {
      nom: 'Kouassi',
      prenoms: 'Awa',
      telephone: tel,
      ...(overrides.person || {}),
    },
    business,
    location: {
      commune: 'Cocody',
      latitude: 5.35,
      longitude: -4.0,
      ...(overrides.location || {}),
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
    ...overrides.docExtra,
  });
  await FieldRecensement.collection.updateOne(
    { _id: doc._id },
    {
      $set: {
        requestHash: 'b'.repeat(64),
        'media.profilePhoto.ref': 'cld:auth:field/x',
        'media.profilePhoto.publicId': 'field/x',
      },
    },
  );
  return FieldRecensement.findById(doc._id);
}

async function approveDoc(doc, n) {
  return postJson(
    `/field-recensements/${doc._id}/approve`,
    {
      operationMutationId: op(n),
      expectedRevision: doc.revision,
      reasonCode: 'OTHER',
    },
    { token: tokenAdmin },
  );
}

describe('R1-09 — publication fail-safe', () => {
  before(async () => {
    process.env.JWT_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
    process.env.TEST_CLOUDINARY_MOCK = '1';
    enableFieldRecensementV1ForTests({ minBuild: 1 });
    delete process.env.TEST_PUBLISH_CRASH_AFTER;
    delete process.env.TEST_CLOUDINARY_FAIL;
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
    delete process.env.TEST_PUBLISH_CRASH_AFTER;
    delete process.env.TEST_CLOUDINARY_FAIL;
    process.env.TEST_CLOUDINARY_MOCK = '1';

    agent = await Utilisateur.create({
      nom: 'Agent',
      prenom: 'A',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: true,
      telephone: '+2250700119001',
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
      telephone: '+2250700119002',
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
      telephone: '+2250700119003',
      telephoneVerified: true,
    });
    tokenFake = issueToken(fakeAdmin._id, 'Admin');
    fakeAdmin.tokens = [{ token: tokenFake }];
    await fakeAdmin.save();
  });

  it('stub pending_claim : inactif, login impossible, secret absent, rejeu sans 2e user', async () => {
    const doc = await createPending();
    const r1 = await approveDoc(doc, 10);
    assert.equal(r1.status, 200);
    assert.equal(r1.body.code, 'RECENSEMENT_PUBLISHED');
    assertNoSecrets(r1.body);

    const stub = await Utilisateur.findOne({ sourceFieldRecensementId: doc._id });
    assert.ok(stub);
    assert.equal(stub.isActive, false);
    assert.equal(stub.activationStatus, 'pending_claim');
    assert.equal(!!stub.telephoneVerified, false);
    assert.equal((stub.tokens || []).length, 0);
    assert.equal((stub.refreshTokens || []).length, 0);
    assert.equal(stub.email, undefined);

    await assert.rejects(
      () => Utilisateur.findByCredentials(stub.telephone, 'Secret1a!!'),
      /Identifiants/,
    );
    await assert.rejects(
      () => Utilisateur.findByCredentials(stub.telephone, stub.telephone),
      /Identifiants/,
    );
    await assert.rejects(
      () => Utilisateur.findByCredentials(stub.telephone, 'password'),
      /Identifiants/,
    );

    const r2 = await postJson(
      `/field-recensements/${doc._id}/publish`,
      { operationMutationId: op(11), expectedRevision: 2 },
      { token: tokenAdmin },
    );
    assert.ok([200].includes(r2.status));
    assert.equal(await Utilisateur.countDocuments({ sourceFieldRecensementId: doc._id }), 1);
    assert.equal(await prestataireModel.countDocuments({ sourceFieldRecensementId: doc._id }), 1);
  });

  it('match téléphone vérifié unique : lie user existant sans stub', async () => {
    const tel = '+2250700881100';
    const existing = await Utilisateur.create({
      nom: 'Exist',
      prenom: 'U',
      password: 'Secret1a!!',
      role: 'Client',
      telephone: tel,
      telephoneVerified: true,
      isActive: true,
    });
    const doc = await createPending({ person: { telephone: tel } });
    const before = await Utilisateur.countDocuments();
    const r = await approveDoc(doc, 20);
    assert.equal(r.status, 200);
    assert.equal(await Utilisateur.countDocuments(), before);
    const linked = await FieldRecensement.findById(doc._id).select(
      '+publicationLinkedUtilisateurId',
    );
    assert.equal(String(linked.publicationLinkedUtilisateurId), String(existing._id));
    const p = await prestataireModel.findOne({ sourceFieldRecensementId: doc._id });
    assert.equal(String(p.utilisateur), String(existing._id));
  });

  it('email seul : jamais de lien auto — crée stub', async () => {
    const email = 'unique-r109@example.com';
    await Utilisateur.create({
      nom: 'Mail',
      prenom: 'Only',
      email,
      password: 'Secret1a!!',
      role: 'Client',
      telephone: '+2250700881101',
      telephoneVerified: true,
    });
    const doc = await createPending({
      person: { telephone: '+2250700882299', email },
    });
    const r = await approveDoc(doc, 21);
    assert.equal(r.status, 200);
    const stub = await Utilisateur.findOne({ sourceFieldRecensementId: doc._id });
    assert.ok(stub);
    assert.notEqual(stub.email, email);
  });

  it('mapping prestataire / freelance / vendeur + non public puis published', async () => {
    for (const type of ['prestataire', 'freelance', 'vendeur']) {
      const doc = await createPending({
        professionalType: type,
        clientMutationId: op(30 + ['prestataire', 'freelance', 'vendeur'].indexOf(type)),
      });
      const r = await approveDoc(doc, 40 + ['prestataire', 'freelance', 'vendeur'].indexOf(type));
      assert.equal(r.status, 200, type);
      assert.equal(r.body.data.publicationStatus, 'published');

      const Model =
        type === 'prestataire'
          ? prestataireModel
          : type === 'freelance'
            ? freelanceModel
            : vendeurModel;
      const profile = await Model.findOne({ sourceFieldRecensementId: doc._id });
      assert.ok(profile, type);
      assert.equal(profile.source, 'field_recensement_v1');
      assert.equal(profile.fieldPublicationStatus, 'published');
      assert.ok(profile.utilisateur);

      if (type === 'prestataire') {
        assert.equal(String(profile.service), String(serviceId));
        assert.equal(profile.verifier, true);
        assert.equal(profile.status, 'active');
        assert.equal(isPrestatairePubliclyVisible(profile), true);
        const q = applyPrestatairePublicMatch({});
        assert.equal(await prestataireModel.countDocuments(q), 1);
      }
      if (type === 'freelance') {
        assert.equal(profile.category, 'Batiment');
        assert.equal(profile.accountStatus, 'Active');
        assert.ok(String(profile.imagePath || '').includes(`profiles/freelance/${profile._id}/main`));
        assert.ok(!String(profile.imagePath).includes('cld:auth:'));
        assert.equal(isProPubliclyVisible(profile), true);
      }
      if (type === 'vendeur') {
        assert.deepEqual(profile.businessCategories, ['Batiment']);
        assert.ok(String(profile.shopLogo || '').includes(`profiles/vendeur/${profile._id}/main`));
      }
    }
  });

  it('profil intermédiaire invisible ; legacy toujours visible', async () => {
    const legacy = await prestataireModel.create({
      utilisateur: admin._id,
      service: serviceId,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'active',
      verifier: true,
      source: 'web',
    });
    assert.equal(isPrestatairePubliclyVisible(legacy), true);
    assert.equal(
      await prestataireModel.countDocuments(applyPrestatairePublicMatch({})),
      1,
    );

    const doc = await createPending({ reviewStatus: 'approved', revision: 2 });
    process.env.TEST_PUBLISH_CRASH_AFTER = 'after_profile';
    await assert.rejects(() =>
      publishFieldRecensement({ id: String(doc._id), actorUser: admin, ownerKey: 'c1' }),
    );
    const mid = await prestataireModel.findOne({ sourceFieldRecensementId: doc._id });
    assert.ok(mid);
    assert.notEqual(mid.fieldPublicationStatus, 'published');
    assert.equal(isPrestatairePubliclyVisible(mid), false);
    assert.equal(
      await prestataireModel.countDocuments(applyPrestatairePublicMatch({})),
      1,
      'seul legacy',
    );

    delete process.env.TEST_PUBLISH_CRASH_AFTER;
    const ok = await publishFieldRecensement({
      id: String(doc._id),
      actorUser: admin,
      ownerKey: 'c2',
    });
    assert.equal(ok.code, 'RECENSEMENT_PUBLISHED');
    assert.equal(
      await prestataireModel.countDocuments(applyPrestatairePublicMatch({})),
      2,
    );
  });

  it('crashs injectés : reprise sans doublon ni fuite publique', async () => {
    const steps = [
      'lock',
      'after_user',
      'after_profile',
      'after_linked_profile',
      'after_media',
      'before_published',
      'after_dossier_published',
    ];
    for (const step of steps) {
      const doc = await createPending({
        clientMutationId: op(100 + steps.indexOf(step)),
        reviewStatus: 'approved',
        revision: 2,
      });
      process.env.TEST_PUBLISH_CRASH_AFTER = step;
      await assert.rejects(
        () =>
          publishFieldRecensement({
            id: String(doc._id),
            actorUser: admin,
            ownerKey: `crash-${step}`,
          }),
        /TEST_CRASH|PUBLICATION_FAILED/,
      );
      const profiles = await prestataireModel.find({ sourceFieldRecensementId: doc._id });
      for (const p of profiles) {
        assert.equal(isPrestatairePubliclyVisible(p), false, step);
      }
      delete process.env.TEST_PUBLISH_CRASH_AFTER;
      const ok = await publishFieldRecensement({
        id: String(doc._id),
        actorUser: admin,
        ownerKey: `retry-${step}`,
      });
      assert.equal(ok.code, 'RECENSEMENT_PUBLISHED', step);
      assert.equal(await Utilisateur.countDocuments({ sourceFieldRecensementId: doc._id }), 1);
      assert.equal(await prestataireModel.countDocuments({ sourceFieldRecensementId: doc._id }), 1);
      const fresh = await FieldRecensement.findById(doc._id);
      if (fresh.media?.profilePhoto?.promotedPublicUrl) {
        assert.ok(!fresh.media.profilePhoto.promotedPublicUrl.includes('cld:auth:'));
      }
    }
  });

  it('10 publications concurrentes → 1 user, 1 profil, 0×500', async () => {
    const doc = await createPending({ reviewStatus: 'approved', revision: 2 });
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        publishFieldRecensement({
          id: String(doc._id),
          actorUser: admin,
          ownerKey: `conc-${i}-${crypto.randomBytes(4).toString('hex')}`,
        }).catch((e) => ({ error: true, status: e.status || 500, code: e.code })),
      ),
    );
    assert.ok(results.every((r) => !r.error || r.status !== 500));
    const published = results.filter(
      (r) => r.code === 'RECENSEMENT_PUBLISHED' || r.code === 'RECENSEMENT_ALREADY_APPLIED',
    );
    const processing = results.filter((r) => r.code === 'RECENSEMENT_PUBLICATION_PROCESSING');
    assert.ok(published.length + processing.length === 10);
    // drain remaining
    for (let i = 0; i < 5; i++) {
      await publishFieldRecensement({
        id: String(doc._id),
        actorUser: admin,
        ownerKey: `drain-${i}`,
      });
    }
    const final = await FieldRecensement.findById(doc._id);
    assert.equal(final.publicationStatus, 'published');
    assert.equal(await Utilisateur.countDocuments({ sourceFieldRecensementId: doc._id }), 1);
    assert.equal(await prestataireModel.countDocuments({ sourceFieldRecensementId: doc._id }), 1);
    const profile = await prestataireModel.findOne({ sourceFieldRecensementId: doc._id });
    assert.equal(profile.fieldPublicationStatus, 'published');
  });

  it('lease actif → 202 PROCESSING ; lease expiré → reprise', async () => {
    const doc = await createPending({ reviewStatus: 'approved', revision: 2 });
    await FieldRecensement.updateOne(
      { _id: doc._id },
      {
        $set: {
          publicationLock: {
            ownerId: 'other-owner',
            attemptId: 'x',
            acquiredAt: new Date(),
            expiresAt: new Date(Date.now() + 60_000),
            attempts: 1,
          },
        },
      },
    );
    const busy = await publishFieldRecensement({
      id: String(doc._id),
      actorUser: admin,
      ownerKey: 'me',
    });
    assert.equal(busy.status, 202);
    assert.equal(busy.code, 'RECENSEMENT_PUBLICATION_PROCESSING');

    await FieldRecensement.updateOne(
      { _id: doc._id },
      {
        $set: {
          'publicationLock.expiresAt': new Date(Date.now() - 1000),
        },
      },
    );
    const ok = await publishFieldRecensement({
      id: String(doc._id),
      actorUser: admin,
      ownerKey: 'me-after-expire',
    });
    assert.equal(ok.code, 'RECENSEMENT_PUBLISHED');
  });

  it('authz publish : anonyme / agent / faux admin refusés', async () => {
    const doc = await createPending({ reviewStatus: 'approved', revision: 2 });
    const payload = { operationMutationId: op(90), expectedRevision: 2 };
    assert.equal((await postJson(`/field-recensements/${doc._id}/publish`, payload)).status, 401);
    assert.equal(
      (await postJson(`/field-recensements/${doc._id}/publish`, payload, { token: tokenAgent }))
        .status,
      403,
    );
    assert.equal(
      (await postJson(`/field-recensements/${doc._id}/publish`, payload, { token: tokenFake }))
        .status,
      403,
    );
    const pending = await createPending({ clientMutationId: op(91) });
    const badState = await postJson(
      `/field-recensements/${pending._id}/publish`,
      { operationMutationId: op(92), expectedRevision: 1 },
      { token: tokenAdmin },
    );
    assert.equal(badState.status, 409);
  });

  it('profil V1 sans fieldPublicationStatus invisible ; freel/vend public match', async () => {
    const orphan = await freelanceModel.create({
      utilisateur: admin._id,
      name: 'Orphan',
      job: 'Dev',
      category: 'IT',
      hourlyRate: 1,
      location: 'Abidjan',
      source: 'field_recensement_v1',
      status: 'active',
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true },
    });
    assert.equal(isProPubliclyVisible(orphan), false);
    assert.equal(
      await freelanceModel.countDocuments(applyFreelanceVendeurPublicMatch({})),
      0,
    );
  });
});
