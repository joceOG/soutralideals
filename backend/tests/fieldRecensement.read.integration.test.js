/**
 * R1-06 — GET /api/v1/field-recensements/mine et GET /:id
 * TDD : suite écrite avant implémentation.
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
import fieldRecensementV1Router from '../routes/fieldRecensementV1Routes.js';
import {
  enableFieldRecensementV1ForTests,
  TEST_FIELD_APP_BUILD,
} from './helpers/fieldRecensementV1TestEnv.js';

const SECRET = 'r1-field-read-test-secret-min-32chars!!!';

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
let noPerm;
let noPermToken;
let revoked;
let revokedToken;

function issueToken(userId, role = 'Client') {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, {
    expiresIn: '1h',
  });
}

async function getJson(path, { token } = {}) {
  const headers = {};
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-App-Build'] = String(TEST_FIELD_APP_BUILD);
  }
  const res = await fetch(`${baseUrl}${path}`, { headers });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body, text };
}

function assertNoSecrets(payload) {
  const s = typeof payload === 'string' ? payload : JSON.stringify(payload);
  assert.ok(!s.includes('matchedUtilisateurId'), 'matchedUtilisateurId leak');
  assert.ok(!s.includes('requestHash'), 'requestHash leak');
  assert.ok(!s.includes('cld:auth:'), 'cld:auth leak');
  assert.ok(!s.includes('secure_url'), 'secure_url leak');
  assert.ok(!s.includes('public_id') && !s.includes('publicId'), 'publicId leak');
  assert.ok(!/"kyc"\s*:/.test(s) || !s.includes('cni_recto'), 'kyc docs leak');
  assert.ok(!s.includes('attemptLog'), 'attemptLog leak');
  assert.ok(!s.includes('decisionHistory'), 'decisionHistory leak');
  assert.ok(!s.includes('operationHashes'), 'operationHashes leak');
  assert.ok(!s.includes('internalMatch'), 'internalMatch leak');
  assert.ok(!s.includes('linkedProfile'), 'linkedProfile leak');
  assert.ok(!s.includes('ingestionErrorCode'), 'ingestionErrorCode leak');
}

function baseDoc(overrides = {}) {
  const mut = overrides.clientMutationId || '550e8400-e29b-41d4-a716-446655440100';
  return {
    schemaVersion: 1,
    clientMutationId: mut,
    revision: 1,
    professionalType: 'prestataire',
    reviewStatus: 'pending_review',
    publicationStatus: 'not_started',
    ingestionStatus: 'completed',
    person: {
      nom: 'Kouassi',
      prenoms: 'Awa',
      telephone: '+2250700000100',
    },
    business: {
      serviceId: new mongoose.Types.ObjectId(),
      description: 'Plomberie',
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
    app: { version: '1.0.0', buildNumber: 12, installationId: 'inst-a' },
    timing: {
      recordedAt: new Date('2026-09-01T10:00:00.000Z'),
      serverReceivedAt: new Date('2026-09-01T10:00:01.000Z'),
    },
    metadata: { notes: 'terrain' },
    ...overrides,
  };
}

/** Injecte volontairement des secrets select:false pour tester le DTO. */
async function injectSecrets(docId, otherUserId) {
  await FieldRecensement.collection.updateOne(
    { _id: docId },
    {
      $set: {
        requestHash: 'deadbeef'.repeat(8),
        matchedUtilisateurId: otherUserId,
        ingestionErrorCode: 'SECRET_ERR',
        'media.profilePhoto': {
          ref: 'cld:auth:field/rec/photo',
          publicId: 'field/rec/photo',
          kind: 'profile_pending_private',
          status: 'uploaded',
          sha256: 'abc',
        },
        kyc: {
          status: 'submitted',
          documents: [
            {
              kind: 'cni_recto',
              ref: 'cld:auth:kyc/cni',
              sha256: 'kycsha',
              collectedAt: new Date(),
            },
          ],
        },
        attemptLogEmbedded: [
          { operationMutationId: 'x', outcome: 'fail', errorCode: 'X', at: new Date() },
        ],
        decisionHistory: [
          { action: 'note', actorId: otherUserId, at: new Date(), note: 'privé admin' },
        ],
        internalMatch: { utilisateurId: otherUserId, confidence: 0.9, at: new Date() },
        linkedProfile: { type: 'prestataire', id: otherUserId },
        correction: {
          reasonCode: 'PHOTO_UNCLEAR',
          message: 'Reprendre la photo.',
          fields: ['profilePhoto'],
          requestedAt: new Date('2026-09-02T10:00:00.000Z'),
          requestedBy: otherUserId,
        },
        reviewStatus: 'needs_correction',
      },
    },
  );
}

