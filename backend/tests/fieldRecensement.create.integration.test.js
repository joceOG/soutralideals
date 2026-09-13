/**
 * R1-03/04/05 + 3C-BIS — Tests HTTP POST /api/v1/field-recensements
 * Matrice des 45 scénarios : chaque it() ci-dessous porte des assertions explicites.
 * Cloudinary mocké · Mongo isolé · auth réelle.
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
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import fieldRecensementV1Router from '../routes/fieldRecensementV1Routes.js';
import {
  enableFieldRecensementV1ForTests,
  TEST_FIELD_APP_BUILD,
} from './helpers/fieldRecensementV1TestEnv.js';
import {
  canonicalizeCreatePayload,
  computeRequestHash,
  sha256File,
} from '../utils/fieldRecensementCanonical.js';

const SECRET = 'r1-field-create-test-secret-min-32chars!!';
const MUT_A = '550e8400-e29b-41d4-a716-446655440001';
const MUT_B = '550e8400-e29b-41d4-a716-446655440002';

let server;
let baseUrl;
let agent;
let agentToken;
let noPermUser;
let noPermToken;
let serviceId;
let serviceCategorieId;
let freelanceCategoryId;
let vendeurCategoryId;
/** @type {Array<object>} */
let uploadCalls = [];

function issueToken(userId, role = 'Client') {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, {
    expiresIn: '1h',
  });
}

function miniJpeg(bytes = [0xff, 0xd8, 0xff, 0xd9]) {
  const p = path.join(os.tmpdir(), `fr-photo-${crypto.randomBytes(6).toString('hex')}.jpg`);
  fs.writeFileSync(p, Buffer.from(bytes));
  return p;
}

function mut(n) {
  return `550e8400-e29b-41d4-a716-44665544${String(n).padStart(4, '0')}`;
}

function basePayload(overrides = {}) {
  return {
    clientMutationId: MUT_A,
    operationMutationId: MUT_A,
    schemaVersion: 1,
    professionalType: 'prestataire',
    recordedAt: '2026-09-01T10:00:00.000Z',
    app: { version: '1.0.0', buildNumber: 12, installationId: 'inst-uuid' },
    person: {
      nom: 'Kouassi',
      prenoms: 'Awa',
      telephone: '+2250700000099',
      whatsapp: '+2250700000099',
      email: null,
    },
    business: {
      serviceId: String(serviceId),
      description: 'Plomberie',
    },
    location: {
      adresse: 'Rue des Jardins',
      commune: 'Cocody',
      quartier: 'Angré',
      latitude: 5.3599,
      longitude: -3.9961,
      accuracyMeters: 12.5,
    },
    consent: {
      recensementAccepted: true,
      acceptedAt: '2026-09-01T09:59:00.000Z',
      textVersion: 'ci-fr-2026-09',
    },
    metadata: { notes: null, deviceTimezone: 'Africa/Abidjan' },
    ...overrides,
  };
}

