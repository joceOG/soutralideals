/**
 * DASH-8D — CRUD Utilisateur sécurisé (Mongo isolé).
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import Utilisateur from '../models/utilisateurModel.js';
import commandeModel from '../models/commandeModel.js';
import utilisateurRouter from '../routes/utilisateurRoutes.js';

const SECRET = 'dash8d-utilisateur-crud-secret-min-32!!';
const FAKE_ID = '000000000000000000000000';

let server;
let baseUrl;
let adminToken;
let adminUser;
let clientToken;
let clientUser;

function issueToken(userId, role) {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, { expiresIn: '1h' });
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
  return { status: res.status, json };
}

async function requestMultipart(method, urlPath, { token, fields = {} } = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, String(v));
  }
  const headers = {};
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${urlPath}`, { method, headers, body: fd });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function seedUsers() {
  adminUser = await Utilisateur.create({
    nom: 'Dash8d',
    prenom: 'Admin',
    telephone: '+2250700001301',
    email: 'dash8d-admin@test.local',
    password: 'Dash8dPass1!!',
    role: 'Admin',
    isActive: true,
  });
  adminToken = issueToken(adminUser._id, 'Admin');
  adminUser.tokens = [{ token: adminToken }];
  await adminUser.save();

  await Utilisateur.create({
    nom: 'Dash8d',
    prenom: 'Admin2',
    telephone: '+2250700001302',
    email: 'dash8d-admin2@test.local',
    password: 'Dash8dPass1!!',
    role: 'Admin',
    isActive: true,
  });

  clientUser = await Utilisateur.create({
    nom: 'Dash8d',
    prenom: 'Client',
    telephone: '+2250700001303',
    email: 'dash8d-client@test.local',
    password: 'Dash8dPass1!!',
    role: 'Client',
    isActive: true,
  });
  clientToken = issueToken(clientUser._id, 'Client');
  clientUser.tokens = [{ token: clientToken }];
  await clientUser.save();
}

describe('DASH-8D — Utilisateur CRUD sécurisé', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    process.env.PHONE_VERIFICATION_MODE = 'off';
    await startIsolatedMongo();
    const app = express();
    app.use(express.json());
    app.use('/api', utilisateurRouter);
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
    process.env.PHONE_VERIFICATION_MODE = 'off';
    await seedUsers();
  });

  it('1 — création Admin nominale POST /utilisateur', async () => {
    const r = await requestMultipart('POST', '/api/utilisateur', {
      token: adminToken,
      fields: {
        nom: 'Nouveau',
        prenom: 'User',
        email: 'dash8d-new@test.local',
        password: 'Secret12!!',
        role: 'Client',
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.json.utilisateur.role, 'Client');
  });

  it('2 — création sans token → 401', async () => {
    const r = await requestMultipart('POST', '/api/utilisateur', {
      fields: { nom: 'X', prenom: 'Y', password: 'Secret12!!', role: 'Client' },
    });
    assert.equal(r.status, 401);
  });

  it('3 — création Client token → 403', async () => {
    const r = await requestMultipart('POST', '/api/utilisateur', {
      token: clientToken,
      fields: { nom: 'X', prenom: 'Y', password: 'Secret12!!', role: 'Client' },
    });
    assert.equal(r.status, 403);
  });

  it('4 — /register role Admin ne crée jamais Admin', async () => {
    const r = await requestMultipart('POST', '/api/register', {
      fields: {
        nom: 'Hack',
        prenom: 'Admin',
        email: 'dash8d-hack-admin@test.local',
        password: 'Secret12!!',
        role: 'Admin',
      },
    });
    assert.notEqual(r.status, 201);
    const created = await Utilisateur.findOne({ email: 'dash8d-hack-admin@test.local' });
    assert.equal(created, null);
  });

  it('5 — mot de passe hashé en base', async () => {
    await requestMultipart('POST', '/api/utilisateur', {
      token: adminToken,
      fields: {
        nom: 'Hash',
        prenom: 'Test',
        email: 'dash8d-hash@test.local',
        password: 'PlainText9',
        role: 'Client',
      },
    });
    const u = await Utilisateur.findOne({ email: 'dash8d-hash@test.local' });
    assert.ok(u);
    assert.notEqual(u.password, 'PlainText9');
    assert.equal(await bcrypt.compare('PlainText9', u.password), true);
  });

  it('6 — mot de passe absent de la réponse', async () => {
    const r = await requestMultipart('POST', '/api/utilisateur', {
      token: adminToken,
      fields: {
        nom: 'NoLeak',
        prenom: 'Pwd',
        email: 'dash8d-noleak@test.local',
        password: 'Secret12!!',
        role: 'Client',
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.json.utilisateur.password, undefined);
  });

  it('7 — doublon email → 409', async () => {
    const r = await requestMultipart('POST', '/api/utilisateur', {
      token: adminToken,
      fields: {
        nom: 'Dup',
        prenom: 'Email',
        email: 'dash8d-client@test.local',
        password: 'Secret12!!',
        role: 'Client',
      },
    });
    assert.equal(r.status, 409);
  });

  it('8 — rôle invalide → 400', async () => {
    const r = await requestMultipart('POST', '/api/utilisateur', {
      token: adminToken,
      fields: {
        nom: 'Bad',
        prenom: 'Role',
        password: 'Secret12!!',
        role: 'SuperUser',
      },
    });
    assert.equal(r.status, 400);
  });

  it('9 — UPDATE whitelist (tokens ignorés)', async () => {
    const r = await requestJson('PUT', `/api/utilisateur/${clientUser._id}`, {
      token: adminToken,
      body: {
        nom: 'ClientUpdated',
        tokens: [{ token: 'evil' }],
        password: 'hacked',
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.nom, 'ClientUpdated');
    assert.equal(r.json.password, undefined);
    const fresh = await Utilisateur.findById(clientUser._id);
    assert.equal(fresh.nom, 'ClientUpdated');
    assert.equal(await fresh.comparePassword('Dash8dPass1!!'), true);
  });

  it('10 — non-Admin ne peut pas changer son rôle', async () => {
    await requestJson('PUT', `/api/utilisateur/${clientUser._id}`, {
      token: clientToken,
      body: { role: 'Admin', nom: clientUser.nom },
    });
    const fresh = await Utilisateur.findById(clientUser._id);
    assert.equal(fresh.role, 'Client');
  });

  it('11 — Admin transition autorisée', async () => {
    const r = await requestJson('PUT', `/api/utilisateur/${clientUser._id}`, {
      token: adminToken,
      body: { role: 'Prestataire' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.role, 'Prestataire');
  });

  it('12 — dernier Admin non rétrogradable', async () => {
    await Utilisateur.deleteMany({ _id: { $ne: adminUser._id }, role: 'Admin' });
    const r = await requestJson('PUT', `/api/utilisateur/${adminUser._id}`, {
      token: adminToken,
      body: { role: 'Client' },
    });
    assert.equal(r.status, 409);
    assert.equal(r.json.code, 'LAST_ADMIN_PROTECTED');
  });

  it('13 — dernier Admin non désactivable', async () => {
    await Utilisateur.deleteMany({ _id: { $ne: adminUser._id }, role: 'Admin' });
    const r = await requestJson('PUT', `/api/utilisateur/${adminUser._id}`, {
      token: adminToken,
      body: { isActive: false },
    });
    assert.equal(r.status, 409);
  });

  it('14 — Admin ne peut pas se supprimer via DELETE admin', async () => {
    const r = await requestJson('DELETE', `/api/utilisateur/${adminUser._id}`, {
      token: adminToken,
    });
    assert.equal(r.status, 409);
    assert.equal(r.json.code, 'ADMIN_SELF_DELETE_FORBIDDEN');
  });

  it('15 — DELETE utilisateur absent → 404', async () => {
    const r = await requestJson('DELETE', `/api/utilisateur/${FAKE_ID}`, {
      token: adminToken,
    });
    assert.equal(r.status, 404);
  });

  it('16 — DELETE avec dépendances → 409', async () => {
    await commandeModel.create({
      utilisateur: clientUser._id,
      infoCommande: {
        addresse: 'A',
        ville: 'Abidjan',
        telephone: '+2250700000000',
        codePostal: '01',
        pays: 'CI',
      },
      articles: [{ nom: 'x', quantite: 1, prix: 100 }],
    });
    const r = await requestJson('DELETE', `/api/utilisateur/${clientUser._id}`, {
      token: adminToken,
    });
    assert.equal(r.status, 409);
    assert.equal(r.json.code, 'USER_HAS_DEPENDENCIES');
    assert.ok(r.json.dependencies);
  });

  it('17 — aucune cascade destructive sur DELETE bloqué', async () => {
    await commandeModel.create({
      utilisateur: clientUser._id,
      infoCommande: {
        addresse: 'A',
        ville: 'Abidjan',
        telephone: '+2250700000000',
        codePostal: '01',
        pays: 'CI',
      },
      articles: [{ nom: 'x', quantite: 1, prix: 100 }],
    });
    await requestJson('DELETE', `/api/utilisateur/${clientUser._id}`, { token: adminToken });
    assert.equal(await commandeModel.countDocuments({ utilisateur: clientUser._id }), 1);
    assert.equal(await Utilisateur.countDocuments({ _id: clientUser._id }), 1);
  });

  it('18 — suppression sûre sans dépendance', async () => {
    const orphan = await Utilisateur.create({
      nom: 'Orphan',
      prenom: 'Dash8d',
      email: 'dash8d-orphan@test.local',
      password: 'Secret12!!',
      role: 'Client',
    });
    const r = await requestJson('DELETE', `/api/utilisateur/${orphan._id}`, {
      token: adminToken,
    });
    assert.equal(r.status, 200);
    assert.equal(await Utilisateur.findById(orphan._id), null);
  });

  it('19 — aucun secret dans LIST', async () => {
    const r = await requestJson('GET', '/api/utilisateur', { token: adminToken });
    assert.equal(r.status, 200);
    const row = r.json.utilisateurs[0];
    assert.equal(row.password, undefined);
    assert.equal(row.tokens, undefined);
    assert.equal(row.refreshTokens, undefined);
  });

  it('20 — ValidationError → 400 pas 500', async () => {
    const r = await requestMultipart('POST', '/api/utilisateur', {
      token: adminToken,
      fields: {
        nom: 'X',
        prenom: 'Y',
        password: 'password',
        role: 'Client',
      },
    });
    assert.equal(r.status, 400);
  });
});