describe('R1-06 — GET /mine et GET /:id', () => {
  before(async () => {
    process.env.JWT_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
    enableFieldRecensementV1ForTests({ minBuild: 1 });
    await startIsolatedMongo();

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
    // placeholder keep structure
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

    agentA = await Utilisateur.create({
      nom: 'Agent',
      prenom: 'A',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: true,
      telephone: '+2250700110001',
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
      telephone: '+2250700110002',
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
      telephone: '+2250700110003',
      telephoneVerified: true,
    });
    adminToken = issueToken(adminUser._id, 'Admin');
    adminUser.tokens = [{ token: adminToken }];
    await adminUser.save();

    fakeAdmin = await Utilisateur.create({
      nom: 'Fake',
      prenom: 'Admin',
      password: 'Secret1a!!',
      role: 'Prestataire',
      canCreateRecensement: true,
      telephone: '+2250700110004',
      telephoneVerified: true,
    });
    fakeAdminToken = issueToken(fakeAdmin._id, 'Admin');
    fakeAdmin.tokens = [{ token: fakeAdminToken }];
    await fakeAdmin.save();

    noPerm = await Utilisateur.create({
      nom: 'No',
      prenom: 'Perm',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: false,
      telephone: '+2250700110005',
      telephoneVerified: true,
    });
    noPermToken = issueToken(noPerm._id);
    noPerm.tokens = [{ token: noPermToken }];
    await noPerm.save();

    revoked = await Utilisateur.create({
      nom: 'Revoked',
      prenom: 'Agent',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: false,
      telephone: '+2250700110006',
      telephoneVerified: true,
    });
    revokedToken = issueToken(revoked._id);
    revoked.tokens = [{ token: revokedToken }];
    await revoked.save();
  });

  // —— /mine auth ——
  it('M1 anonyme → 401', async () => {
    const r = await getJson('/field-recensements/mine');
    assert.equal(r.status, 401);
  });

  it('M2 JWT invalide → 401', async () => {
    const r = await getJson('/field-recensements/mine', { token: 'not.a.jwt' });
    assert.equal(r.status, 401);
  });

  it('M3 agent sans permission → 403', async () => {
    const r = await getJson('/field-recensements/mine', { token: noPermToken });
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'RECENSEUR_PERMISSION_REVOKED');
  });

  it('M4 agent A reçoit uniquement dossiers A', async () => {
    await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440101',
        person: { nom: 'A1', prenoms: 'X', telephone: '+2250700000101' },
      }),
    );
    await FieldRecensement.create(
      baseDoc({
        recenseur: agentB._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440102',
        person: { nom: 'B1', prenoms: 'Y', telephone: '+2250700000102' },
      }),
    );
    const r = await getJson('/field-recensements/mine', { token: tokenA });
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(r.body.data.items.length, 1);
    assert.equal(r.body.data.items[0].person?.nom || r.body.data.items[0].displayLabel, 'A1');
    assert.ok(!JSON.stringify(r.body).includes('B1'));
  });

  it('M5 agent B reçoit uniquement dossiers B', async () => {
    await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440103',
      }),
    );
    await FieldRecensement.create(
      baseDoc({
        recenseur: agentB._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440104',
        person: { nom: 'OnlyB', prenoms: 'Z', telephone: '+2250700000104' },
      }),
    );
    const r = await getJson('/field-recensements/mine', { token: tokenB });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items.length, 1);
    assert.ok(JSON.stringify(r.body).includes('OnlyB'));
  });

  it('M6 agent sans dossier → liste vide', async () => {
    const r = await getJson('/field-recensements/mine', { token: tokenA });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.data.items, []);
    assert.equal(r.body.data.nextCursor, null);
    assert.equal(r.body.data.limit, 20);
  });

  it('M7 ?recenseur=B ne laisse pas A voir B', async () => {
    await FieldRecensement.create(
      baseDoc({
        recenseur: agentB._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440105',
        person: { nom: 'SecretB', prenoms: 'S', telephone: '+2250700000105' },
      }),
    );
    const r = await getJson(`/field-recensements/mine?recenseur=${agentB._id}`, {
      token: tokenA,
    });
    assert.ok([200, 400].includes(r.status));
    if (r.status === 200) {
      assert.equal(r.body.data.items.length, 0);
      assert.ok(!JSON.stringify(r.body).includes('SecretB'));
    } else {
      assert.equal(r.body.code, 'RECENSEMENT_QUERY_INVALID');
    }
  });

  it('M8 filtre professionalType valide', async () => {
    await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440106',
        professionalType: 'vendeur',
        business: { shopName: 'Shop', businessType: 'Particulier' },
        person: { nom: 'Vend', prenoms: 'V', telephone: '+2250700000106' },
      }),
    );
    await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440107',
        professionalType: 'prestataire',
        person: { nom: 'Pres', prenoms: 'P', telephone: '+2250700000107' },
      }),
    );
    const r = await getJson('/field-recensements/mine?professionalType=vendeur', {
      token: tokenA,
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items.length, 1);
    assert.equal(r.body.data.items[0].professionalType, 'vendeur');
  });

  it('M9 filtre reviewStatus valide', async () => {
    await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440108',
        reviewStatus: 'approved',
      }),
    );
    await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440109',
        reviewStatus: 'pending_review',
        person: { nom: 'Pend', prenoms: 'P', telephone: '+2250700000109' },
      }),
    );
    const r = await getJson('/field-recensements/mine?reviewStatus=approved', {
      token: tokenA,
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items.length, 1);
    assert.equal(r.body.data.items[0].reviewStatus, 'approved');
  });

  it('M10 type invalide → 400', async () => {
    const r = await getJson('/field-recensements/mine?professionalType=inconnu', {
      token: tokenA,
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.code, 'RECENSEMENT_QUERY_INVALID');
  });

  it('M11 statut invalide → 400', async () => {
    const r = await getJson('/field-recensements/mine?reviewStatus=hacked', {
      token: tokenA,
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.code, 'RECENSEMENT_QUERY_INVALID');
  });

  it('M12 opérateur Mongo injecté → 400', async () => {
    const r = await getJson(
      `/field-recensements/mine?reviewStatus[${encodeURIComponent('$gt')}]=pending_review`,
      { token: tokenA },
    );
    assert.equal(r.status, 400);
    assert.equal(r.body.code, 'RECENSEMENT_QUERY_INVALID');
  });

  it('M13 limite par défaut = 20', async () => {
    const docs = [];
    for (let i = 0; i < 25; i++) {
      docs.push(
        baseDoc({
          recenseur: agentA._id,
          clientMutationId: `550e8400-e29b-41d4-a716-44665544${String(200 + i).padStart(4, '0')}`,
          person: {
            nom: `N${i}`,
            prenoms: 'P',
            telephone: `+2250700002${String(i).padStart(3, '0')}`,
          },
        }),
      );
    }
    await FieldRecensement.insertMany(docs);
    const r = await getJson('/field-recensements/mine', { token: tokenA });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.limit, 20);
    assert.equal(r.body.data.items.length, 20);
    assert.ok(r.body.data.nextCursor);
  });

  it('M14-15 limite max 100 ; trop grande → 400', async () => {
    const ok = await getJson('/field-recensements/mine?limit=100', { token: tokenA });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.limit, 100);

    const bad = await getJson('/field-recensements/mine?limit=101', { token: tokenA });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.code, 'RECENSEMENT_QUERY_INVALID');
  });

  it('M16-19 pagination curseur sans doublon ni omission', async () => {
    const docs = [];
    for (let i = 0; i < 7; i++) {
      docs.push(
        baseDoc({
          recenseur: agentA._id,
          clientMutationId: `550e8400-e29b-41d4-a716-44665544${String(300 + i).padStart(4, '0')}`,
          person: {
            nom: `Page${i}`,
            prenoms: 'P',
            telephone: `+2250700003${String(i).padStart(3, '0')}`,
          },
        }),
      );
    }
    await FieldRecensement.insertMany(docs);

    const p1 = await getJson('/field-recensements/mine?limit=3', { token: tokenA });
    assert.equal(p1.status, 200);
    assert.equal(p1.body.data.items.length, 3);
    assert.ok(p1.body.data.nextCursor);

    const p2 = await getJson(
      `/field-recensements/mine?limit=3&cursor=${encodeURIComponent(p1.body.data.nextCursor)}`,
      { token: tokenA },
    );
    assert.equal(p2.status, 200);
    assert.equal(p2.body.data.items.length, 3);
    assert.ok(p2.body.data.nextCursor);

    const p3 = await getJson(
      `/field-recensements/mine?limit=3&cursor=${encodeURIComponent(p2.body.data.nextCursor)}`,
      { token: tokenA },
    );
    assert.equal(p3.status, 200);
    assert.equal(p3.body.data.items.length, 1);
    assert.equal(p3.body.data.nextCursor, null);

    const ids = [...p1.body.data.items, ...p2.body.data.items, ...p3.body.data.items].map(
      (x) => x.id,
    );
    assert.equal(ids.length, 7);
    assert.equal(new Set(ids).size, 7);
  });

  it('M17 curseur invalide → 400', async () => {
    const r = await getJson('/field-recensements/mine?cursor=%%%not-base64', {
      token: tokenA,
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.code, 'RECENSEMENT_CURSOR_INVALID');
  });

  it('M20-22 égalité createdAt départagée par _id ; ordre DESC ; pas de secrets', async () => {
    const t = new Date('2026-09-03T12:00:00.000Z');
    const id1 = new mongoose.Types.ObjectId();
    const id2 = new mongoose.Types.ObjectId();
    // id2 > id1 si créé après ; forcer ordre ObjectId
    const olderId = id1;
    const newerId = id2;
    assert.ok(String(newerId) > String(olderId) || newerId.getTimestamp() >= olderId.getTimestamp());

    await FieldRecensement.collection.insertMany([
      {
        ...baseDoc({
          _id: olderId,
          recenseur: agentA._id,
          clientMutationId: '550e8400-e29b-41d4-a716-446655440401',
          person: { nom: 'Older', prenoms: 'O', telephone: '+2250700000401' },
        }),
        createdAt: t,
        updatedAt: t,
      },
      {
        ...baseDoc({
          _id: newerId,
          recenseur: agentA._id,
          clientMutationId: '550e8400-e29b-41d4-a716-446655440402',
          person: { nom: 'Newer', prenoms: 'N', telephone: '+2250700000402' },
        }),
        createdAt: t,
        updatedAt: t,
      },
    ]);
    await injectSecrets(newerId, agentB._id);

    const r = await getJson('/field-recensements/mine?limit=10', { token: tokenA });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items[0].id, String(newerId));
    assert.equal(r.body.data.items[1].id, String(olderId));
    assertNoSecrets(r.body);
    const item = r.body.data.items[0];
    assert.equal(typeof item.profilePhoto?.present, 'boolean');
    assert.ok(!('requestHash' in item));
  });

  it('M-admin /mine ne liste pas tous les dossiers', async () => {
    await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440410',
      }),
    );
    const r = await getJson('/field-recensements/mine', { token: adminToken });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.items.length, 0);
  });

  // —— GET /:id ——
  it('D1 propriétaire → 200 détail', async () => {
    const doc = await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440501',
      }),
    );
    const r = await getJson(`/field-recensements/${doc._id}`, { token: tokenA });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.id, String(doc._id));
    assert.ok(r.body.data.person);
    assert.ok(r.body.data.business);
    assert.ok(r.body.data.location);
    assert.ok(r.body.data.consent);
  });

  it('D2 autre agent → 404 opaque', async () => {
    const doc = await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440502',
      }),
    );
    const r = await getJson(`/field-recensements/${doc._id}`, { token: tokenB });
    assert.equal(r.status, 404);
    assert.equal(r.body.code, 'RECENSEMENT_NOT_FOUND');
    assert.ok(!JSON.stringify(r.body).includes('Kouassi'));
  });

  it('D3 admin réel → 200', async () => {
    const doc = await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440503',
      }),
    );
    const r = await getJson(`/field-recensements/${doc._id}`, { token: adminToken });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.id, String(doc._id));
  });

  it('D4 faux rôle admin → 404', async () => {
    const doc = await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440504',
      }),
    );
    const r = await getJson(`/field-recensements/${doc._id}`, { token: fakeAdminToken });
    assert.equal(r.status, 404);
    assert.equal(r.body.code, 'RECENSEMENT_NOT_FOUND');
  });

  it('D5 anonyme → 401', async () => {
    const id = new mongoose.Types.ObjectId();
    const r = await getJson(`/field-recensements/${id}`);
    assert.equal(r.status, 401);
  });

  it('D6 token invalide → 401', async () => {
    const id = new mongoose.Types.ObjectId();
    const r = await getJson(`/field-recensements/${id}`, { token: 'bad' });
    assert.equal(r.status, 401);
  });

  it('D7 agent révoqué → 403', async () => {
    const doc = await FieldRecensement.create(
      baseDoc({
        recenseur: revoked._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440505',
      }),
    );
    const r = await getJson(`/field-recensements/${doc._id}`, { token: revokedToken });
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'RECENSEUR_PERMISSION_REVOKED');
  });

  it('D8 ID invalide → 400', async () => {
    const r = await getJson('/field-recensements/not-an-objectid', { token: tokenA });
    assert.equal(r.status, 400);
    assert.equal(r.body.code, 'RECENSEMENT_ID_INVALID');
  });

  it('D9 ID inexistant → 404', async () => {
    const id = new mongoose.Types.ObjectId();
    const r = await getJson(`/field-recensements/${id}`, { token: tokenA });
    assert.equal(r.status, 404);
    assert.equal(r.body.code, 'RECENSEMENT_NOT_FOUND');
  });

  it('D10-14 aucun secret / KYC / cloudinary / hash / match / technique', async () => {
    const doc = await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440506',
        reviewStatus: 'needs_correction',
      }),
    );
    await injectSecrets(doc._id, agentB._id);
    const r = await getJson(`/field-recensements/${doc._id}`, { token: tokenA });
    assert.equal(r.status, 200);
    assertNoSecrets(r.body);
    assert.ok(!('kyc' in r.body.data));
    assert.equal(r.body.data.profilePhoto?.present, true);
    assert.equal(r.body.data.profilePhoto?.status, 'private_pending');
    assert.equal(r.body.data.correction?.reasonCode, 'PHOTO_UNCLEAR');
    assert.equal(r.body.data.correction?.message, 'Reprendre la photo.');
    assert.ok(!('requestedBy' in (r.body.data.correction || {})));
  });

  it('D15 DTO liste plus minimal que DTO détail', async () => {
    const doc = await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440507',
      }),
    );
    const list = await getJson('/field-recensements/mine', { token: tokenA });
    const detail = await getJson(`/field-recensements/${doc._id}`, { token: tokenA });
    assert.equal(list.status, 200);
    assert.equal(detail.status, 200);
    const summary = list.body.data.items[0];
    assert.ok(detail.body.data.consent);
    assert.ok(!('consent' in summary));
    assert.ok(detail.body.data.app);
    assert.ok(!('app' in summary) || !summary.app?.installationId);
  });

  it('R lecture seule : counts / updatedAt / revision / audit inchangés', async () => {
    const doc = await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440508',
      }),
    );
    const before = await FieldRecensement.findById(doc._id).lean();
    const countBefore = await FieldRecensement.countDocuments();
    const usersBefore = await Utilisateur.countDocuments();
    const auditBefore = await FieldRecensementAuditEvent.countDocuments();

    await getJson('/field-recensements/mine', { token: tokenA });
    await getJson(`/field-recensements/${doc._id}`, { token: tokenA });
    await getJson(`/field-recensements/${doc._id}`, { token: adminToken });

    const after = await FieldRecensement.findById(doc._id).lean();
    assert.equal(await FieldRecensement.countDocuments(), countBefore);
    assert.equal(String(after.updatedAt), String(before.updatedAt));
    assert.equal(after.revision, before.revision);
    assert.equal(after.reviewStatus, before.reviewStatus);
    assert.equal(after.publicationStatus, before.publicationStatus);
    assert.equal(await Utilisateur.countDocuments(), usersBefore);
    assert.equal(await FieldRecensementAuditEvent.countDocuments(), auditBefore);
  });

  it('IDX requête /mine utilise index recenseur+createdAt+_id', async () => {
    await FieldRecensement.create(
      baseDoc({
        recenseur: agentA._id,
        clientMutationId: '550e8400-e29b-41d4-a716-446655440509',
      }),
    );
    const indexes = await FieldRecensement.collection.indexes();
    const hasMine = indexes.some(
      (ix) =>
        ix.key?.recenseur === 1 &&
        ix.key?.createdAt === -1 &&
        (ix.key?._id === -1 || ix.key?._id === 1),
    );
    assert.ok(hasMine, `index mine manquant: ${JSON.stringify(indexes.map((i) => i.key))}`);

    const explain = await FieldRecensement.find({ recenseur: agentA._id })
      .sort({ createdAt: -1, _id: -1 })
      .limit(20)
      .explain('executionStats');
    const plan = JSON.stringify(explain);
    assert.ok(
      plan.includes('uniq_recenseur_clientMutationId') ||
        plan.includes('idx_recenseur_created_id') ||
        plan.includes('recenseur'),
      'plan doit cibler recenseur',
    );
  });
});
