/**
 * DASH-5B — Vérification runtime CRUD / statuts HTTP (Mongo isolé, node:test).
 * Mutations uniquement sur fixtures CRUD_AUDIT_* — jamais sur données préexistantes.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';

import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import Utilisateur from '../models/utilisateurModel.js';
import Groupe from '../models/groupeModel.js';
import Promotion from '../models/promotionModel.js';
import groupeRouter from '../routes/groupeRoutes.js';
import promotionRouter from '../routes/promotionRoutes.js';

const SECRET = 'dash5b-crud-audit-secret-min-32-chars!!';
const FAKE_ID = '000000000000000000000000';

let server;
let baseUrl;
let adminToken;
let clientToken;

function issueToken(userId, role) {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, { expiresIn: '1h' });
}

async function request(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
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
  return { status: res.status, json, contentType: res.headers.get('content-type') };
}

describe('DASH-5B — auth catalogue (isolé)', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    await startIsolatedMongo();

    const app = express();
    app.use(express.json());
    app.use('/api', groupeRouter);
    app.use('/api', promotionRouter);
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

    const admin = await Utilisateur.create({
      nom: 'Audit',
      prenom: 'Admin',
      telephone: '+2250700000101',
      email: 'dash5b-admin@test.local',
      password: 'GateTest1a!!',
      role: 'Admin',
      isActive: true,
    });
    adminToken = issueToken(admin._id, 'Admin');
    admin.tokens = [{ token: adminToken }];
    await admin.save();

    const client = await Utilisateur.create({
      nom: 'Audit',
      prenom: 'Client',
      telephone: '+2250700000102',
      email: 'dash5b-client@test.local',
      password: 'GateTest1a!!',
      role: 'Client',
      isActive: true,
    });
    clientToken = issueToken(client._id, 'Client');
    client.tokens = [{ token: clientToken }];
    await client.save();
  });

  it('GET /api/groupe → 200 tableau (public)', async () => {
    const r = await request('GET', '/api/groupe');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json));
  });

  it('POST /api/groupe sans token → 401', async () => {
    const r = await request('POST', '/api/groupe', { body: { nomgroupe: 'CRUD_AUDIT_GROUP_x' } });
    assert.equal(r.status, 401);
  });

  it('POST /api/groupe token Client → 403', async () => {
    const r = await request('POST', '/api/groupe', {
      token: clientToken,
      body: { nomgroupe: 'CRUD_AUDIT_GROUP_x' },
    });
    assert.equal(r.status, 403);
  });

  it('GET /api/groupe/:id inexistant → 404', async () => {
    const r = await request('GET', `/api/groupe/${FAKE_ID}`);
    assert.equal(r.status, 404);
  });

  it('POST /api/groupe payload invalide (nom absent) → 400', async () => {
    const r = await request('POST', '/api/groupe', { token: adminToken, body: {} });
    assert.equal(r.status, 400);
  });

  it('cycle CRUD groupe fixture CRUD_AUDIT_GROUP_', async () => {
    const name = `CRUD_AUDIT_GROUP_${Date.now()}`;
    const created = await request('POST', '/api/groupe', {
      token: adminToken,
      body: { nomgroupe: name },
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.nomgroupe, name);
    const id = created.json._id;

    const updated = await request('PUT', `/api/groupe/${id}`, {
      token: adminToken,
      body: { nomgroupe: `${name}_UPD` },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.json.nomgroupe, `${name}_UPD`);

    const deleted = await request('DELETE', `/api/groupe/${id}`, { token: adminToken });
    assert.equal(deleted.status, 200);

    const gone = await request('GET', `/api/groupe/${id}`);
    assert.equal(gone.status, 404);
  });

  it('GET /api/promotions/stats sans token → 401', async () => {
    const r = await request('GET', '/api/promotions/stats');
    assert.equal(r.status, 401);
  });

  it('GET /api/promotions/stats admin → 200 nombres finis', async () => {
    await Promotion.create({
      titre: 'CRUD_AUDIT_PROMO',
      description: 'Test stats',
      typeOffre: 'POURCENTAGE',
      valeurOffre: 10,
      dateDebut: new Date('2026-01-01'),
      dateFin: new Date('2026-12-31'),
      statut: 'ACTIVE',
      vues: 3,
      clics: 2,
      conversions: 1,
      createur: (await Utilisateur.findOne({ role: 'Admin' }))._id,
    });

    const r = await request('GET', '/api/promotions/stats', { token: adminToken });
    assert.equal(r.status, 200);
    const b = r.json;
    for (const key of [
      'totalPromotions',
      'promotionsActives',
      'totalVues',
      'totalClics',
      'totalConversions',
    ]) {
      assert.equal(typeof b[key], 'number', `${key} must be number`);
      assert.ok(Number.isFinite(b[key]), `${key} must be finite`);
    }
    assert.ok(Array.isArray(b.statsParStatut));
  });

  it('POST /api/promotion dates invalides → 400', async () => {
    const r = await request('POST', '/api/promotion', {
      token: adminToken,
      body: {
        titre: 'CRUD_AUDIT_PROMOTION_BAD',
        description: 'x',
        typeOffre: 'POURCENTAGE',
        valeurOffre: 5,
        dateDebut: '2026-12-01',
        dateFin: '2026-01-01',
      },
    });
    assert.equal(r.status, 400);
    const count = await Promotion.countDocuments({ titre: 'CRUD_AUDIT_PROMOTION_BAD' });
    assert.equal(count, 0);
  });

  it('DELETE /api/promotion/:id inexistant → 404', async () => {
    const r = await request('DELETE', `/api/promotion/${FAKE_ID}`, { token: adminToken });
    assert.equal(r.status, 404);
  });
});
