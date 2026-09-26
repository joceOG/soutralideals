/**
 * DASH-8E.1 — Capacités professionnelles (Mongo isolé).
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
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import Service from '../models/serviceModel.js';
import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import utilisateurRouter from '../routes/utilisateurRoutes.js';
import { resolveProfessionalCapabilities } from '../services/professionalCapabilitiesService.js';

const SECRET = 'dash8e1-capabilities-secret-min-32-chars!!';

let server;
let baseUrl;
let adminToken;
let clientToken;
let clientUser;
let adminUser;

function issueToken(userId, role) {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, { expiresIn: '1h' });
}

async function requestJson(method, urlPath, { token } = {}) {
  const headers = {};
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${urlPath}`, { method, headers });
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
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
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
    nom: 'E1',
    prenom: 'Admin',
    telephone: '+2250700001401',
    email: 'dash8e1-admin@test.local',
    password: 'Dash8e1Pass!!',
    role: 'Admin',
  });
  adminToken = issueToken(adminUser._id, 'Admin');
  adminUser.tokens = [{ token: adminToken }];
  await adminUser.save();

  clientUser = await Utilisateur.create({
    nom: 'E1',
    prenom: 'Client',
    telephone: '+2250700001402',
    email: 'dash8e1-client@test.local',
    password: 'Dash8e1Pass!!',
    role: 'Client',
  });
  clientToken = issueToken(clientUser._id, 'Client');
  clientUser.tokens = [{ token: clientToken }];
  await clientUser.save();
}

async function seedService() {
  const g = await Groupe.create({ nomgroupe: 'dash8e1_grp' });
  const cat = await Categorie.create({
    nomcategorie: 'dash8e1_cat',
    imagecategorie: 'https://res.cloudinary.com/demo/fix.jpg',
    groupe: g._id,
  });
  return Service.create({
    nomservice: 'dash8e1_svc',
    imageservice: 'https://res.cloudinary.com/demo/s.jpg',
    categorie: cat._id,
    prixmoyen: 1000,
  });
}

describe('DASH-8E.1 — capacités professionnelles', () => {
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
    await seedUsers();
  });

  it('1 — Client sans profil → aucune capacité', async () => {
    const r = await resolveProfessionalCapabilities(clientUser._id);
    assert.deepEqual(r.capabilities, []);
    assert.equal(r.accountRole, 'Client');
  });

  it('2 — Client + Prestataire → capacité Prestataire', async () => {
    const svc = await seedService();
    await prestataireModel.create({
      utilisateur: clientUser._id,
      service: svc._id,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'active',
      verifier: true,
    });
    const r = await resolveProfessionalCapabilities(clientUser._id);
    assert.ok(r.capabilities.includes('Prestataire'));
  });

  it('3 — Client + Prestataire + Vendeur → deux capacités', async () => {
    const svc = await seedService();
    await prestataireModel.create({
      utilisateur: clientUser._id,
      service: svc._id,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'active',
      verifier: true,
    });
    await vendeurModel.create({
      utilisateur: clientUser._id,
      shopName: 'dash8e1_shop',
      shopDescription: 'S',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
      status: 'active',
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true },
    });
    const r = await resolveProfessionalCapabilities(clientUser._id);
    assert.equal(r.capabilities.length, 2);
  });

  it('4 — trois profils → une seule capacité opérationnelle (Freelance)', async () => {
    const svc = await seedService();
    await prestataireModel.create({
      utilisateur: clientUser._id,
      service: svc._id,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'pending',
    });
    await freelanceModel.create({
      utilisateur: clientUser._id,
      name: 'FL',
      job: 'Dev',
      category: 'IT',
      hourlyRate: 5000,
      location: 'Abidjan',
      status: 'active',
      accountStatus: 'Active',
    });
    await vendeurModel.create({
      utilisateur: clientUser._id,
      shopName: 'dash8e1_shop2',
      shopDescription: 'S',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
      status: 'pending',
    });
    const r = await resolveProfessionalCapabilities(clientUser._id);
    assert.deepEqual(r.capabilities, ['Freelance']);
    assert.equal(r.profiles.prestataire.status, 'pending');
    assert.equal(r.profiles.vendeur.status, 'pending');
  });

  it('5 — Admin sans profil → aucune capacité pro', async () => {
    const r = await resolveProfessionalCapabilities(adminUser._id);
    assert.equal(r.accountRole, 'Admin');
    assert.deepEqual(r.capabilities, []);
  });

  it('6 — Admin avec Vendeur → capacité Vendeur', async () => {
    await vendeurModel.create({
      utilisateur: adminUser._id,
      shopName: 'dash8e1_admin_shop',
      shopDescription: 'S',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
      status: 'active',
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true },
    });
    const r = await resolveProfessionalCapabilities(adminUser._id);
    assert.ok(r.capabilities.includes('Vendeur'));
  });

  it('7 — legacy role Vendeur sans profil → incohérence', async () => {
    await Utilisateur.findByIdAndUpdate(clientUser._id, { role: 'Vendeur' });
    const r = await resolveProfessionalCapabilities(clientUser._id);
    assert.deepEqual(r.capabilities, []);
    assert.ok(r.inconsistencies.includes('LEGACY_ROLE_WITHOUT_PROFILE'));
  });

  it('8 — legacy role Vendeur avec profil → capacité Vendeur', async () => {
    await Utilisateur.findByIdAndUpdate(clientUser._id, { role: 'Vendeur' });
    await vendeurModel.create({
      utilisateur: clientUser._id,
      shopName: 'dash8e1_legacy',
      shopDescription: 'S',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
      status: 'active',
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true },
    });
    const r = await resolveProfessionalCapabilities(clientUser._id);
    assert.ok(r.capabilities.includes('Vendeur'));
  });

  it('9 — profil en attente → pending et canOperate false', async () => {
    await vendeurModel.create({
      utilisateur: clientUser._id,
      shopName: 'dash8e1_pending',
      shopDescription: 'S',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
      status: 'pending',
      accountStatus: 'Pending',
    });
    const r = await resolveProfessionalCapabilities(clientUser._id);
    assert.equal(r.profiles.vendeur.status, 'pending');
    assert.equal(r.profiles.vendeur.canOperate, false);
    assert.ok(!r.capabilities.includes('Vendeur'));
  });

  it('10 — profil rejeté → exists sans capacité', async () => {
    await freelanceModel.create({
      utilisateur: clientUser._id,
      name: 'X',
      job: 'Y',
      category: 'Z',
      hourlyRate: 1000,
      location: 'Abidjan',
      status: 'rejected',
    });
    const r = await resolveProfessionalCapabilities(clientUser._id);
    assert.equal(r.profiles.freelance.exists, true);
    assert.equal(r.profiles.freelance.status, 'rejected');
    assert.ok(!r.capabilities.includes('Freelance'));
  });

  it('11 — /me/capabilities sans token → 401', async () => {
    const res = await requestJson('GET', '/api/utilisateur/me/capabilities');
    assert.equal(res.status, 401);
  });

  it('12 — utilisateur du token absent → 401 (couche auth)', async () => {
    const ghostToken = issueToken('507f1f77bcf86cd799439011', 'Client');
    const res = await requestJson('GET', '/api/utilisateur/me/capabilities', { token: ghostToken });
    assert.equal(res.status, 401);
  });

  it('13 — aucune donnée KYC dans /me/capabilities', async () => {
    const svc = await seedService();
    await prestataireModel.create({
      utilisateur: clientUser._id,
      service: svc._id,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      cni1: 'secret-url',
      status: 'active',
      verifier: true,
    });
    const res = await requestJson('GET', '/api/utilisateur/me/capabilities', { token: clientToken });
    assert.equal(res.status, 200);
    const body = JSON.stringify(res.json);
    assert.ok(!body.includes('secret-url'));
    assert.ok(!body.includes('cni'));
  });

  it('14 — route Admin réutilise le resolver', async () => {
    const svc = await seedService();
    await prestataireModel.create({
      utilisateur: clientUser._id,
      service: svc._id,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'active',
      verifier: true,
    });
    const res = await requestJson('GET', `/api/utilisateur/${clientUser._id}/roles`, {
      token: adminToken,
    });
    assert.equal(res.status, 200);
    assert.ok(res.json.data.capabilities.includes('Prestataire'));
    assert.ok(res.json.data.profiles.prestataire.id);
  });

  it('15 — création Admin avec rôle professionnel → 400', async () => {
    const res = await requestMultipart('POST', '/api/utilisateur', {
      token: adminToken,
      fields: {
        nom: 'Bad',
        prenom: 'Pro',
        password: 'Dash8e1Pass!!',
        role: 'Vendeur',
      },
    });
    assert.equal(res.status, 400);
    const created = await Utilisateur.findOne({ nom: 'Bad', prenom: 'Pro' });
    assert.equal(created, null);
  });

  it('16 — création Client inchangée', async () => {
    const res = await requestMultipart('POST', '/api/utilisateur', {
      token: adminToken,
      fields: {
        nom: 'Ok',
        prenom: 'Client',
        password: 'Dash8e1Pass!!',
        role: 'Client',
        email: 'dash8e1-new@test.local',
      },
    });
    assert.equal(res.status, 201);
  });

  it('17 — resolver ne modifie aucun document', async () => {
    const before = await Utilisateur.findById(clientUser._id).lean();
    await resolveProfessionalCapabilities(clientUser._id);
    const after = await Utilisateur.findById(clientUser._id).lean();
    assert.deepEqual(before.role, after.role);
  });
});
