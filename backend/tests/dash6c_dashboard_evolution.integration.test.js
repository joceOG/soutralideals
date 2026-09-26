/**
 * DASH-6C — GET /api/admin/dashboard/evolution (Mongo isolé, node:test).
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
import adminRouter from '../routes/adminRoutes.js';

const SECRET = 'dash6c-evolution-secret-min-32-chars!!';

let server;
let baseUrl;
let adminToken;
let clientToken;
let adminUser;

function issueToken(userId, role, expiresIn = '1h') {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, { expiresIn });
}

async function requestJson(method, urlPath, { token, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
  const headers = { 'Content-Type': 'application/json' };
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${urlPath}${qs}`, { method, headers });
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
  app.use('/api', adminRouter);
  return app;
}

async function seedUsers() {
  adminUser = await Utilisateur.create({
    nom: 'Evolution',
    prenom: 'Admin',
    telephone: '+2250700000301',
    email: 'dash6c-admin@test.local',
    password: 'GateTest1a!!',
    role: 'Admin',
    isActive: true,
  });
  adminToken = issueToken(adminUser._id, 'Admin');
  adminUser.tokens = [{ token: adminToken }];
  await adminUser.save();

  const client = await Utilisateur.create({
    nom: 'Evolution',
    prenom: 'Client',
    telephone: '+2250700000302',
    email: 'dash6c-client@test.local',
    password: 'GateTest1a!!',
    role: 'Client',
    isActive: true,
  });
  clientToken = issueToken(client._id, 'Client');
  client.tokens = [{ token: clientToken }];
  await client.save();
}

describe('DASH-6C — dashboard evolution', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    await startIsolatedMongo();
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
    await seedUsers();
  });

  it('401 sans token', async () => {
    const r = await requestJson('GET', '/api/admin/dashboard/evolution', { query: { period: '12m' } });
    assert.equal(r.status, 401);
  });

  it('403 non-admin', async () => {
    const r = await requestJson('GET', '/api/admin/dashboard/evolution', {
      token: clientToken,
      query: { period: '12m' },
    });
    assert.equal(r.status, 403);
  });

  it('400 période invalide', async () => {
    const r = await requestJson('GET', '/api/admin/dashboard/evolution', {
      token: adminToken,
      query: { period: '2y' },
    });
    assert.equal(r.status, 400);
    assert.equal(r.json.success, false);
    assert.ok(Array.isArray(r.json.allowed));
  });

  it('200 structure complète 12m', async () => {
    const r = await requestJson('GET', '/api/admin/dashboard/evolution', {
      token: adminToken,
      query: { period: '12m' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.success, true);
    const { data } = r.json;
    assert.equal(data.period, '12m');
    assert.equal(data.granularity, 'month');
    assert.equal(data.buckets.length, 12);
    assert.equal(data.series.clients.length, 12);
    assert.equal(data.series.prestataires.length, 12);
    assert.equal(data.series.freelances.length, 12);
    assert.equal(data.series.vendeurs.length, 12);
    assert.equal(data.series.users, undefined);
    for (const v of data.series.clients) {
      assert.ok(Number.isFinite(v) && v >= 0);
    }
    assert.ok(typeof data.generatedAt === 'string');
    const payload = JSON.stringify(r.json);
    assert.ok(!payload.includes('@test.local'));
    assert.ok(!payload.includes('Evolution Admin'));
  });

  it('30d granularité day et buckets=30', async () => {
    const r = await requestJson('GET', '/api/admin/dashboard/evolution', {
      token: adminToken,
      query: { period: '30d' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.granularity, 'day');
    assert.equal(r.json.data.buckets.length, 30);
  });

  it('compte les créations Client par mois (exclut Admin)', async () => {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5, 12, 0, 0));
    await Utilisateur.create({
      nom: 'U',
      prenom: '1',
      telephone: '+2250700000311',
      email: 'u-extra@test.local',
      password: 'GateTest1a!!',
      role: 'Client',
      createdAt: monthStart,
    });
    await Utilisateur.create({
      nom: 'U',
      prenom: 'AdminExtra',
      telephone: '+2250700000312',
      email: 'admin-extra@test.local',
      password: 'GateTest1a!!',
      role: 'Admin',
      createdAt: monthStart,
    });
    await Utilisateur.create({
      nom: 'U',
      prenom: 'Presta',
      telephone: '+2250700000313',
      email: 'presta-extra@test.local',
      password: 'GateTest1a!!',
      role: 'Prestataire',
      createdAt: monthStart,
    });

    const r = await requestJson('GET', '/api/admin/dashboard/evolution', {
      token: adminToken,
      query: { period: '3m' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.data.series.users, undefined);
    const key = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`;
    const idx = r.json.data.buckets.findIndex((b) => b.key === key);
    assert.ok(idx >= 0);
    // seed : 1 Client ; +1 Client ce mois ; Admin et Prestataire exclus
    assert.equal(r.json.data.series.clients[idx], 2);
  });

  it('ordre chronologique des buckets 12m', async () => {
    const r = await requestJson('GET', '/api/admin/dashboard/evolution', {
      token: adminToken,
      query: { period: '12m' },
    });
    const keys = r.json.data.buckets.map((b) => b.key);
    const sorted = [...keys].sort();
    assert.deepEqual(keys, sorted);
  });
});