async function postMultipart(payload, { token, filePath, fileField = 'profilePhoto' } = {}) {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  if (filePath) {
    const buf = fs.readFileSync(filePath);
    form.append(fileField, new Blob([buf], { type: 'image/jpeg' }), path.basename(filePath));
  }
  const headers = {};
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-App-Build'] = String(TEST_FIELD_APP_BUILD);
  }
  const res = await fetch(`${baseUrl}/field-recensements`, {
    method: 'POST',
    headers,
    body: form,
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

async function seedCatalog() {
  const gId = new mongoose.Types.ObjectId();
  serviceCategorieId = new mongoose.Types.ObjectId();
  serviceId = new mongoose.Types.ObjectId();
  freelanceCategoryId = new mongoose.Types.ObjectId();
  vendeurCategoryId = new mongoose.Types.ObjectId();
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
      nomcategorie: 'Design et Creativite',
      imagecategorie: 'x.jpg',
      groupe: gId,
    },
    {
      _id: vendeurCategoryId,
      nomcategorie: 'Mode',
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

describe('R1-03/04/05 + 3C-BIS — POST /api/v1/field-recensements', () => {
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
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          code: 'RECENSEMENT_PHOTO_INVALID',
          message: 'Fichier trop volumineux.',
          retryable: false,
        });
      }
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

    agent = await Utilisateur.create({
      nom: 'Agent',
      prenom: 'Rec',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: true,
      telephone: '+2250700112233',
      telephoneVerified: true,
    });
    agentToken = issueToken(agent._id, agent.role);
    agent.tokens = [{ token: agentToken }];
    await agent.save();

    noPermUser = await Utilisateur.create({
      nom: 'Client',
      prenom: 'X',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: false,
      email: 'noperm@example.com',
    });
    noPermToken = issueToken(noPermUser._id, noPermUser.role);
    noPermUser.tokens = [{ token: noPermToken }];
    await noPermUser.save();

    uploadCalls = [];
    mock.restoreAll();
    mock.method(cloudinary.v2.uploader, 'upload', async (filePath, opts = {}) => {
      uploadCalls.push({ filePath, opts });
      if (process.env.TEST_CLOUDINARY_FAIL === '1') {
        throw new Error('cloudinary_boom');
      }
      return {
        public_id: opts.public_id || 'field/test/photo',
        secure_url: 'https://res.cloudinary.com/demo/image/authenticated/s--x--/v1/secret.jpg',
      };
    });
  });

  // —— Auth (scénarios 1-5) ——
  it('S1 anonyme → 401', async () => {
    const r = await postMultipart(basePayload(), {});
    assert.equal(r.status, 401);
  });

  it('S2 JWT invalide → 401', async () => {
    const r = await postMultipart(basePayload(), { token: 'not.a.jwt' });
    assert.equal(r.status, 401);
  });

  it('S3 sans permission → 403 RECENSEUR_PERMISSION_REVOKED', async () => {
    const r = await postMultipart(basePayload(), { token: noPermToken });
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'RECENSEUR_PERMISSION_REVOKED');
  });

  it('S4 agent autorisé → 201 CREATED', async () => {
    const r = await postMultipart(basePayload(), { token: agentToken });
    assert.equal(r.status, 201);
    assert.equal(r.body.code, 'RECENSEMENT_CREATED');
    assert.ok(r.body.data?.id);
    assert.equal(r.body.data.reviewStatus, 'pending_review');
    assert.equal(r.body.data.revision, 1);
  });

  it('S5 faux recenseur client → 400 FORBIDDEN (pas d’usurpation)', async () => {
    const fake = new mongoose.Types.ObjectId();
    const r = await postMultipart(
      { ...basePayload(), recenseur: String(fake) },
      { token: agentToken },
    );
    assert.equal(r.status, 400);
    assert.equal(r.body.code, 'RECENSEMENT_VALIDATION_FAILED');
    assert.equal(await FieldRecensement.countDocuments(), 0);
  });

  // —— Validation types (6-8) + catégories ——
  it('S6 prestataire valide + catégorie dérivée serveur', async () => {
    const r = await postMultipart(basePayload(), { token: agentToken });
    assert.equal(r.status, 201);
    const doc = await FieldRecensement.findById(r.body.data.id).lean();
    assert.equal(String(doc.business.serviceId), String(serviceId));
    assert.equal(String(doc.business.derivedCategorieId), String(serviceCategorieId));
  });

  it('S7 freelance valide via categoryId (libellé dérivé)', async () => {
    const r = await postMultipart(
      basePayload({
        clientMutationId: MUT_B,
        operationMutationId: MUT_B,
        professionalType: 'freelance',
        business: {
          displayName: 'Awa Design',
          jobTitle: 'Graphiste',
          categoryId: String(freelanceCategoryId),
          skills: ['Ps', 'Ps'],
          hourlyRate: 5000,
          devise: 'XOF',
        },
      }),
      { token: agentToken },
    );
    assert.equal(r.status, 201);
    const doc = await FieldRecensement.findById(r.body.data.id).lean();
    assert.equal(String(doc.business.categoryId), String(freelanceCategoryId));
    assert.equal(doc.business.categoryLabel, 'Design et Creativite');
  });

  it('S8 vendeur valide + businessCategoryIds vérifiés', async () => {
    const m = mut(3);
    const r = await postMultipart(
      basePayload({
        clientMutationId: m,
        operationMutationId: m,
        professionalType: 'vendeur',
        business: {
          shopName: 'Boutique',
          businessType: 'Particulier',
          shopDescription: 'Mode',
          businessCategoryIds: [String(vendeurCategoryId), String(vendeurCategoryId)],
          productTypeLabels: ['Robes', 'robes', 'Jupes'],
        },
      }),
      { token: agentToken },
    );
    assert.equal(r.status, 201);
    const doc = await FieldRecensement.findById(r.body.data.id).lean();
    assert.equal(doc.business.businessCategoryIds.length, 1);
    assert.deepEqual(doc.business.productTypeLabels, ['Jupes', 'Robes']);
  });

  it('S13 catégorie freelance inexistante → 400', async () => {
    const m = mut(13);
    const r = await postMultipart(
      basePayload({
        clientMutationId: m,
        operationMutationId: m,
        professionalType: 'freelance',
        business: {
          displayName: 'X',
          jobTitle: 'Y',
          categoryId: new mongoose.Types.ObjectId().toString(),
        },
      }),
      { token: agentToken },
    );
    assert.equal(r.status, 400);
    assert.equal(r.body.code, 'RECENSEMENT_VALIDATION_FAILED');
  });

  it('vendeur catégorie inexistante → 400', async () => {
    const m = mut(80);
    const r = await postMultipart(
      basePayload({
        clientMutationId: m,
        operationMutationId: m,
        professionalType: 'vendeur',
        business: {
          shopName: 'B',
          businessType: 'Particulier',
          businessCategoryIds: [new mongoose.Types.ObjectId().toString()],
        },
      }),
      { token: agentToken },
    );
    assert.equal(r.status, 400);
    assert.equal(r.body.code, 'RECENSEMENT_VALIDATION_FAILED');
  });

  it('vendeur productTypeLabels invalide / trop long → 400', async () => {
    const m = mut(81);
    const r = await postMultipart(
      basePayload({
        clientMutationId: m,
        operationMutationId: m,
        professionalType: 'vendeur',
        business: {
          shopName: 'B',
          businessType: 'Particulier',
          productTypeLabels: ['', 'ok'],
        },
      }),
      { token: agentToken },
    );
    assert.equal(r.status, 400);

    const mLong = mut(811);
    const tooLong = await postMultipart(
      basePayload({
        clientMutationId: mLong,
        operationMutationId: mLong,
        professionalType: 'vendeur',
        business: {
          shopName: 'B',
          businessType: 'Particulier',
          productTypeLabels: Array.from({ length: 21 }, (_, i) => `t${i}`),
        },
      }),
      { token: agentToken },
    );
    assert.equal(tooLong.status, 400);
    assert.equal(tooLong.body.code, 'RECENSEMENT_VALIDATION_FAILED');
  });

  it('vendeur productTypeIds interdit ; doublons businessCategoryIds normalisés', async () => {
    const mBad = mut(83);
    const bad = await postMultipart(
      basePayload({
        clientMutationId: mBad,
        operationMutationId: mBad,
        professionalType: 'vendeur',
        business: {
          shopName: 'X',
          businessType: 'Particulier',
          productTypeIds: [String(vendeurCategoryId)],
        },
      }),
      { token: agentToken },
    );
    assert.equal(bad.status, 400);
    assert.equal(bad.body.code, 'RECENSEMENT_VALIDATION_FAILED');

    const mOk = mut(84);
    const id = String(vendeurCategoryId);
    const ok = await postMultipart(
      basePayload({
        clientMutationId: mOk,
        operationMutationId: mOk,
        professionalType: 'vendeur',
        business: {
          shopName: 'Boutique',
          businessType: 'Particulier',
          businessCategoryIds: [id, id, id],
          productTypeLabels: ['Robes', 'robes', 'Jupes'],
        },
      }),
      { token: agentToken },
    );
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    const doc = await FieldRecensement.findById(ok.body.data.id);
    assert.equal(doc.business.businessCategoryIds.length, 1);
    assert.equal(String(doc.business.businessCategoryIds[0]), id);
    assert.deepEqual(doc.business.productTypeLabels, ['Jupes', 'Robes']);
  });

  it('freelance categoryLabel client interdit → 400', async () => {
    const m = mut(85);
    const r = await postMultipart(
      basePayload({
        clientMutationId: m,
        operationMutationId: m,
        professionalType: 'freelance',
        business: {
          displayName: 'A',
          jobTitle: 'J',
          categoryId: String(freelanceCategoryId),
          categoryLabel: 'Libellé libre interdit',
        },
      }),
      { token: agentToken },
    );
    assert.equal(r.status, 400);
    assert.equal(r.body.code, 'RECENSEMENT_VALIDATION_FAILED');
  });

  it('S12 service inexistant + S categorieId client interdit', async () => {
    const m1 = mut(12);
    const r1 = await postMultipart(
      basePayload({
        clientMutationId: m1,
        operationMutationId: m1,
        business: { serviceId: new mongoose.Types.ObjectId().toString() },
      }),
      { token: agentToken },
    );
    assert.equal(r1.status, 400);

    const m2 = mut(121);
    const r2 = await postMultipart(
      basePayload({
        clientMutationId: m2,
        operationMutationId: m2,
        business: {
          serviceId: String(serviceId),
          categorieId: String(serviceCategorieId),
        },
      }),
      { token: agentToken },
    );
    assert.equal(r2.status, 400);
    assert.equal(r2.body.code, 'RECENSEMENT_VALIDATION_FAILED');
  });

  // —— Validation erreurs (9-20) ——
  it('S9-20 validation refus : schema/uuid/type/consent/password/temp/statuts/details/business/GPS', async () => {
    const cases = [
      { schemaVersion: 2 },
      { clientMutationId: 'not-uuid' },
      { professionalType: 'inconnu' },
      {
        clientMutationId: mut(14),
        operationMutationId: mut(14),
        consent: { recensementAccepted: false, textVersion: 'x' },
      },
      {
        clientMutationId: mut(15),
        operationMutationId: mut(15),
        person: { nom: 'Ko', telephone: '+2250700000099', password: 'x' },
      },
      {
        clientMutationId: mut(16),
        operationMutationId: mut(16),
        person: { nom: 'Ko', telephone: '+2250700000099', email: 'a@temp.com' },
      },
      {
        clientMutationId: mut(17),
        operationMutationId: mut(17),
        reviewStatus: 'approved',
      },
      {
        clientMutationId: mut(18),
        operationMutationId: mut(18),
        details: { foo: 1 },
      },
      {
        clientMutationId: mut(19),
        operationMutationId: mut(19),
        business: { serviceId: String(serviceId), evilKey: 1 },
      },
      {
        clientMutationId: mut(20),
        operationMutationId: mut(20),
        location: { commune: 'X', latitude: 99, longitude: 0 },
      },
      {
        clientMutationId: mut(201),
        operationMutationId: mut(201),
        publicationStatus: 'published',
      },
      {
        clientMutationId: mut(202),
        operationMutationId: mut(202),
        requestHash: 'abc',
      },
    ];
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      const payload = basePayload({
        clientMutationId: c.clientMutationId || mut(900 + i),
        operationMutationId: c.operationMutationId || c.clientMutationId || mut(900 + i),
        ...c,
      });
      if (c.person) payload.person = { ...basePayload().person, ...c.person };
      if (c.business) payload.business = c.business;
      if (c.location) payload.location = c.location;
      if (c.consent) payload.consent = c.consent;
      const r = await postMultipart(payload, { token: agentToken });
      assert.equal(r.status, 400, `case ${i}: ${JSON.stringify(r.body)}`);
      assert.equal(r.body.code, 'RECENSEMENT_VALIDATION_FAILED');
    }
  });

  // —— Idempotence (21-27) ——
  it('S21-24 create / replay / payload diff / photo diff', async () => {
    const photo = miniJpeg();
    try {
      const first = await postMultipart(basePayload(), { token: agentToken, filePath: photo });
      assert.equal(first.status, 201);
      const id = first.body.data.id;

      const replay = await postMultipart(basePayload(), { token: agentToken, filePath: photo });
      assert.equal(replay.status, 200);
      assert.equal(replay.body.code, 'RECENSEMENT_ALREADY_APPLIED');
      assert.equal(replay.body.data.id, id);

      const diffPayload = await postMultipart(
        basePayload({ person: { ...basePayload().person, nom: 'Autre' } }),
        { token: agentToken, filePath: photo },
      );
      assert.equal(diffPayload.status, 409);
      assert.equal(diffPayload.body.code, 'IDEMPOTENCY_KEY_REUSED');

      const otherPhoto = miniJpeg([0xff, 0xd8, 0xff, 0xd9, 0x01]);
      try {
        const diffPhoto = await postMultipart(basePayload(), {
          token: agentToken,
          filePath: otherPhoto,
        });
        assert.equal(diffPhoto.status, 409);
        assert.equal(diffPhoto.body.code, 'IDEMPOTENCY_KEY_REUSED');
      } finally {
        fs.unlinkSync(otherPhoto);
      }
    } finally {
      if (fs.existsSync(photo)) fs.unlinkSync(photo);
    }
  });

  it('S25-26 hash stable ordre JSON + téléphone équivalent', async () => {
    const p1 = basePayload();
    const p2 = {
      ...p1,
      person: {
        email: null,
        telephone: '002250700000099',
        prenoms: 'Awa',
        nom: 'Kouassi',
        whatsapp: '+2250700000099',
      },
    };
    const a = await postMultipart(p1, { token: agentToken });
    assert.equal(a.status, 201);
    const b = await postMultipart(p2, { token: agentToken });
    assert.equal(b.status, 200);
    assert.equal(b.body.data.id, a.body.data.id);
  });

  it('S27 deux agents / même téléphone → DUPLICATE_SUSPECTED (pas d’id tiers)', async () => {
    const agent2 = await Utilisateur.create({
      nom: 'Agent2',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: true,
      telephone: '+2250700445566',
      telephoneVerified: true,
      email: 'a2@example.com',
    });
    const t2 = issueToken(agent2._id);
    agent2.tokens = [{ token: t2 }];
    await agent2.save();

    const tel = '+2250700998877';
    const r1 = await postMultipart(
      basePayload({ person: { ...basePayload().person, telephone: tel } }),
      { token: agentToken },
    );
    assert.equal(r1.status, 201);

    const r2 = await postMultipart(
      basePayload({ person: { ...basePayload().person, telephone: tel } }),
      { token: t2 },
    );
    assert.equal(r2.status, 409);
    assert.equal(r2.body.code, 'RECENSEMENT_DUPLICATE_SUSPECTED');
    const s = JSON.stringify(r2.body);
    assert.ok(!s.includes(String(r1.body.data.id)));
    assert.ok(!s.includes(tel));
    assert.ok(!s.includes(String(agent._id)));
  });

  it('même agent autre mutation même téléphone → DUPLICATE_SUSPECTED', async () => {
    const r1 = await postMultipart(basePayload(), { token: agentToken });
    assert.equal(r1.status, 201);
    const m = mut(270);
    const r2 = await postMultipart(
      basePayload({ clientMutationId: m, operationMutationId: m }),
      { token: agentToken },
    );
    assert.equal(r2.status, 409);
    assert.equal(r2.body.code, 'RECENSEMENT_DUPLICATE_SUSPECTED');
  });

  // —— Concurrence (28-30) ——
  it('S28 dix POST parallèles sans photo → 1 dossier, 0×500, codes 200|201|202', async () => {
    const jobs = Array.from({ length: 10 }, () =>
      postMultipart(basePayload(), { token: agentToken }),
    );
    assert.equal(jobs.length, 10);
    const results = await Promise.all(jobs);
    assert.equal(results.length, 10);
    const statuses = results.map((r) => r.status);
    assert.ok(statuses.every((s) => [200, 201, 202].includes(s)), String(statuses));
    assert.ok(!statuses.includes(500));
    assert.equal(
      await FieldRecensement.countDocuments({
        recenseur: agent._id,
        clientMutationId: MUT_A,
      }),
      1,
    );
    const ids = new Set(results.filter((r) => r.body?.data?.id).map((r) => r.body.data.id));
    assert.equal(ids.size, 1);
  });

  it('S29-30 dix POST + photo → 1 média auth, 1 public_id, rejeux même id', async () => {
    const photo = miniJpeg();
    try {
      const jobs = Array.from({ length: 10 }, () =>
        postMultipart(basePayload(), { token: agentToken, filePath: photo }),
      );
      const results = await Promise.all(jobs);
      assert.equal(results.length, 10);
      assert.ok(results.every((r) => [200, 201, 202].includes(r.status)));
      assert.ok(!results.some((r) => r.status === 500));
      assert.equal(
        await FieldRecensement.countDocuments({
          recenseur: agent._id,
          clientMutationId: MUT_A,
        }),
        1,
      );

      let doc = await FieldRecensement.findOne({
        recenseur: agent._id,
        clientMutationId: MUT_A,
      }).select('+media.profilePhoto.ref +media.profilePhoto.publicId');
      for (let i = 0; i < 40 && doc?.ingestionStatus === 'media_uploading'; i++) {
        await new Promise((r) => setTimeout(r, 100));
        doc = await FieldRecensement.findById(doc._id).select(
          '+media.profilePhoto.ref +media.profilePhoto.publicId',
        );
      }
      assert.equal(doc.ingestionStatus, 'completed');
      assert.ok(String(doc.media.profilePhoto.ref).startsWith('cld:auth:'));
      assert.ok(!String(doc.media.profilePhoto.ref).startsWith('http'));
      const pids = [...new Set(uploadCalls.map((c) => c.opts?.public_id).filter(Boolean))];
      assert.equal(pids.length, 1);
      assert.equal(uploadCalls.length, 1, 'une seule opération propriétaire d’upload');
      assert.ok(uploadCalls.every((c) => c.opts?.type === 'authenticated'));

      const replays = await Promise.all(
        Array.from({ length: 5 }, () =>
          postMultipart(basePayload(), { token: agentToken, filePath: photo }),
        ),
      );
      assert.ok(replays.every((r) => r.status === 200));
      assert.ok(replays.every((r) => r.body.data.id === String(doc._id)));
    } finally {
      if (fs.existsSync(photo)) fs.unlinkSync(photo);
    }
  });

  // —— Reprise Cloudinary (31-33) ——
  it('S31-33 Cloudinary fail → failed → retry completed → 3e ALREADY_APPLIED ; temp nettoyé', async () => {
    const photo = miniJpeg();
    const photoPath = photo;
    process.env.TEST_CLOUDINARY_FAIL = '1';
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const uploadsBefore = fs.existsSync(uploadsDir) ? new Set(fs.readdirSync(uploadsDir)) : new Set();
    try {
      const fail = await postMultipart(basePayload(), { token: agentToken, filePath: photo });
      assert.notEqual(fail.body?.code, 'RECENSEMENT_CREATED');
      assert.ok(fail.status >= 400);
      assert.ok([503, 500].includes(fail.status) || fail.body?.code === 'RECENSEMENT_MEDIA_FAILED');
      assert.equal(
        await FieldRecensement.countDocuments({
          recenseur: agent._id,
          clientMutationId: MUT_A,
        }),
        1,
      );
      const failedDoc = await FieldRecensement.findOne({
        recenseur: agent._id,
        clientMutationId: MUT_A,
      });
      assert.equal(failedDoc.ingestionStatus, 'failed');
      if (fs.existsSync(uploadsDir)) {
        const added = fs.readdirSync(uploadsDir).filter((f) => !uploadsBefore.has(f));
        assert.equal(added.length, 0, `temp non nettoyé: ${added.join(',')}`);
      }

      process.env.TEST_CLOUDINARY_FAIL = '0';
      mock.restoreAll();
      mock.method(cloudinary.v2.uploader, 'upload', async (_p, opts = {}) => {
        uploadCalls.push({ opts });
        return { public_id: opts.public_id || 'ok', secure_url: 'https://x' };
      });

      const photo2 = miniJpeg();
      try {
        const retry = await postMultipart(basePayload(), {
          token: agentToken,
          filePath: photo2,
        });
        assert.ok([200, 201].includes(retry.status), JSON.stringify(retry.body));
        assert.equal(
          await FieldRecensement.countDocuments({
            recenseur: agent._id,
            clientMutationId: MUT_A,
          }),
          1,
        );
        const after = await FieldRecensement.findOne({
          recenseur: agent._id,
          clientMutationId: MUT_A,
        });
        assert.equal(after.ingestionStatus, 'completed');
        assert.equal(String(after._id), String(failedDoc._id));

        const photo3 = miniJpeg();
        try {
          const third = await postMultipart(basePayload(), {
            token: agentToken,
            filePath: photo3,
          });
          assert.equal(third.status, 200);
          assert.equal(third.body.code, 'RECENSEMENT_ALREADY_APPLIED');
          assert.equal(third.body.data.id, String(failedDoc._id));
        } finally {
          if (fs.existsSync(photo3)) fs.unlinkSync(photo3);
        }
      } finally {
        if (fs.existsSync(photo2)) fs.unlinkSync(photo2);
      }
    } finally {
      process.env.TEST_CLOUDINARY_FAIL = '0';
      if (fs.existsSync(photo)) fs.unlinkSync(photo);
    }
  });

  // —— Confidentialité (39-45) ——
  it('S39-45 confidentialité + 0 user/profil + non public', async () => {
    const usersBefore = await Utilisateur.countDocuments();
    const pBefore = await prestataireModel.countDocuments();
    const fBefore = await freelanceModel.countDocuments();
    const vBefore = await vendeurModel.countDocuments();

    const r = await postMultipart(basePayload(), { token: agentToken });
    assert.equal(r.status, 201);
    const s = JSON.stringify(r.body);
    assert.ok(!s.includes('matchedUtilisateurId'));
    assert.ok(!s.includes('requestHash'));
    assert.ok(!s.includes('cld:auth:'));
    assert.ok(!s.includes('secure_url'));
    assert.ok(!s.includes('kyc'));
    assert.equal(r.body.data.publicationStatus, 'not_started');
    assert.equal(r.body.data.reviewStatus, 'pending_review');

    assert.equal(await Utilisateur.countDocuments(), usersBefore);
    assert.equal(await prestataireModel.countDocuments(), pBefore);
    assert.equal(await freelanceModel.countDocuments(), fBefore);
    assert.equal(await vendeurModel.countDocuments(), vBefore);
  });

  it('route montée dans server.js (preuve source)', async () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'server.js'),
      'utf8',
    );
    assert.match(src, /app\.use\('\/api\/v1',\s*fieldRecensementV1Router\)/);
  });
});

