/**
 * DASH-5D — validation catalogue, sécurité Paiements, agents PATCH.
 */
import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import cloudinary from 'cloudinary';

import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import { PAIEMENT_ADMIN_PUBLIC_FIELDS } from '../controller/paiementAdminController.js';

import Utilisateur from '../models/utilisateurModel.js';
import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import Service from '../models/serviceModel.js';
import Paiement from '../models/paiementModel.js';

import categorieRouter from '../routes/categorieRoutes.js';
import serviceRouter from '../routes/serviceRoutes.js';
import utilisateurRouter from '../routes/utilisateurRoutes.js';
import paiementRouter from '../routes/paiementRoutes.js';

const SECRET = 'dash5d-security-secret-min-32-chars!!!!';
const FAKE_ID = '000000000000000000000000';
const FIXTURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+hHgAHggJ/PchI7wAAAABJRU5ErkJggz',
  'base64',
);

let server;
let baseUrl;
let adminToken;
let clientToken;
let prestataireToken;
let adminUser;

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
  return { status: res.status, json };
}

async function requestMultipart(method, urlPath, { token, fields = {}, fileField } = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, String(v));
  }
  if (fileField) {
    fd.append(fileField, new Blob([FIXTURE_PNG], { type: 'image/png' }), 'fixture.png');
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
    nom: 'Sec',
    prenom: 'Admin',
    telephone: '+2250700000301',
    email: 'dash5d-admin@test.local',
    password: 'GateTest1a!!',
    role: 'Admin',
    isActive: true,
  });
  adminToken = issueToken(adminUser._id, 'Admin');
  adminUser.tokens = [{ token: adminToken }];
  await adminUser.save();

  const client = await Utilisateur.create({
    nom: 'Sec',
    prenom: 'Client',
    telephone: '+2250700000302',
    email: 'dash5d-client@test.local',
    password: 'GateTest1a!!',
    role: 'Client',
    isActive: true,
  });
  clientToken = issueToken(client._id, 'Client');
  client.tokens = [{ token: clientToken }];
  await client.save();

  const presta = await Utilisateur.create({
    nom: 'Sec',
    prenom: 'Presta',
    telephone: '+2250700000303',
    email: 'dash5d-presta@test.local',
    password: 'GateTest1a!!',
    role: 'Prestataire',
    isActive: true,
  });
  prestataireToken = issueToken(presta._id, 'Prestataire');
  presta.tokens = [{ token: prestataireToken }];
  await presta.save();
}

