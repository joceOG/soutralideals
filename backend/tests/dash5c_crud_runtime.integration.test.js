/**
 * DASH-5C — CRUD catalogue / acteurs / opérations / paiements admin (Mongo isolé, node:test).
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
import Utilisateur from '../models/utilisateurModel.js';
import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import Service from '../models/serviceModel.js';
import Vendeur from '../models/vendeurModel.js';
import Paiement from '../models/paiementModel.js';
import Notification from '../models/notificationModel.js';

import groupeRouter from '../routes/groupeRoutes.js';
import categorieRouter from '../routes/categorieRoutes.js';
import serviceRouter from '../routes/serviceRoutes.js';
import articleRouter from '../routes/articleRoutes.js';
import promotionRouter from '../routes/promotionRoutes.js';
import utilisateurRouter from '../routes/utilisateurRoutes.js';
import prestataireRouter from '../routes/prestataireRoutes.js';
import freelanceRouter from '../routes/freelanceRoutes.js';
import vendeurRouter from '../routes/vendeurRoutes.js';
import commandeRouter from '../routes/commandeRoutes.js';
import prestationRouter from '../routes/prestationRoutes.js';
import notificationRouter from '../routes/notificationRoutes.js';
import paiementRouter from '../routes/paiementRoutes.js';

const SECRET = 'dash5c-crud-audit-secret-min-32-chars!!';
const FAKE_ID = '000000000000000000000000';
const FIXTURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+hHgAHggJ/PchI7wAAAABJRU5ErkJggz',
  'base64',
);

let server;
let baseUrl;
let adminToken;
let clientToken;
let adminUser;
let cloudinaryMock;

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

async function requestMultipart(method, urlPath, { token, fields = {}, fileField, fileName = 'fixture.png' }) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, String(v));
  }
  if (fileField) {
    fd.append(fileField, new Blob([FIXTURE_PNG], { type: 'image/png' }), fileName);
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

function mountApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', groupeRouter);
  app.use('/api', categorieRouter);
  app.use('/api', serviceRouter);
  app.use('/api', articleRouter);
  app.use('/api', promotionRouter);
  app.use('/api', utilisateurRouter);
  app.use('/api', prestataireRouter);
  app.use('/api', freelanceRouter);
  app.use('/api', vendeurRouter);
  app.use('/api', commandeRouter);
  app.use('/api', prestationRouter);
  app.use('/api', notificationRouter);
  app.use('/api', paiementRouter);
  return app;
}

async function seedUsers() {
  adminUser = await Utilisateur.create({
    nom: 'Audit',
    prenom: 'Admin',
    telephone: '+2250700000201',
    email: 'dash5c-admin@test.local',
    password: 'GateTest1a!!',
    role: 'Admin',
    isActive: true,
  });
  adminToken = issueToken(adminUser._id, 'Admin');
  adminUser.tokens = [{ token: adminToken }];
  await adminUser.save();

  const client = await Utilisateur.create({
    nom: 'Audit',
    prenom: 'Client',
    telephone: '+2250700000202',
    email: 'dash5c-client@test.local',
    password: 'GateTest1a!!',
    role: 'Client',
    isActive: true,
  });
  clientToken = issueToken(client._id, 'Client');
  client.tokens = [{ token: clientToken }];
  await client.save();
}

describe('DASH-5C — harness', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';
    await startIsolatedMongo();

    cloudinaryMock = mock.method(cloudinary.v2.uploader, 'upload', async () => ({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/fixture.jpg',
      public_id: 'fixture',
    }));
    mock.method(cloudinary.v2.uploader, 'destroy', async () => ({}));

    const app = mountApp();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    cloudinaryMock?.restore?.();
    if (server) await new Promise((resolve) => server.close(resolve));
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    process.env.JWT_SECRET = SECRET;
    await seedUsers();
  });

  it('auth — GET /api/promotions/stats sans token → 401', async () => {
    const r = await requestJson('GET', '/api/promotions/stats');
    assert.equal(r.status, 401);
  });

  it('auth — token expiré → 401', async () => {
    const expired = issueToken(adminUser._id, 'Admin', '-1s');
    adminUser.tokens.push({ token: expired });
    await adminUser.save();
    const r = await requestJson('GET', '/api/promotions/stats', { token: expired });
    assert.equal(r.status, 401);
  });

  it('auth — FormData POST /api/categorie avec Authorization admin', async () => {
    const g = await Groupe.create({ nomgroupe: 'CRUD_AUDIT_GRP_CAT' });
    const r = await requestMultipart('POST', '/api/categorie', {
      token: adminToken,
      fields: { nomcategorie: 'CRUD_AUDIT_CAT', groupe: String(g._id) },
      fileField: 'imagecategorie',
    });
    assert.equal(r.status, 201);
    assert.equal(r.json.nomcategorie, 'CRUD_AUDIT_CAT');
  });

  describe('Catégories', () => {
    it('CREATE valide (multipart imagecategorie)', async () => {
      const g = await Groupe.create({ nomgroupe: 'CRUD_AUDIT_G1' });
      const r = await requestMultipart('POST', '/api/categorie', {
        token: adminToken,
        fields: { nomcategorie: 'CRUD_AUDIT_CAT_OK', groupe: String(g._id) },
        fileField: 'imagecategorie',
      });
      assert.equal(r.status, 201);
    });

    it('CREATE groupe absent → 400', async () => {
      const g = await Groupe.create({ nomgroupe: 'CRUD_AUDIT_G0' });
      const r = await requestMultipart('POST', '/api/categorie', {
        token: adminToken,
        fields: { nomcategorie: 'CRUD_AUDIT_CAT_NOGRP' },
        fileField: 'imagecategorie',
      });
      assert.equal(r.status, 400);
      const count = await Categorie.countDocuments({ nomcategorie: 'CRUD_AUDIT_CAT_NOGRP' });
      assert.equal(count, 0);
      void g;
    });

    it('CREATE groupe inexistant → 404', async () => {
      const r = await requestMultipart('POST', '/api/categorie', {
        token: adminToken,
        fields: { nomcategorie: 'CRUD_AUDIT_CAT_BADG', groupe: FAKE_ID },
        fileField: 'imagecategorie',
      });
      assert.equal(r.status, 404);
      assert.equal(await Categorie.countDocuments({ nomcategorie: 'CRUD_AUDIT_CAT_BADG' }), 0);
    });

    it('CREATE sans image → 400', async () => {
      const g = await Groupe.create({ nomgroupe: 'CRUD_AUDIT_G2' });
      const r = await requestJson('POST', '/api/categorie', {
        token: adminToken,
        body: { nomcategorie: 'CRUD_AUDIT_CAT_NOIMG', groupe: String(g._id) },
      });
      assert.equal(r.status, 400);
      assert.equal(await Categorie.countDocuments({ nomcategorie: 'CRUD_AUDIT_CAT_NOIMG' }), 0);
    });

    it('READ détail + UPDATE + DELETE fixture', async () => {
      const g = await Groupe.create({ nomgroupe: 'CRUD_AUDIT_G3' });
      const created = await requestMultipart('POST', '/api/categorie', {
        token: adminToken,
        fields: { nomcategorie: 'CRUD_AUDIT_CAT_CRUD', groupe: String(g._id) },
        fileField: 'imagecategorie',
      });
      const id = created.json._id;
      const read = await requestJson('GET', `/api/categorie/${id}`);
      assert.equal(read.status, 200);

      const updated = await requestMultipart('PUT', `/api/categorie/${id}`, {
        token: adminToken,
        fields: { nomcategorie: 'CRUD_AUDIT_CAT_UPD', groupe: String(g._id) },
        fileField: 'imagecategorie',
      });
      assert.equal(updated.status, 200);

      const deleted = await requestJson('DELETE', `/api/categorie/${id}`, { token: adminToken });
      assert.equal(deleted.status, 200);
      const gone = await requestJson('GET', `/api/categorie/${id}`);
      assert.equal(gone.status, 404);
    });
  });

  describe('Services', () => {
    async function seedCategorie() {
      const g = await Groupe.create({ nomgroupe: `CRUD_AUDIT_SG_${Date.now()}` });
      return Categorie.create({
        nomcategorie: 'CRUD_AUDIT_SC',
        imagecategorie: 'https://res.cloudinary.com/demo/fix.jpg',
        groupe: g._id,
      });
    }

    it('CREATE valide via POST /service (multipart imageservice)', async () => {
      const cat = await seedCategorie();
      const r = await requestMultipart('POST', '/api/service', {
        token: adminToken,
        fields: {
          nomservice: 'CRUD_AUDIT_SVC',
          categorie: String(cat._id),
          prixmoyen: '1000',
          tags: '[]',
        },
        fileField: 'imageservice',
      });
      assert.equal(r.status, 201);
    });

    it('CREATE sans nomservice → 400, aucun document', async () => {
      const cat = await seedCategorie();
      const before = await Service.countDocuments();
      const r = await requestMultipart('POST', '/api/service', {
        token: adminToken,
        fields: { categorie: String(cat._id) },
        fileField: 'imageservice',
      });
      assert.equal(r.status, 400);
      assert.equal(await Service.countDocuments(), before);
    });

    it('UPDATE + DELETE fixture', async () => {
      const cat = await seedCategorie();
      const created = await requestMultipart('POST', '/api/service', {
        token: adminToken,
        fields: {
          nomservice: 'CRUD_AUDIT_SVC_DEL',
          categorie: String(cat._id),
        },
        fileField: 'imageservice',
      });
      const id = created.json._id;
      const updated = await requestJson('PUT', `/api/service/${id}`, {
        token: adminToken,
        body: { nomservice: 'CRUD_AUDIT_SVC_UPD' },
      });
      assert.equal(updated.status, 200);
      const deleted = await requestJson('DELETE', `/api/service/${id}`, { token: adminToken });
      assert.equal(deleted.status, 200);
    });
  });

  describe('Articles', () => {
    it('CREATE valide admin + photoArticle', async () => {
      const g = await Groupe.create({ nomgroupe: 'CRUD_AUDIT_EM' });
      const cat = await Categorie.create({
        nomcategorie: 'CRUD_AUDIT_AC',
        imagecategorie: 'https://res.cloudinary.com/demo/fix.jpg',
        groupe: g._id,
      });
      const vendeur = await Vendeur.create({
        utilisateur: adminUser._id,
        shopName: 'CRUD_AUDIT_SHOP',
        shopDescription: 'Fixture audit',
        verifier: true,
        status: 'active',
      });
      const r = await requestMultipart('POST', '/api/article', {
        token: adminToken,
        fields: {
          nomArticle: 'CRUD_AUDIT_ART',
          prixArticle: '1500',
          quantiteArticle: '3',
          vendeur: String(vendeur._id),
          categorie: String(cat._id),
        },
        fileField: 'photoArticle',
      });
      assert.equal(r.status, 201);
    });

    it('CREATE sans image → 400', async () => {
      const r = await requestJson('POST', '/api/article', {
        token: adminToken,
        body: { nomArticle: 'X', prixArticle: 1, quantiteArticle: 1, vendeur: FAKE_ID, categorie: FAKE_ID },
      });
      assert.equal(r.status, 400);
    });

    it('UPDATE JSON + DELETE fixture', async () => {
      const g = await Groupe.create({ nomgroupe: 'CRUD_AUDIT_EM2' });
      const cat = await Categorie.create({
        nomcategorie: 'CRUD_AUDIT_AC2',
        imagecategorie: 'https://res.cloudinary.com/demo/fix.jpg',
        groupe: g._id,
      });
      const vendeur = await Vendeur.create({
        utilisateur: adminUser._id,
        shopName: 'CRUD_AUDIT_SHOP2',
        shopDescription: 'Fixture audit 2',
        verifier: true,
        status: 'active',
      });
      const created = await requestMultipart('POST', '/api/article', {
        token: adminToken,
        fields: {
          nomArticle: 'CRUD_AUDIT_ART2',
          prixArticle: '900',
          quantiteArticle: '2',
          vendeur: String(vendeur._id),
          categorie: String(cat._id),
        },
        fileField: 'photoArticle',
      });
      const id = created.json._id;
      const updated = await requestJson('PUT', `/api/article/${id}`, {
        token: adminToken,
        body: { nomArticle: 'CRUD_AUDIT_ART2_UPD' },
      });
      assert.equal(updated.status, 200);
      const deleted = await requestJson('DELETE', `/api/article/${id}`, { token: adminToken });
      assert.equal(deleted.status, 200);
    });
  });

  describe('Utilisateurs admin', () => {
    it('LIST admin → 200', async () => {
      const r = await requestJson('GET', '/api/utilisateur', { token: adminToken });
      assert.equal(r.status, 200);
    });

    it('LIST client → 403', async () => {
      const r = await requestJson('GET', '/api/utilisateur', { token: clientToken });
      assert.equal(r.status, 403);
    });

    it('READ détail + UPDATE fixture', async () => {
      const u = await Utilisateur.create({
        nom: 'Fix',
        prenom: 'Ture',
        telephone: '+2250700000299',
        email: 'dash5c-fix@test.local',
        password: 'GateTest1a!!',
        role: 'Client',
        isActive: true,
      });
      const read = await requestJson('GET', `/api/utilisateur/${u._id}`, { token: adminToken });
      assert.equal(read.status, 200);
      const upd = await requestJson('PUT', `/api/utilisateur/${u._id}`, {
        token: adminToken,
        body: { nom: 'FixUpd' },
      });
      assert.equal(upd.status, 200);
    });
  });

  describe('Prestataires / Freelances / Vendeurs — listes', () => {
    it('GET /api/prestataire → 200', async () => {
      const r = await requestJson('GET', '/api/prestataire');
      assert.equal(r.status, 200);
    });

    it('GET /api/freelance → 200', async () => {
      const r = await requestJson('GET', '/api/freelance');
      assert.equal(r.status, 200);
    });

    it('GET /api/vendeur → 200', async () => {
      const r = await requestJson('GET', '/api/vendeur');
      assert.equal(r.status, 200);
    });

    it('GET pending prestataire admin → 200', async () => {
      const r = await requestJson('GET', '/api/prestataire/pending/list', { token: adminToken });
      assert.equal(r.status, 200);
    });
  });

  describe('Commandes', () => {
    it('LIST admin → 200', async () => {
      const r = await requestJson('GET', '/api/commandes', { token: adminToken });
      assert.equal(r.status, 200);
    });

    it('GET commande inexistante → 404', async () => {
      const r = await requestJson('GET', `/api/commande/${FAKE_ID}`, { token: adminToken });
      assert.equal(r.status, 404);
    });
  });

  describe('Prestations', () => {
    it('LIST → 200', async () => {
      const r = await requestJson('GET', '/api/prestations');
      assert.equal(r.status, 200);
    });

    it('PATCH statut invalide → 400', async () => {
      const r = await requestJson('PATCH', `/api/prestation/${FAKE_ID}/statut`, {
        token: adminToken,
        body: { statut: 'INVALID_STATUS_X' },
      });
      assert.equal(r.status, 400);
    });

    it('PATCH statut inexistant → 404', async () => {
      const r = await requestJson('PATCH', `/api/prestation/${FAKE_ID}/statut`, {
        token: adminToken,
        body: { statut: 'ANNULEE' },
      });
      assert.equal(r.status, 404);
    });
  });

  describe('Promotions CRUD fixture', () => {
    it('CREATE + UPDATE + DELETE + stats', async () => {
      const created = await requestJson('POST', '/api/promotion', {
        token: adminToken,
        body: {
          titre: 'CRUD_AUDIT_PROMO_OK',
          description: 'desc',
          typeOffre: 'POURCENTAGE',
          valeurOffre: 12,
          dateDebut: '2026-01-01',
          dateFin: '2026-06-01',
        },
      });
      assert.equal(created.status, 201);
      const id = created.json._id;

      const updated = await requestJson('PUT', `/api/promotion/${id}`, {
        token: adminToken,
        body: { titre: 'CRUD_AUDIT_PROMO_UPD', description: 'desc2' },
      });
      assert.equal(updated.status, 200);

      const stats = await requestJson('GET', '/api/promotions/stats', { token: adminToken });
      assert.equal(stats.status, 200);
      assert.ok(stats.json.totalPromotions >= 1);

      const deleted = await requestJson('DELETE', `/api/promotion/${id}`, { token: adminToken });
      assert.equal(deleted.status, 200);
    });
  });

  describe('Notifications admin', () => {
    it('LIST + stats + mark read flow', async () => {
      const n = await Notification.create({
        destinataire: adminUser._id,
        titre: 'CRUD_AUDIT_NOTIF',
        contenu: 'Message fixture audit',
        type: 'SYSTEME',
        lu: false,
      });
      const list = await requestJson('GET', '/api/notifications', { token: adminToken });
      assert.equal(list.status, 200);

      const stats = await requestJson('GET', '/api/notifications/stats', { token: adminToken });
      assert.equal(stats.status, 200);

      const read = await requestJson('PUT', `/api/notification/${n._id}/read`, { token: adminToken });
      assert.equal(read.status, 200);
    });
  });

  describe('Paiements admin (CAS B)', () => {
    it('GET /api/paiements sans token → 401', async () => {
      const r = await requestJson('GET', '/api/paiements');
      assert.equal(r.status, 401);
    });

    it('LIST + STATS admin avec fixture', async () => {
      await Paiement.create({
        numeroTransaction: Paiement.genererNumeroTransaction(),
        payeur: adminUser._id,
        typeObjet: 'COMMANDE',
        montantOriginal: 5000,
        montantNet: 5000,
        devise: 'XAF',
        methodePaiement: 'MOBILE_MONEY_MTN',
        statut: 'VALIDE',
        fournisseurPaiement: 'INTERNE',
        description: 'CRUD_AUDIT_PAY',
      });

      const list = await requestJson('GET', '/api/paiements', { token: adminToken });
      assert.equal(list.status, 200);
      assert.ok(Array.isArray(list.json.paiements));
      assert.ok(list.json.paiements.length >= 1);
      assert.equal(list.json.paiements[0].detailsCarte, undefined);

      const stats = await requestJson('GET', '/api/paiements/stats', { token: adminToken });
      assert.equal(stats.status, 200);
      assert.ok(stats.json.totalPaiements >= 1);
    });
  });

  describe('Agents recenseurs', () => {
    it('GET /api/utilisateur/field-agents admin → 200', async () => {
      const r = await requestJson('GET', '/api/utilisateur/field-agents', { token: adminToken });
      assert.equal(r.status, 200);
    });

    it('GET field-agents client → 403', async () => {
      const r = await requestJson('GET', '/api/utilisateur/field-agents', { token: clientToken });
      assert.equal(r.status, 403);
    });
  });
});
