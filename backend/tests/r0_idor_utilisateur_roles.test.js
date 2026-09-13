/**
 * R0-01 — Tests comportementaux HTTP : GET /utilisateur/:id/roles (IDOR).
 * Traverse : HTTP → auth → (authz) → contrôleur → réponse.
 * Aucune base distante : modèles mockés en mémoire.
 */
import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import Utilisateur from '../models/utilisateurModel.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import utilisateurRouter from '../routes/utilisateurRoutes.js';

const SECRET = 'r0-idor-roles-test-secret-min-32chars!!';
const ID_A = '507f1f77bcf86cd799439011';
const ID_B = '507f1f77bcf86cd799439022';
const ID_ADMIN = '507f1f77bcf86cd799439033';
const ID_FAKE_ADMIN = '507f1f77bcf86cd799439044';
const ID_MISSING = '507f1f77bcf86cd799439099';

/** @type {Map<string, object>} */
const usersById = new Map();

function makeUser({ id, role, email, telephone, token }) {
  return {
    _id: id,
    nom: 'Nom',
    prenom: 'Prenom',
    email,
    telephone,
    role,
    password: 'HASH_SHOULD_NEVER_APPEAR',
    tokens: [{ token }],
    refreshTokens: [{ token: 'refresh-secret' }],
    canCreateRecensement: false,
    toJSON() {
      return { _id: this._id, email: this.email, role: this.role };
    },
  };
}

function issueToken(userId) {
  return jwt.sign({ _id: userId }, SECRET, { expiresIn: '1h' });
}

async function listenApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', utilisateurRouter);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}/api` };
}

async function httpGet(baseUrl, path, { token } = {}) {
  const headers = {};
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, { method: 'GET', headers });
  let body = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