describe('DASH-5D — validation & sécurité', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';
    await startIsolatedMongo();

    mock.method(cloudinary.v2.uploader, 'upload', async () => ({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/fixture.jpg',
      public_id: 'fixture',
    }));
    mock.method(cloudinary.v2.uploader, 'destroy', async () => ({}));

    const app = express();
    app.use(express.json());
    app.use('/api', categorieRouter);
    app.use('/api', serviceRouter);
    app.use('/api', utilisateurRouter);
    app.use('/api', paiementRouter);
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
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    await seedUsers();
  });

  describe('Catégorie — plus de 500', () => {
    it('sans fichier → 400', async () => {
      const g = await Groupe.create({ nomgroupe: 'D5D_G1' });
      const r = await requestJson('POST', '/api/categorie', {
        token: adminToken,
        body: { nomcategorie: 'D5D_CAT', groupe: String(g._id) },
      });
      assert.equal(r.status, 400);
    });

    it('groupe absent → 400', async () => {
      const r = await requestMultipart('POST', '/api/categorie', {
        token: adminToken,
        fields: { nomcategorie: 'D5D_ORPHAN' },
        fileField: 'imagecategorie',
      });
      assert.equal(r.status, 400);
    });

    it('groupe inexistant → 404', async () => {
      const r = await requestMultipart('POST', '/api/categorie', {
        token: adminToken,
        fields: { nomcategorie: 'D5D_BADG', groupe: FAKE_ID },
        fileField: 'imagecategorie',
      });
      assert.equal(r.status, 404);
    });
  });

  describe('Service — route UI POST /service', () => {
    async function seedCat() {
      const g = await Groupe.create({ nomgroupe: `D5D_SG_${Date.now()}` });
      return Categorie.create({
        nomcategorie: 'D5D_SC',
        imagecategorie: 'https://res.cloudinary.com/demo/fix.jpg',
        groupe: g._id,
      });
    }

    it('sans nomservice → 400, count inchangé', async () => {
      const cat = await seedCat();
      const before = await Service.countDocuments();
      const r = await requestMultipart('POST', '/api/service', {
        token: adminToken,
        fields: { categorie: String(cat._id) },
        fileField: 'imageservice',
      });
      assert.equal(r.status, 400);
      assert.equal(await Service.countDocuments(), before);
    });

    it('POST /service/direct hors NODE_ENV=test → 404', async () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const cat = await seedCat();
      const r = await requestJson('POST', '/api/service/direct', {
        token: adminToken,
        body: { nomservice: 'X', categorie: String(cat._id) },
      });
      process.env.NODE_ENV = prev;
      assert.equal(r.status, 404);
    });
  });

  describe('Paiements admin lecture seule', () => {
    it('sans token → 401 ; Client/Prestataire → 403', async () => {
      assert.equal((await requestJson('GET', '/api/paiements')).status, 401);
      assert.equal((await requestJson('GET', '/api/paiements', { token: clientToken })).status, 403);
      assert.equal((await requestJson('GET', '/api/paiements', { token: prestataireToken })).status, 403);
    });

    it('projection liste blanche — champs sensibles absents', async () => {
      await Paiement.create({
        numeroTransaction: Paiement.genererNumeroTransaction(),
        payeur: adminUser._id,
        typeObjet: 'COMMANDE',
        montantOriginal: 1000,
        montantNet: 1000,
        devise: 'XAF',
        methodePaiement: 'MOBILE_MONEY_MTN',
        statut: 'VALIDE',
        fournisseurPaiement: 'INTERNE',
        description: 'D5D_SENSITIVE',
        notesInternes: 'SECRET_INTERNE',
        metadata: { callbackSecret: 'xxx' },
        detailsCarte: { dernierChiffres: '1234' },
      });

      const list = await requestJson('GET', '/api/paiements', { token: adminToken });
      assert.equal(list.status, 200);
      const row = list.json.paiements[0];
      assert.ok(row.numeroTransaction);
      assert.equal(row.notesInternes, undefined);
      assert.equal(row.metadata, undefined);
      assert.equal(row.detailsCarte, undefined);
      for (const key of Object.keys(row)) {
        assert.ok(PAIEMENT_ADMIN_PUBLIC_FIELDS.includes(key), `unexpected field ${key}`);
      }
    });

    it('filtre statut invalide → 400 ; détail id invalide → 400', async () => {
      assert.equal(
        (await requestJson('GET', '/api/paiements?statut=HACK', { token: adminToken })).status,
        400,
      );
      assert.equal(
        (await requestJson('GET', `/api/paiements/not-an-id`, { token: adminToken })).status,
        400,
      );
    });

    it('stats admin → nombres finis', async () => {
      const stats = await requestJson('GET', '/api/paiements/stats', { token: adminToken });
      assert.equal(stats.status, 200);
      for (const k of ['totalPaiements', 'montantTotal', 'paiementsValides', 'commissionTotale']) {
        assert.equal(typeof stats.json[k], 'number');
        assert.ok(Number.isFinite(stats.json[k]));
      }
    });
  });

  describe('PATCH agents recenseurs', () => {
    it('can-create-recensement admin → persisté', async () => {
      const agent = await Utilisateur.create({
        nom: 'Agent',
        prenom: 'Test',
        telephone: '+2250700000399',
        email: 'dash5d-agent@test.local',
        password: 'GateTest1a!!',
        role: 'Client',
        isActive: true,
        canCreateRecensement: false,
      });

      const grant = await requestJson('PATCH', `/api/utilisateur/${agent._id}/can-create-recensement`, {
        token: adminToken,
        body: { enabled: true },
      });
      assert.equal(grant.status, 200);
      assert.equal(grant.json.canCreateRecensement, true);

      const refreshed = await Utilisateur.findById(agent._id);
      assert.equal(refreshed.canCreateRecensement, true);

      assert.equal(
        (await requestJson('PATCH', `/api/utilisateur/${agent._id}/can-create-recensement`, {
          token: clientToken,
          body: { enabled: false },
        })).status,
        403,
      );
    });

    it('field-agent-active + 404 utilisateur', async () => {
      const agent = await Utilisateur.create({
        nom: 'Agent',
        prenom: 'Act',
        telephone: '+2250700000398',
        email: 'dash5d-agent2@test.local',
        password: 'GateTest1a!!',
        role: 'Client',
        isActive: true,
      });

      const off = await requestJson('PATCH', `/api/utilisateur/${agent._id}/field-agent-active`, {
        token: adminToken,
        body: { isActive: false },
      });
      assert.equal(off.status, 200);
      const u = await Utilisateur.findById(agent._id);
      assert.equal(u.isActive, false);

      assert.equal(
        (await requestJson('PATCH', `/api/utilisateur/${FAKE_ID}/field-agent-active`, {
          token: adminToken,
          body: { isActive: true },
        })).status,
        404,
      );
    });
  });
});
