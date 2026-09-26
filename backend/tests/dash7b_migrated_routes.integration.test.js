/**
 * DASH-7B — Routes migrées apiClient (Mongo isolé, node:test).
 * Matrice frontend → Express pour Connexion, Favoris, Historique, Statistiques,
 * Notifications, Messages, Avis, FreelanceServices, RecensementsPending,
 * Paramètres, Sécurité, FieldRecensements, Maps, Import CSV, Prestataire (carte).
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
import {
  enableFieldRecensementV1ForTests,
  disableFieldRecensementV1ForTests,
} from './helpers/fieldRecensementV1TestEnv.js';
import Utilisateur from '../models/utilisateurModel.js';

import utilisateurRouter from '../routes/utilisateurRoutes.js';
import favoriteRouter from '../routes/favoriteRoutes.js';
import historyRouter from '../routes/historyRoutes.js';
import notificationRouter from '../routes/notificationRoutes.js';
import messageRouter from '../routes/messageRoutes.js';
import avisRouter from '../routes/avisRoutes.js';
import freelanceServiceRouter from '../routes/freelanceServiceRoutes.js';
import userPreferencesRouter from '../routes/userPreferencesRoutes.js';
import securityRouter from '../routes/securityRoutes.js';
import importRouter from '../routes/importRoutes.js';
import prestataireRouter from '../routes/prestataireRoutes.js';
import freelanceRouter from '../routes/freelanceRoutes.js';
import vendeurRouter from '../routes/vendeurRoutes.js';
import googleMapsRouter from '../routes/googleMapsRoutes.js';
import fieldRecensementV1Router from '../routes/fieldRecensementV1Routes.js';
import statistiquesRouter from '../routes/statistiquesRoutes.js';

const SECRET = 'dash7b-migrated-routes-secret-min-32!!';
const PREFIX = 'dash7b_';
const FAKE_ID = '000000000000000000000000';

let server;
let baseUrl;
let adminUser;
let adminToken;
let clientUser;
let clientToken;

function issueToken(userId, role, expiresIn = '1h') {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, { expiresIn });
}

async function requestJson(method, urlPath, { token, body, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
  const headers = { 'Content-Type': 'application/json' };
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${urlPath}${qs}`, {
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
  app.use('/api', utilisateurRouter);
  app.use('/api', favoriteRouter);
  app.use('/api', historyRouter);
  app.use('/api', notificationRouter);
  app.use('/api', messageRouter);
  app.use('/api', avisRouter);
  app.use('/api', freelanceServiceRouter);
  app.use('/api', userPreferencesRouter);
  app.use('/api', securityRouter);
  app.use('/api', importRouter);
  app.use('/api', prestataireRouter);
  app.use('/api', freelanceRouter);
  app.use('/api', vendeurRouter);
  app.use('/api/maps', googleMapsRouter);
  app.use('/api/v1', fieldRecensementV1Router);
  app.use('/api', statistiquesRouter);
  return app;
}

async function seedUsers() {
  adminUser = await Utilisateur.create({
    nom: PREFIX + 'Admin',
    prenom: 'Dash7b',
    telephone: '+2250700000701',
    email: `${PREFIX}admin@test.local`,
    password: 'GateTest1a!!',
    role: 'Admin',
    isActive: true,
  });
  adminToken = issueToken(adminUser._id, 'Admin');
  adminUser.tokens = [{ token: adminToken }];
  await adminUser.save();

  clientUser = await Utilisateur.create({
    nom: PREFIX + 'Client',
    prenom: 'Dash7b',
    telephone: '+2250700000702',
    email: `${PREFIX}client@test.local`,
    password: 'GateTest1a!!',
    role: 'Client',
    isActive: true,
  });
  clientToken = issueToken(clientUser._id, 'Client');
  clientUser.tokens = [{ token: clientToken }];
  await clientUser.save();
}

describe('DASH-7B — routes migrées apiClient', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    await startIsolatedMongo();
    enableFieldRecensementV1ForTests();

    const app = mountApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    disableFieldRecensementV1ForTests();
    if (server) await new Promise((resolve) => server.close(resolve));
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    process.env.JWT_SECRET = SECRET;
    enableFieldRecensementV1ForTests();
    await seedUsers();
  });

  describe('Connexion POST /api/login (publicApiClient)', () => {
    it('mot de passe manquant → 400', async () => {
      const r = await requestJson('POST', '/api/login', {
        body: { identifiant: `${PREFIX}admin@test.local`, password: '' },
      });
      assert.equal(r.status, 400);
      assert.ok(r.json.error);
    });

    it('identifiants invalides → 400 contrôlé (pas 500)', async () => {
      const r = await requestJson('POST', '/api/login', {
        body: { identifiant: `${PREFIX}admin@test.local`, password: 'WrongPass9!!' },
      });
      assert.equal(r.status, 400);
      assert.ok(r.json.error);
      assert.ok(!String(r.text).includes('GateTest'));
    });
  });

  describe('Favoris GET /api/favorites', () => {
    it('sans token → 401', async () => {
      const r = await requestJson('GET', '/api/favorites');
      assert.equal(r.status, 401);
    });

    it('token Client → 200 liste (tableau ou enveloppe)', async () => {
      const r = await requestJson('GET', '/api/favorites', { token: clientToken });
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.json) || Array.isArray(r.json?.favorites) || Array.isArray(r.json?.data));
    });
  });

  describe('Historique GET /api/history', () => {
    it('sans token → 401', async () => {
      const r = await requestJson('GET', '/api/history');
      assert.equal(r.status, 401);
    });

    it('token valide → 200', async () => {
      const r = await requestJson('GET', '/api/history', { token: clientToken });
      assert.equal(r.status, 200);
    });
  });

  describe('Statistiques GET /api/statistiques/generales', () => {
    it('Admin → 200 (module DASH-7C)', async () => {
      const r = await requestJson('GET', '/api/statistiques/generales', {
        token: adminToken,
        query: { periode: '30j' },
      });
      assert.equal(r.status, 200);
      assert.ok(Number.isFinite(r.json.totalUtilisateurs));
    });
  });

  describe('Notifications admin GET /api/notifications', () => {
    it('Client → 403', async () => {
      const r = await requestJson('GET', '/api/notifications', { token: clientToken });
      assert.equal(r.status, 403);
    });

    it('Admin → 200', async () => {
      const r = await requestJson('GET', '/api/notifications', {
        token: adminToken,
        query: { page: '1', limit: '10' },
      });
      assert.equal(r.status, 200);
    });
  });

  describe('Messages GET /api/messages/stats', () => {
    it('sans token → 401', async () => {
      const r = await requestJson('GET', '/api/messages/stats');
      assert.equal(r.status, 401);
    });

    it('Admin → 200', async () => {
      const r = await requestJson('GET', '/api/messages/stats', {
        token: adminToken,
        query: { userId: String(adminUser._id) },
      });
      assert.equal(r.status, 200);
    });
  });

  describe('Avis GET /api/avis', () => {
    it('sans auth → 200 (liste publique)', async () => {
      const r = await requestJson('GET', '/api/avis');
      assert.equal(r.status, 200);
    });
  });

  describe('FreelanceServices GET /api/freelance-services', () => {
    it('liste publique → 200 structure offers', async () => {
      const r = await requestJson('GET', '/api/freelance-services');
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.json?.offers) || Array.isArray(r.json));
    });
  });

  describe('RecensementsPending', () => {
    it('GET /api/prestataire/pending/list sans token → 401', async () => {
      const r = await requestJson('GET', '/api/prestataire/pending/list');
      assert.equal(r.status, 401);
    });

    it('Admin → 200 tableau', async () => {
      const r = await requestJson('GET', '/api/prestataire/pending/list', { token: adminToken });
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.json));
    });

    it('Client → 403', async () => {
      const r = await requestJson('GET', '/api/freelance/pending/list', { token: clientToken });
      assert.equal(r.status, 403);
    });
  });

  describe('Paramètres GET /api/preferences/user/:id', () => {
    it('sans token → 401', async () => {
      const r = await requestJson('GET', `/api/preferences/user/${clientUser._id}`);
      assert.equal(r.status, 401);
    });

    it('utilisateur authentifié → 200 ou 404 préférences absentes', async () => {
      const r = await requestJson('GET', `/api/preferences/user/${clientUser._id}`, {
        token: clientToken,
      });
      assert.ok(r.status === 200 || r.status === 404);
    });
  });

  describe('Sécurité GET /api/security/user/:id/stats', () => {
    it('sans token → 401', async () => {
      const r = await requestJson('GET', `/api/security/user/${adminUser._id}/stats`);
      assert.equal(r.status, 401);
    });

    it('Admin sur soi → 200 stats ou 404 si profil sécurité absent', async () => {
      const r = await requestJson('GET', `/api/security/user/${adminUser._id}/stats`, {
        token: adminToken,
      });
      assert.ok(r.status === 200 || r.status === 404);
      if (r.status === 200) {
        assert.ok(r.json.stats);
      }
    });
  });

  describe('FieldRecensementsTerrain GET /api/v1/field-recensements/admin/queue', () => {
    it('sans token → 401 contrat field', async () => {
      const r = await requestJson('GET', '/api/v1/field-recensements/admin/queue');
      assert.equal(r.status, 401);
      assert.equal(r.json?.success, false);
    });

    it('Admin → 200 enveloppe data.items', async () => {
      const r = await requestJson('GET', '/api/v1/field-recensements/admin/queue', {
        token: adminToken,
        query: { limit: '5' },
      });
      assert.equal(r.status, 200);
      assert.equal(r.json?.success, true);
      assert.ok(Array.isArray(r.json?.data?.items));
    });

    it('Client → 403 ADMIN_REQUIRED', async () => {
      const r = await requestJson('GET', '/api/v1/field-recensements/admin/queue', {
        token: clientToken,
      });
      assert.equal(r.status, 403);
    });
  });

  describe('PrestatairesMap GET /api/prestataire', () => {
    it('sans token → 200 (optionalAuth, liste publique filtrée)', async () => {
      const r = await requestJson('GET', '/api/prestataire');
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.json));
    });

    it('Admin → 200 tableau', async () => {
      const r = await requestJson('GET', '/api/prestataire', { token: adminToken });
      assert.equal(r.status, 200);
      assert.ok(Array.isArray(r.json));
    });
  });

  describe('Maps proxy POST/GET /api/maps/* (apiClient /maps/...)', () => {
    it('POST /api/maps/geocode sans token → 401', async () => {
      const r = await requestJson('POST', '/api/maps/geocode', {
        body: { address: 'Abidjan' },
      });
      assert.equal(r.status, 401);
    });

    it('POST /api/maps/geocode sans address → 400', async () => {
      const r = await requestJson('POST', '/api/maps/geocode', {
        token: adminToken,
        body: {},
      });
      assert.equal(r.status, 400);
    });

    it('POST /api/maps/service-area payload valide → 200 sans Google externe', async () => {
      const r = await requestJson('POST', '/api/maps/service-area', {
        token: adminToken,
        body: { center: { lat: 5.36, lng: -4.01 }, radiusKm: 2 },
      });
      assert.equal(r.status, 200);
      assert.equal(r.json.success, true);
      assert.ok(Array.isArray(r.json.points));
      assert.ok(!String(r.text).includes('AIza'));
    });

    it('GET /api/maps/nearby sans lat → 400', async () => {
      const r = await requestJson('GET', '/api/maps/nearby', {
        token: adminToken,
        query: { lng: '1', radius: '1000' },
      });
      assert.equal(r.status, 400);
    });
  });

  describe('Import CSV POST /api/prestataires/import-csv', () => {
    it('sans token → 401', async () => {
      const r = await requestJson('POST', '/api/prestataires/import-csv', {
        body: { csvData: [] },
      });
      assert.equal(r.status, 401);
    });

    it('csvData invalide → 400', async () => {
      const r = await requestJson('POST', '/api/prestataires/import-csv', {
        token: adminToken,
        body: { csvData: 'not-an-array' },
      });
      assert.equal(r.status, 400);
    });

    it('csvData [] → 200 structure results (sans clearExisting)', async () => {
      const r = await requestJson('POST', '/api/prestataires/import-csv', {
        token: adminToken,
        body: { csvData: [], clearExisting: false },
      });
      assert.equal(r.status, 200);
      assert.ok(r.json.results || r.json.success !== undefined);
    });
  });

  describe('Validation id Mongo invalide', () => {
    it('DELETE /api/notification/not-an-id → pas 500', async () => {
      const r = await requestJson('DELETE', '/api/notification/not-an-id', { token: adminToken });
      assert.ok(r.status === 400 || r.status === 404 || r.status === 500);
      assert.notEqual(r.status, 200);
      if (r.status === 500) {
        assert.fail('DELETE notification id invalide ne doit pas produire 500');
      }
    });
  });
});
