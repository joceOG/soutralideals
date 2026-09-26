/**

 * DASH-7D / DASH-7D.1 — GET sécurité read-only (Mongo isolé).

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

import Security from '../models/securityModel.js';

import securityRouter from '../routes/securityRoutes.js';



const SECRET = 'dash7d-security-initial-state-secret!!';

const PREFIX = 'dash7d_';

const FAKE_ID = '000000000000000000000000';



let server;

let baseUrl;

let adminUser;

let adminToken;

let clientA;

let clientAToken;

let clientB;



function issueToken(userId, role, expiresIn = '1h') {

  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, { expiresIn });

}



async function requestJson(method, urlPath, { token, body } = {}) {

  const headers = { 'Content-Type': 'application/json' };

  if (token !== undefined) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${urlPath}`, {

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

  return { status: res.status, json, text };

}



function mountApp() {

  const app = express();

  app.use(express.json());

  app.use('/api', securityRouter);

  return app;

}



async function seedUsers() {

  adminUser = await Utilisateur.create({

    nom: PREFIX + 'Admin',

    prenom: 'Sec',

    telephone: '+2250700000901',

    email: `${PREFIX}admin@test.local`,

    password: 'GateTest1a!!',

    role: 'Admin',

    isActive: true,

  });

  adminToken = issueToken(adminUser._id, 'Admin');

  adminUser.tokens = [{ token: adminToken }];

  await adminUser.save();



  clientA = await Utilisateur.create({

    nom: PREFIX + 'ClientA',

    prenom: 'Sec',

    telephone: '+2250700000902',

    email: `${PREFIX}clienta@test.local`,

    password: 'GateTest1a!!',

    role: 'Client',

    isActive: true,

  });

  clientAToken = issueToken(clientA._id, 'Client');

  clientA.tokens = [{ token: clientAToken }];

  await clientA.save();



  clientB = await Utilisateur.create({

    nom: PREFIX + 'ClientB',

    prenom: 'Sec',

    telephone: '+2250700000903',

    email: `${PREFIX}clientb@test.local`,

    password: 'GateTest1a!!',

    role: 'Client',

    isActive: true,

  });

  const clientBToken = issueToken(clientB._id, 'Client');

  clientB.tokens = [{ token: clientBToken }];

  await clientB.save();

}



describe('DASH-7D — security read-only GET', () => {

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



  it('401 sans token stats', async () => {

    const r = await requestJson('GET', `/api/security/user/${clientA._id}/stats`);

    assert.equal(r.status, 401);

  });



  it('403 client A consulte client B stats', async () => {

    const r = await requestJson('GET', `/api/security/user/${clientB._id}/stats`, {

      token: clientAToken,

    });

    assert.equal(r.status, 403);

  });



  it('GET profil sans document → 200 initialized false, aucune écriture', async () => {

    const before = await Security.countDocuments({});

    const r = await requestJson('GET', `/api/security/user/${clientA._id}`, {

      token: clientAToken,

    });

    const after = await Security.countDocuments({});

    assert.equal(r.status, 200);

    assert.equal(r.json.success, true);

    assert.equal(r.json.data.initialized, false);

    assert.equal(before, 0);

    assert.equal(after, 0);

  });



  it('GET stats sans document → aucune écriture', async () => {

    const before = await Security.countDocuments({});

    await requestJson('GET', `/api/security/user/${clientA._id}/stats`, {

      token: clientAToken,

    });

    const after = await Security.countDocuments({});

    assert.equal(before, 0);

    assert.equal(after, 0);

  });



  it('plusieurs GET profil consécutifs → aucune création', async () => {

    for (let i = 0; i < 3; i += 1) {

      const r = await requestJson('GET', `/api/security/user/${clientA._id}`, {

        token: clientAToken,

      });

      assert.equal(r.status, 200);

      assert.equal(r.json.data.initialized, false);

    }

    assert.equal(await Security.countDocuments({}), 0);

  });



  it('GET profil concurrents → une seule absence de document', async () => {

    const urls = Array.from({ length: 5 }, () =>

      requestJson('GET', `/api/security/user/${clientA._id}`, { token: clientAToken }),

    );

    const results = await Promise.all(urls);

    for (const r of results) {

      assert.equal(r.status, 200);

      assert.equal(r.json.data.initialized, false);

    }

    assert.equal(await Security.countDocuments({}), 0);

  });



  it('GET profil existant ne modifie pas updatedAt ni __v', async () => {

    const doc = await Security.create({

      utilisateur: clientA._id,

      twoFactorAuth: { enabled: false },

    });

    const before = await Security.findById(doc._id).lean();

    const beforeUpdated = before.updatedAt?.toISOString();

    const beforeVersion = before.__v;



    await requestJson('GET', `/api/security/user/${clientA._id}`, { token: clientAToken });

    await requestJson('GET', `/api/security/user/${clientA._id}`, { token: clientAToken });



    const after = await Security.findById(doc._id).lean();

    assert.equal(after.__v, beforeVersion);

    assert.equal(after.updatedAt?.toISOString(), beforeUpdated);

    assert.ok(after.twoFactorAuth?.secret == null);

  });



  it('PUT settings crée le document si absent', async () => {

    assert.equal(await Security.countDocuments({}), 0);

    const r = await requestJson('PUT', `/api/security/user/${clientA._id}/settings`, {

      token: clientAToken,

      body: {

        securitySettings: {

          emailNotifications: { newLogin: false },

        },

      },

    });

    assert.equal(r.status, 200);

    assert.equal(await Security.countDocuments({ utilisateur: clientA._id }), 1);

  });



  it('deuxième PUT settings met à jour le même document', async () => {

    await requestJson('PUT', `/api/security/user/${clientA._id}/settings`, {

      token: clientAToken,

      body: { securitySettings: { sessionTimeout: 45 } },

    });

    await requestJson('PUT', `/api/security/user/${clientA._id}/settings`, {

      token: clientAToken,

      body: { securitySettings: { sessionTimeout: 60 } },

    });

    assert.equal(await Security.countDocuments({ utilisateur: clientA._id }), 1);

    const doc = await Security.findOne({ utilisateur: clientA._id }).lean();

    assert.equal(doc.securitySettings.sessionTimeout, 60);

  });



  it('404 utilisateur inexistant profil', async () => {

    const r = await requestJson('GET', `/api/security/user/${FAKE_ID}`, { token: adminToken });

    assert.equal(r.status, 404);

  });



  it('400 identifiant invalide profil', async () => {

    const r = await requestJson('GET', '/api/security/user/not-an-id', {

      token: clientAToken,

    });

    assert.equal(r.status, 400);

  });



  it('stats initialized true sans secrets', async () => {

    await Security.create({

      utilisateur: clientA._id,

      twoFactorAuth: { enabled: true, secret: 'SHOULD-NOT-LEAK' },

      securityStats: { securityScore: 1, totalLogins: 0, failedLogins: 0 },

    });

    const r = await requestJson('GET', `/api/security/user/${clientA._id}/stats`, {

      token: clientAToken,

    });

    assert.equal(r.status, 200);

    assert.equal(r.json.data.initialized, true);

    const payload = JSON.stringify(r.json);

    assert.ok(!payload.includes('SHOULD-NOT-LEAK'));

  });

});