describe('R0-01/R0-02 — GET /utilisateur/:id/roles HTTP', () => {
  /** @type {http.Server} */
  let server;
  let baseUrl;
  let tokenA;
  let tokenB;
  let tokenAdmin;
  let tokenFakeAdmin;
  let tokenExpired;

  before(async () => {
    process.env.JWT_SECRET = SECRET;

    tokenA = issueToken(ID_A);
    tokenB = issueToken(ID_B);
    tokenAdmin = issueToken(ID_ADMIN);
    tokenFakeAdmin = issueToken(ID_FAKE_ADMIN);
    tokenExpired = jwt.sign({ _id: ID_A }, SECRET, { expiresIn: -10 });

    usersById.clear();
    usersById.set(ID_A, makeUser({
      id: ID_A,
      role: 'Client',
      email: 'user-a@example.test',
      telephone: '+2250700000001',
      token: tokenA,
    }));
    usersById.set(ID_B, makeUser({
      id: ID_B,
      role: 'Prestataire',
      email: 'user-b@example.test',
      telephone: '+2250700000002',
      token: tokenB,
    }));
    usersById.set(ID_ADMIN, makeUser({
      id: ID_ADMIN,
      role: 'Admin',
      email: 'admin@example.test',
      telephone: '+2250700000003',
      token: tokenAdmin,
    }));
    // Libellé trompeur — n'est PAS le rôle Admin réel
    usersById.set(ID_FAKE_ADMIN, makeUser({
      id: ID_FAKE_ADMIN,
      role: 'Administrateur',
      email: 'fake-admin@example.test',
      telephone: '+2250700000004',
      token: tokenFakeAdmin,
    }));

    /** Chaîne mongoose légère : findById/findOne → select → lean ; aussi thenable pour auth. */
    const asQuery = (doc) => {
      const api = {
        select() {
          return api;
        },
        lean: async () => doc,
        then(onFulfilled, onRejected) {
          return Promise.resolve(doc).then(onFulfilled, onRejected);
        },
      };
      return api;
    };

    mock.method(Utilisateur, 'findById', (id) => {
      const key = String(id);
      return asQuery(usersById.get(key) ?? null);
    });

    mock.method(prestataireModel, 'findOne', (q) => {
      if (String(q?.utilisateur) === ID_B) {
        return asQuery({
          _id: new mongoose.Types.ObjectId(),
          verifier: true,
          cni1: 'cld:auth:secret-cni',
        });
      }
      return asQuery(null);
    });
    mock.method(freelanceModel, 'findOne', () => asQuery(null));
    mock.method(vendeurModel, 'findOne', () => asQuery(null));

    ({ server, baseUrl } = await listenApp());
  });

  after(async () => {
    mock.restoreAll();
    delete process.env.JWT_SECRET;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    // Réaligner tokens actifs (auth vérifie presence dans utilisateur.tokens)
    usersById.get(ID_A).tokens = [{ token: tokenA }];
    usersById.get(ID_B).tokens = [{ token: tokenB }];
    usersById.get(ID_ADMIN).tokens = [{ token: tokenAdmin }];
    usersById.get(ID_FAKE_ADMIN).tokens = [{ token: tokenFakeAdmin }];
  });

  it('Cas 1 — anonyme → 401', async () => {
    const { status, body } = await httpGet(baseUrl, `/utilisateur/${ID_B}/roles`);
    assert.equal(status, 401);
    assert.ok(body?.error || body?.code);
    assert.equal(body?.utilisateur?.email, undefined);
  });

  it('Cas 2 — A consulte A → 200 champs autorisés', async () => {
    const { status, body } = await httpGet(baseUrl, `/utilisateur/${ID_A}/roles`, {
      token: tokenA,
    });
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.roles));
    assert.ok(body.roles.includes('CLIENT'));
    assert.ok(body.details);
    assert.equal(String(body.utilisateur?._id), ID_A);
    // Minimisation : pas d’email/téléphone/secrets
    assert.equal(body.utilisateur?.email, undefined);
    assert.equal(body.utilisateur?.telephone, undefined);
    assert.equal(body.utilisateur?.password, undefined);
    assert.equal(body.tokens, undefined);
    assert.equal(body.refreshTokens, undefined);
  });

  it('Cas 3 — A consulte B → 403 sans fuite', async () => {
    const { status, body } = await httpGet(baseUrl, `/utilisateur/${ID_B}/roles`, {
      token: tokenA,
    });
    assert.equal(status, 403);
    assert.equal(body.success, false);
    assert.equal(body.code, 'USER_ACCESS_FORBIDDEN');
    assert.equal(body.utilisateur, undefined);
    assert.equal(body.roles, undefined);
    assert.equal(body.details, undefined);
    assert.equal(body.email, undefined);
    assert.equal(body.telephone, undefined);
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes('user-b@example.test'), false);
    assert.equal(serialized.includes('+2250700000002'), false);
    assert.equal(serialized.includes('cld:auth:'), false);
  });

  it('Cas 4 — Admin consulte B → 200', async () => {
    const { status, body } = await httpGet(baseUrl, `/utilisateur/${ID_B}/roles`, {
      token: tokenAdmin,
    });
    assert.equal(status, 200);
    assert.ok(body.roles.includes('PRESTATAIRE'));
    assert.equal(String(body.utilisateur?._id), ID_B);
    assert.equal(body.details?.prestataire?.verifier, true);
    // Admin : contact utile ; pas de KYC / secrets
    assert.equal(body.utilisateur?.email, 'user-b@example.test');
    assert.equal(body.details?.prestataire?.cni1, undefined);
    assert.equal(body.utilisateur?.password, undefined);
  });

  it('Cas 5 — id inexistant (self/admin autorisé) → 404', async () => {
    const { status, body } = await httpGet(baseUrl, `/utilisateur/${ID_MISSING}/roles`, {
      token: tokenAdmin,
    });
    assert.equal(status, 404);
    assert.ok(body?.error || body?.code);
  });

  it('Cas 6 — id MongoDB invalide → 400 (pas 500)', async () => {
    const { status, body } = await httpGet(baseUrl, '/utilisateur/identifiant-invalide/roles', {
      token: tokenA,
    });
    assert.equal(status, 400);
    assert.notEqual(status, 500);
    assert.ok(body?.error || body?.code || body?.message);
  });

  it('Cas 7 — token expiré → 401', async () => {
    const { status } = await httpGet(baseUrl, `/utilisateur/${ID_A}/roles`, {
      token: tokenExpired,
    });
    assert.equal(status, 401);
  });

  it('Cas 7b — token invalide → 401', async () => {
    const { status } = await httpGet(baseUrl, `/utilisateur/${ID_A}/roles`, {
      token: 'not-a-valid-jwt',
    });
    assert.equal(status, 401);
  });

  it('Cas 8 — libellé Administrateur sans rôle Admin réel → 403 cross-user', async () => {
    const { status, body } = await httpGet(baseUrl, `/utilisateur/${ID_B}/roles`, {
      token: tokenFakeAdmin,
    });
    assert.equal(status, 403);
    assert.equal(body.code, 'USER_ACCESS_FORBIDDEN');
    assert.equal(body.roles, undefined);
  });
});
