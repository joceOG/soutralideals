/**
 * Phase 7A — Rate limiter Field Recensement V1.
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
import {
  enableFieldRecensementV1ForTests,
  disableFieldRecensementV1ForTests,
  TEST_FIELD_APP_BUILD,
} from './helpers/fieldRecensementV1TestEnv.js';
import {
  createMemoryRateLimitStore,
  hashRateLimitIdentity,
  injectFieldRecensementRateLimitStore,
  resetFieldRecensementRateLimitStore,
} from '../utils/fieldRecensementRateLimitStore.js';
import {
  injectFieldRecensementRateLimitConfig,
  resetFieldRecensementRateLimitConfig,
} from '../config/fieldRecensementRateLimitConfig.js';
import Utilisateur from '../models/utilisateurModel.js';
import fieldRecensementV1Router from '../routes/fieldRecensementV1Routes.js';

const SECRET = 'r1-field-rl-test-secret-min-32chars!!!!';

function tokenFor(user, role) {
  return jwt.sign(
    { _id: String(user._id), id: String(user._id), role: role || user.role },
    SECRET,
    { expiresIn: '1h' },
  );
}

async function issueAuthedUser(fields) {
  const user = await Utilisateur.create(fields);
  const token = tokenFor(user);
  user.tokens = [{ token }];
  await user.save();
  return { user, token };
}

async function listen(app) {
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}` };
}

async function req(base, method, path, { token, headers = {}, body } = {}) {
  const res = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-App-Build': TEST_FIELD_APP_BUILD,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return {
    status: res.status,
    json,
    headers: {
      retryAfter: res.headers.get('retry-after'),
      cacheControl: res.headers.get('cache-control'),
    },
  };
}

describe('Phase 7A — field recensement rate limit', () => {
  /** @type {import('http').Server} */
  let server;
  let base;
  let agentA;
  let agentB;
  let admin;
  let tokenA;
  let tokenB;
  let tokenAdmin;
  let store;

  before(async () => {
    process.env.JWT_SECRET = SECRET;
    await startIsolatedMongo();
    enableFieldRecensementV1ForTests();
    injectFieldRecensementRateLimitConfig({
      windowMs: 60_000,
      create: 3,
      correction: 3,
      read: 5,
      admin: 4,
      failOpenOnStoreError: true,
      storeKind: 'memory',
      multiInstanceGuaranteed: false,
    });
    store = createMemoryRateLimitStore();
    injectFieldRecensementRateLimitStore(store);

    const app = express();
    app.use(express.json());
    app.use('/api/v1', fieldRecensementV1Router);
    ({ server, base } = await listen(app));
  });

  after(async () => {
    if (server) await new Promise((r) => server.close(r));
    resetFieldRecensementRateLimitStore();
    resetFieldRecensementRateLimitConfig();
    disableFieldRecensementV1ForTests();
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    process.env.JWT_SECRET = SECRET;
    injectFieldRecensementRateLimitConfig({
      windowMs: 60_000,
      create: 3,
      correction: 3,
      read: 5,
      admin: 4,
      failOpenOnStoreError: true,
      storeKind: 'memory',
      multiInstanceGuaranteed: false,
    });
    injectFieldRecensementRateLimitStore(store);
    store.reset();
    enableFieldRecensementV1ForTests();
    await clearIsolatedMongo();
    ({ user: agentA, token: tokenA } = await issueAuthedUser({
      nom: 'A',
      prenom: 'Agent',
      telephone: '+2250700000101',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: true,
      telephoneVerified: true,
    }));
    ({ user: agentB, token: tokenB } = await issueAuthedUser({
      nom: 'B',
      prenom: 'Agent',
      telephone: '+2250700000102',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: true,
      telephoneVerified: true,
    }));
    ({ user: admin, token: tokenAdmin } = await issueAuthedUser({
      nom: 'Admin',
      prenom: 'Field',
      telephone: '+2250700000109',
      password: 'Secret1a!!',
      role: 'Admin',
      telephoneVerified: true,
    }));
  });

  it('hash identity ne contient pas le raw', () => {
    const raw = String(agentA._id);
    const h = hashRateLimitIdentity(raw);
    assert.equal(h.includes(raw), false);
    assert.match(h, /^[a-f0-9]{32}$/);
  });

  it('limite non atteinte → pas 429', async () => {
    const r1 = await req(base, 'GET', '/field-recensements/mine', { token: tokenA });
    const r2 = await req(base, 'GET', '/field-recensements/mine', { token: tokenA });
    assert.notEqual(r1.status, 429);
    assert.notEqual(r2.status, 429);
    assert.ok([200, 404].includes(r1.status) || r1.status < 500);
  });

  it('limite atteinte → 429 RATE_LIMITED + Retry-After + no-store', async () => {
    for (let i = 0; i < 5; i++) {
      await req(base, 'GET', '/field-recensements/mine', { token: tokenA });
    }
    const blocked = await req(base, 'GET', '/field-recensements/mine', { token: tokenA });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.json.code, 'RATE_LIMITED');
    assert.equal(blocked.json.retryable, true);
    assert.ok(Number(blocked.headers.retryAfter) >= 1);
    assert.equal(blocked.headers.cacheControl, 'no-store');
    const blob = JSON.stringify(blocked.json);
    assert.equal(/Bearer|eyJ|password|\+225|cld:auth/i.test(blob), false);
  });

  it('fenêtre expirée → compteur réinitialisé', async () => {
    injectFieldRecensementRateLimitConfig({
      windowMs: 30,
      create: 3,
      correction: 3,
      read: 2,
      admin: 4,
      failOpenOnStoreError: true,
      storeKind: 'memory',
      multiInstanceGuaranteed: false,
    });
    store.reset();
    await req(base, 'GET', '/field-recensements/mine', { token: tokenA });
    await req(base, 'GET', '/field-recensements/mine', { token: tokenA });
    const blocked = await req(base, 'GET', '/field-recensements/mine', { token: tokenA });
    assert.equal(blocked.status, 429);
    await new Promise((r) => setTimeout(r, 40));
    const ok = await req(base, 'GET', '/field-recensements/mine', { token: tokenA });
    assert.notEqual(ok.status, 429);
    injectFieldRecensementRateLimitConfig({
      windowMs: 60_000,
      create: 3,
      correction: 3,
      read: 5,
      admin: 4,
      failOpenOnStoreError: true,
      storeKind: 'memory',
      multiInstanceGuaranteed: false,
    });
  });

  it('agents distincts → buckets séparés (IP partagée n’isole pas)', async () => {
    for (let i = 0; i < 5; i++) {
      await req(base, 'GET', '/field-recensements/mine', {
        token: tokenA,
        headers: { 'X-Forwarded-For': '203.0.113.10' },
      });
    }
    const aBlocked = await req(base, 'GET', '/field-recensements/mine', {
      token: tokenA,
      headers: { 'X-Forwarded-For': '203.0.113.10' },
    });
    assert.equal(aBlocked.status, 429);
    const bOk = await req(base, 'GET', '/field-recensements/mine', {
      token: tokenB,
      headers: { 'X-Forwarded-For': '203.0.113.10' },
    });
    assert.notEqual(bOk.status, 429);
  });

  it('Admin a son propre bucket admin', async () => {
    for (let i = 0; i < 4; i++) {
      await req(base, 'GET', '/field-recensements/admin/queue', { token: tokenAdmin });
    }
    const blocked = await req(base, 'GET', '/field-recensements/admin/queue', {
      token: tokenAdmin,
    });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.json.code, 'RATE_LIMITED');
  });

  it('store en erreur + fail-open → requête passée', async () => {
    injectFieldRecensementRateLimitStore({
      kind: 'broken',
      consume() {
        throw new Error('store down');
      },
      reset() {},
    });
    injectFieldRecensementRateLimitConfig({
      windowMs: 60_000,
      create: 3,
      correction: 3,
      read: 1,
      admin: 4,
      failOpenOnStoreError: true,
      storeKind: 'broken',
      multiInstanceGuaranteed: false,
    });
    const r = await req(base, 'GET', '/field-recensements/mine', { token: tokenA });
    assert.notEqual(r.status, 429);
    injectFieldRecensementRateLimitStore(store);
    injectFieldRecensementRateLimitConfig({
      windowMs: 60_000,
      create: 3,
      correction: 3,
      read: 5,
      admin: 4,
      failOpenOnStoreError: true,
      storeKind: 'memory',
      multiInstanceGuaranteed: false,
    });
  });
});