describe('3C-BIS — hash canonique unitaire', () => {
  it('ordre clés / email casse / tel équivalent / skills set / photo contenu / requestHash client ignoré', async () => {
    const base = {
      clientMutationId: MUT_A,
      operationMutationId: MUT_A,
      schemaVersion: 1,
      professionalType: 'freelance',
      recordedAt: '2026-09-01T10:00:00.000Z',
      app: { version: '1.0.0', buildNumber: 1, installationId: 'i' },
      person: {
        nom: 'Kouassi',
        prenoms: 'Awa',
        telephone: '+2250700000099',
        email: 'awa@example.com',
      },
      business: {
        displayName: 'A',
        jobTitle: 'J',
        categoryId: '507f1f77bcf86cd799439011',
        skills: ['B', 'a', 'A'],
      },
      consent: { recensementAccepted: true, textVersion: 'v' },
      metadata: {},
    };
    const a = canonicalizeCreatePayload(base);
    const b = canonicalizeCreatePayload({
      ...base,
      person: {
        email: 'AWA@EXAMPLE.COM',
        telephone: '002250700000099',
        prenoms: 'Awa',
        nom: 'Kouassi',
      },
      business: {
        skills: ['a', 'B'],
        jobTitle: 'J',
        displayName: 'A',
        categoryId: '507f1f77bcf86cd799439011',
      },
    });
    assert.equal(computeRequestHash(a), computeRequestHash(b));
    assert.deepEqual(a.business.skills, ['a', 'B']);

    // Ensembles : skills / zonesIntervention / businessCategoryIds / productTypeLabels.
    // Aucune liste ordonnée métier dans le create V1 actuel ; un tableau hors SET_LIKE
    // conserve l’ordre (preuve de non-normalisation générique).
    const { sortKeysDeep } = await import('../utils/fieldRecensementCanonical.js');
    assert.deepEqual(sortKeysDeep(['z', 'a'], 'business.orderedDemo'), ['z', 'a']);
    assert.deepEqual(sortKeysDeep(['z', 'a', 'z'], 'business.skills'), ['a', 'z']);

    const changed = canonicalizeCreatePayload({
      ...base,
      person: { ...base.person, nom: 'Autre' },
    });
    assert.notEqual(computeRequestHash(a), computeRequestHash(changed));

    const p1 = path.join(os.tmpdir(), `h1-${Date.now()}.bin`);
    const p2 = path.join(os.tmpdir(), `h2-${Date.now()}.bin`);
    fs.writeFileSync(p1, Buffer.from([1, 2, 3]));
    fs.writeFileSync(p2, Buffer.from([1, 2, 3]));
    try {
      const s1 = await sha256File(p1);
      const s2 = await sha256File(p2);
      assert.equal(s1, s2);
      const h1 = computeRequestHash(a, [{ kind: 'profilePhoto', sha256: s1 }]);
      const h2 = computeRequestHash(a, [{ kind: 'profilePhoto', sha256: s2 }]);
      assert.equal(h1, h2);
      const h3 = computeRequestHash(a, [
        { kind: 'profilePhoto', sha256: crypto.createHash('sha256').update('x').digest('hex') },
      ]);
      assert.notEqual(h1, h3);
    } finally {
      fs.unlinkSync(p1);
      fs.unlinkSync(p2);
    }

    // requestHash client n’entre pas dans le canonique
    const withClientHash = canonicalizeCreatePayload({ ...base, requestHash: 'evil' });
    assert.equal(withClientHash.requestHash, undefined);
  });
});
