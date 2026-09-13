/**
 * R3-01 — GET /api/v1/field-recensements/admin/queue (+ stats)
 * Auth Admin réelle, pagination curseur, filtres allowlist, DTO sans KYC.
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
  disableFieldRecensementV1ForTests,
  TEST_FIELD_APP_BUILD,
} from './helpers/fieldRecensementV1TestEnv.js';
import { maskTelephoneForAdminList } from '../utils/fieldRecensementDto.js';

const SECRET = 'r3-01-admin-queue-test-secret-min-32!!';

let server;
let baseUrl;
let agentA;
let tokenA;
let adminUser;
let adminToken;
let fakeAdmin;
let fakeAdminToken;

function issueToken(userId, role = 'Client') {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, {
    expiresIn: '1h',
  });
}

async function getJson(path, { token, build } = {}) {
  const headers = {};
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (build !== undefined) {
    headers['X-App-Build'] = String(build);
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
  assert.ok(!s.includes('currentContentHash'), 'currentContentHash leak');
  assert.ok(!s.includes('cld:auth:'), 'cld:auth leak');
  assert.ok(!s.includes('secure_url'), 'secure_url leak');
  assert.ok(!s.includes('publicId') && !s.includes('public_id'), 'publicId leak');
  assert.ok(!/"kyc"\s*:/.test(s), 'kyc key leak');
  assert.ok(!s.includes('attemptLog'), 'attemptLog leak');
  assert.ok(!s.includes('decisionHistory'), 'decisionHistory leak');
  assert.ok(!s.includes('internalMatch'), 'internalMatch leak');
  assert.ok(!s.includes('publicationLinkedUtilisateurId'), 'linked user leak');
}

function baseDoc(overrides = {}) {
  const mut =
    overrides.clientMutationId ||
    `550e8400-e29b-41d4-a716-${String(Math.floor(Math.random() * 1e12)).padStart(12, '0')}`;
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
    location: { commune: 'Cocody', quartier: 'Riviera' },
    consent: {
      recensementAccepted: true,
      acceptedAt: new Date(),
      textVersion: 'v1',
      method: 'checkbox',
      language: 'fr',
    },
    app: { version: '1.0.0', buildNumber: TEST_FIELD_APP_BUILD },
    timing: { recordedAt: new Date(), serverReceivedAt: new Date() },
    recenseur: agentA._id,
    ...overrides,
  };
}

describe('R3-01 admin queue', () => {
  before(async () => {
    process.env.JWT_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
    await startIsolatedMongo();
    enableFieldRecensementV1ForTests();

    const app = express();
    app.use(express.json());
    app.use('/api/v1', fieldRecensementV1Router);
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    enableFieldRecensementV1ForTests();

    agentA = await Utilisateur.create({
      nom: 'Agent',
      prenom: 'A',
      telephone: '+2250700000001',
      email: 'agent-a-r301@test.local',
      password: 'GateTest1a!!',
      role: 'Client',
      canCreateRecensement: true,
      isActive: true,
    });
    tokenA = issueToken(agentA._id, 'Client');
    agentA.tokens = [{ token: tokenA }];
    await agentA.save();

    adminUser = await Utilisateur.create({
      nom: 'Admin',
      prenom: 'Real',
      telephone: '+2250700000099',
      email: 'admin-r301@test.local',
      password: 'GateTest1a!!',
      role: 'Admin',
      isActive: true,
    });
    adminToken = issueToken(adminUser._id, 'Admin');
    adminUser.tokens = [{ token: adminToken }];
    await adminUser.save();

    fakeAdmin = await Utilisateur.create({
      nom: 'Fake',
      prenom: 'Admin',
      telephone: '+2250700000088',
      email: 'fake-admin-r301@test.local',
      password: 'GateTest1a!!',
      role: 'Prestataire',
      canCreateRecensement: true,
      isActive: true,
    });
    fakeAdminToken = issueToken(fakeAdmin._id, 'Admin');
    fakeAdmin.tokens = [{ token: fakeAdminToken }];
    await fakeAdmin.save();
  });

  it('refuse anonyme / agent / faux Admin ; accepte vrai Admin sans X-App-Build', async () => {
    const anon = await getJson('/api/v1/field-recensements/admin/queue');
    assert.equal(anon.status, 401);

    const agent = await getJson('/api/v1/field-recensements/admin/queue', {
      token: tokenA,
      build: TEST_FIELD_APP_BUILD,
    });
    assert.equal(agent.status, 403);
    assert.equal(agent.body?.code, 'ADMIN_REQUIRED');

    const fake = await getJson('/api/v1/field-recensements/admin/queue', {
      token: fakeAdminToken,
    });
    assert.equal(fake.status, 403);
    assert.equal(fake.body?.code, 'ADMIN_REQUIRED');

    const ok = await getJson('/api/v1/field-recensements/admin/queue', {
      token: adminToken,
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body?.success, true);
    assert.ok(Array.isArray(ok.body?.data?.items));
  });

  it('flag désactivé → 503 uniforme', async () => {
    disableFieldRecensementV1ForTests();
    const res = await getJson('/api/v1/field-recensements/admin/queue', {
      token: adminToken,
    });
    assert.equal(res.status, 503);
    assert.equal(res.body?.code, 'FIELD_RECENSEMENT_V1_DISABLED');
  });

  it('pagination curseur stable sans doublon ; refuse curseur altéré et limit excessif', async () => {
    const t0 = Date.now();
    for (let i = 0; i < 5; i += 1) {
      // Même createdAt volontaire pour tester tie-break _id
      const createdAt = new Date(t0);
      await FieldRecensement.create(
        baseDoc({
          clientMutationId: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
          person: {
            nom: `N${i}`,
            prenoms: 'A',
            telephone: `+22507000001${String(i).padStart(2, '0')}`,
          },
          createdAt,
          updatedAt: createdAt,
        }),
      );
    }

    const p1 = await getJson('/api/v1/field-recensements/admin/queue?limit=2', {
      token: adminToken,
    });
    assert.equal(p1.status, 200);
    assert.equal(p1.body.data.items.length, 2);
    assert.ok(p1.body.data.nextCursor);

    const p2 = await getJson(
      `/api/v1/field-recensements/admin/queue?limit=2&cursor=${encodeURIComponent(p1.body.data.nextCursor)}`,
      { token: adminToken },
    );
    assert.equal(p2.status, 200);
    const ids1 = p1.body.data.items.map((x) => x.id);
    const ids2 = p2.body.data.items.map((x) => x.id);
    assert.equal(new Set([...ids1, ...ids2]).size, ids1.length + ids2.length);

    const bad = await getJson('/api/v1/field-recensements/admin/queue?cursor=%%%', {
      token: adminToken,
    });
    assert.equal(bad.status, 400);
    assert.equal(bad.body?.code, 'RECENSEMENT_CURSOR_INVALID');

    const lim = await getJson('/api/v1/field-recensements/admin/queue?limit=999', {
      token: adminToken,
    });
    assert.equal(lim.status, 400);
    assert.equal(lim.body?.code, 'RECENSEMENT_QUERY_INVALID');
  });

  it('filtres allowlist + refuse injection / clé inconnue / ObjectId invalide', async () => {
    await FieldRecensement.create(
      baseDoc({
        reviewStatus: 'approved',
        publicationStatus: 'not_started',
        professionalType: 'vendeur',
        location: { commune: 'Yopougon', quartier: 'Sicogi' },
      }),
    );
    await FieldRecensement.create(
      baseDoc({
        clientMutationId: '550e8400-e29b-41d4-a716-446655440201',
        reviewStatus: 'pending_review',
        professionalType: 'freelance',
      }),
    );

    const filtered = await getJson(
      '/api/v1/field-recensements/admin/queue?reviewStatus=approved&professionalType=vendeur&commune=Yopougon',
      { token: adminToken },
    );
    assert.equal(filtered.status, 200);
    assert.equal(filtered.body.data.items.length, 1);
    assert.equal(filtered.body.data.items[0].professionalType, 'vendeur');

    const inj = await getJson(
      '/api/v1/field-recensements/admin/queue?reviewStatus[$gt]=x',
      { token: adminToken },
    );
    assert.equal(inj.status, 400);
    assert.equal(inj.body?.code, 'RECENSEMENT_QUERY_INVALID');

    const unknown = await getJson('/api/v1/field-recensements/admin/queue?foo=bar', {
      token: adminToken,
    });
    assert.equal(unknown.status, 400);

    const badId = await getJson(
      '/api/v1/field-recensements/admin/queue?recenseurId=not-an-id',
      { token: adminToken },
    );
    assert.equal(badId.status, 400);
  });

  it('DTO liste : téléphone masqué, pas de KYC/secrets ; détail admin sans URL photo', async () => {
    const doc = await FieldRecensement.create(
      baseDoc({
        person: { nom: 'Traore', prenoms: 'Binta', telephone: '+2250700999888' },
        media: { profilePhoto: { kind: 'profile_pending_private', status: 'uploaded' } },
      }),
    );

    const list = await getJson('/api/v1/field-recensements/admin/queue', {
      token: adminToken,
    });
    assert.equal(list.status, 200);
    assertNoSecrets(list.body);
    const row = list.body.data.items[0];
    assert.equal(row.telephoneMasked, maskTelephoneForAdminList('+2250700999888'));
    assert.ok(!JSON.stringify(row).includes('0700999888'));
    assert.equal(row.hasPhoto, true);
    assert.equal(row.recenseur?.id, String(agentA._id));

    const detail = await getJson(`/api/v1/field-recensements/${doc._id}`, {
      token: adminToken,
    });
    assert.equal(detail.status, 200);
    assertNoSecrets(detail.body);
    assert.equal(detail.body.data.person.telephone, '+2250700999888');
    assert.deepEqual(detail.body.data.profilePhoto, {
      present: true,
      status: 'private_pending',
    });
  });

  it('compteurs agrégés + dossiers incohérents visibles', async () => {
    await FieldRecensement.create(baseDoc({ reviewStatus: 'pending_review' }));
    await FieldRecensement.create(
      baseDoc({
        clientMutationId: '550e8400-e29b-41d4-a716-446655440301',
        reviewStatus: 'needs_correction',
      }),
    );
    await FieldRecensement.create(
      baseDoc({
        clientMutationId: '550e8400-e29b-41d4-a716-446655440302',
        reviewStatus: 'approved',
        publicationStatus: 'not_started',
      }),
    );
    await FieldRecensement.create(
      baseDoc({
        clientMutationId: '550e8400-e29b-41d4-a716-446655440303',
        reviewStatus: 'approved',
        publicationStatus: 'published',
      }),
    );
    await FieldRecensement.create(
      baseDoc({
        clientMutationId: '550e8400-e29b-41d4-a716-446655440304',
        reviewStatus: 'rejected',
      }),
    );
    await FieldRecensement.create(
      baseDoc({
        clientMutationId: '550e8400-e29b-41d4-a716-446655440305',
        reviewStatus: 'rejected',
        publicationStatus: 'published', // incohérent
      }),
    );
    await FieldRecensement.create(
      baseDoc({
        clientMutationId: '550e8400-e29b-41d4-a716-446655440306',
        reviewStatus: 'approved',
        publicationStatus: 'failed',
      }),
    );

    const stats = await getJson('/api/v1/field-recensements/admin/queue/stats', {
      token: adminToken,
    });
    assert.equal(stats.status, 200);
    assertNoSecrets(stats.body);
    const c = stats.body.data.counts;
    assert.equal(c.total, 7);
    assert.equal(c.pending_review, 1);
    assert.equal(c.needs_correction, 1);
    assert.ok(c.approved_awaiting_publication >= 1);
    assert.equal(c.published, 2);
    assert.equal(c.rejected, 2);
    assert.equal(c.publication_failed, 1);
    assert.ok(c.attention_required >= 1);
  });

  it('lecture seule : aucun audit décisionnel / pas de mutation de révision', async () => {
    const doc = await FieldRecensement.create(baseDoc({ revision: 3 }));
    const beforeAudits = await FieldRecensementAuditEvent.countDocuments();
    const beforeUsers = await Utilisateur.countDocuments();

    await getJson('/api/v1/field-recensements/admin/queue', { token: adminToken });
    await getJson('/api/v1/field-recensements/admin/queue/stats', { token: adminToken });
    await getJson(`/api/v1/field-recensements/${doc._id}`, { token: adminToken });

    const again = await FieldRecensement.findById(doc._id).lean();
    assert.equal(again.revision, 3);
    assert.equal(again.reviewStatus, 'pending_review');
    assert.equal(await FieldRecensementAuditEvent.countDocuments(), beforeAudits);
    assert.equal(await Utilisateur.countDocuments(), beforeUsers);
  });
});
