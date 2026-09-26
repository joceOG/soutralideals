/**
 * DASH-8E.2 — Autorisations professionnelles (Mongo isolé).
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
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import Service from '../models/serviceModel.js';
import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import articleRouter from '../routes/articleRoutes.js';
import prestataireRouter from '../routes/prestataireRoutes.js';
import auth from '../middleware/authMiddleware.js';
import { requireProfessionalCapability } from '../middleware/requireProfessionalCapability.js';
import { resolveProfessionalCapabilities } from '../services/professionalCapabilitiesService.js';

const SECRET = 'dash8e2-authz-secret-min-32-chars!!!!';
const FIXTURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5+hHgAHggJ/PchI7wAAAABJRU5ErkJggz',
  'base64',
);

let server;
let baseUrl;
let categorieId;
let uploadMock;

function issueToken(userId, role) {
  return jwt.sign({ _id: String(userId), id: String(userId), role }, SECRET, { expiresIn: '1h' });
}

async function saveToken(user, token) {
  user.tokens = [{ token }];
  await user.save();
  return token;
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
    json = { raw: text.slice(0, 300) };
  }
  return { status: res.status, json, text };
}

async function requestMultipart(method, urlPath, { token, fields = {}, fileField } = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  if (fileField) {
    fd.append(fileField, new Blob([FIXTURE_PNG], { type: 'image/png' }), 'fix.png');
  }
  const headers = {};
  if (token !== undefined) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${urlPath}`, { method, headers, body: fd });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { status: res.status, json, text };
}

async function seedCatalog() {
  const g = await Groupe.create({ nomgroupe: 'dash8e2_grp' });
  const cat = await Categorie.create({
    nomcategorie: 'dash8e2_cat',
    imagecategorie: 'https://res.cloudinary.com/demo/fix.jpg',
    groupe: g._id,
  });
  categorieId = String(cat._id);
}

async function seedService() {
  const g = await Groupe.create({ nomgroupe: 'dash8e2_svc_grp' });
  const cat = await Categorie.create({
    nomcategorie: 'dash8e2_svc_cat',
    imagecategorie: 'https://res.cloudinary.com/demo/fix.jpg',
    groupe: g._id,
  });
  return Service.create({
    nomservice: 'dash8e2_svc',
    imageservice: 'https://res.cloudinary.com/demo/s.jpg',
    categorie: cat._id,
    prixmoyen: 1000,
  });
}

async function createOperationalVendeur(user, shopName) {
  return vendeurModel.create({
    utilisateur: user._id,
    shopName,
    shopDescription: 'S',
    businessType: 'Particulier',
    businessCategories: ['Mode'],
    status: 'active',
    accountStatus: 'Active',
    verificationDocuments: { isVerified: true },
  });
}

async function createOperationalPrestataire(user, svc) {
  return prestataireModel.create({
    utilisateur: user._id,
    service: svc._id,
    prixprestataire: 1000,
    localisation: 'Abidjan',
    status: 'active',
    verifier: true,
  });
}

describe('DASH-8E.2 — autorisations professionnelles', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    process.env.PHONE_VERIFICATION_MODE = 'off';
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';
    await startIsolatedMongo();

    uploadMock = mock.method(cloudinary.v2.uploader, 'upload', async () => ({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/dash8e2.jpg',
      public_id: 'dash8e2_fixture',
    }));
    mock.method(cloudinary.v2.uploader, 'destroy', async () => ({}));

    const requireFreelanceOp = requireProfessionalCapability('Freelance', {
      requireOperational: true,
      allowAdmin: false,
    });

    const app = express();
    app.use(express.json());
    app.use('/api', articleRouter);
    app.use('/api', prestataireRouter);
    app.get(
      '/api/test/freelance-exercise',
      auth,
      requireFreelanceOp,
      (req, res) => res.json({ success: true, ok: true }),
    );
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    uploadMock?.restore?.();
    if (server) await new Promise((resolve) => server.close(resolve));
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    process.env.JWT_SECRET = SECRET;
    await seedCatalog();
  });

  it('1 — 401 sans token sur POST /article', async () => {
    const r = await requestMultipart('POST', '/api/article', {
      fields: { nomArticle: 'x', categorie: categorieId, vendeur: '507f1f77bcf86cd799439011' },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 401);
  });

  it('2 — Client sans profil refusé', async () => {
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Client',
      telephone: '+2250700002401',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const other = await Utilisateur.create({
      nom: 'E2',
      prenom: 'ShopOwner',
      telephone: '+2250700002499',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const v = await createOperationalVendeur(other, 'orphan_shop');
    const r = await requestMultipart('POST', '/api/article', {
      token: t,
      fields: {
        nomArticle: 'x',
        prixArticle: '1',
        quantiteArticle: '1',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_PROFILE_REQUIRED');
  });

  it('3 — rôle legacy Vendeur sans profil opérationnel refusé', async () => {
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Legacy',
      telephone: '+2250700002402',
      password: 'Dash8e2Pass!!',
      role: 'Vendeur',
    });
    const t = await saveToken(u, issueToken(u._id, 'Vendeur'));
    const other = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Owner',
      telephone: '+2250700002403',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const v = await createOperationalVendeur(other, 'real_shop');
    const r = await requestMultipart('POST', '/api/article', {
      token: t,
      fields: {
        nomArticle: 'x',
        prixArticle: '1',
        quantiteArticle: '1',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_PROFILE_REQUIRED');
  });

  it('4 — Client avec Vendeur opérationnel autorisé', async () => {
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Seller',
      telephone: '+2250700002404',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const v = await createOperationalVendeur(u, 'dash8e2_ok');
    const r = await requestMultipart('POST', '/api/article', {
      token: t,
      fields: {
        nomArticle: 'dash8e2_item',
        prixArticle: '100',
        quantiteArticle: '2',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 201);
  });

  it('5 — legacy Prestataire JWT mais seulement Vendeur opérationnel → article OK', async () => {
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'DualLegacy',
      telephone: '+2250700002405',
      password: 'Dash8e2Pass!!',
      role: 'Prestataire',
    });
    const t = await saveToken(u, issueToken(u._id, 'Prestataire'));
    const v = await createOperationalVendeur(u, 'dash8e2_dual');
    const r = await requestMultipart('POST', '/api/article', {
      token: t,
      fields: {
        nomArticle: 'dash8e2_dual_item',
        prixArticle: '50',
        quantiteArticle: '1',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 201);
  });

  it('6 — capacité Vendeur ne donne pas accès Prestataire (deactivate)', async () => {
    const svc = await seedService();
    const seller = await Utilisateur.create({
      nom: 'E2',
      prenom: 'VOnly',
      telephone: '+2250700002406',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const sellerToken = await saveToken(seller, issueToken(seller._id, 'Client'));
    await createOperationalVendeur(seller, 'vonly');
    const other = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Other',
      telephone: '+2250700002407',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const otherPresta = await createOperationalPrestataire(other, svc);
    const r = await requestJson('POST', `/api/prestataire/${otherPresta._id}/deactivate`, {
      token: sellerToken,
    });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'USER_ACCESS_FORBIDDEN');
  });

  it('7 — profil pending refusé pour exercer (article)', async () => {
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Pending',
      telephone: '+2250700002408',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const v = await vendeurModel.create({
      utilisateur: u._id,
      shopName: 'pending_shop',
      shopDescription: 'S',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
      status: 'pending',
      accountStatus: 'Pending',
    });
    const r = await requestMultipart('POST', '/api/article', {
      token: t,
      fields: {
        nomArticle: 'x',
        prixArticle: '1',
        quantiteArticle: '1',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_PROFILE_NOT_OPERATIONAL');
  });

  it('8 — profil rejected refusé', async () => {
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Rej',
      telephone: '+2250700002409',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const v = await vendeurModel.create({
      utilisateur: u._id,
      shopName: 'rej_shop',
      shopDescription: 'S',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
      status: 'rejected',
    });
    const r = await requestMultipart('POST', '/api/article', {
      token: t,
      fields: {
        nomArticle: 'x',
        prixArticle: '1',
        quantiteArticle: '1',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_PROFILE_NOT_OPERATIONAL');
  });

  it('9 — profil suspended refusé', async () => {
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Susp',
      telephone: '+2250700002410',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const v = await vendeurModel.create({
      utilisateur: u._id,
      shopName: 'susp_shop',
      shopDescription: 'S',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
      status: 'suspended',
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true },
    });
    const r = await requestMultipart('POST', '/api/article', {
      token: t,
      fields: {
        nomArticle: 'x',
        prixArticle: '1',
        quantiteArticle: '1',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_PROFILE_NOT_OPERATIONAL');
  });

  it('10 — actif mais non vérifié refusé', async () => {
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Unver',
      telephone: '+2250700002411',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const v = await vendeurModel.create({
      utilisateur: u._id,
      shopName: 'unver_shop',
      shopDescription: 'S',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
      status: 'active',
      accountStatus: 'Active',
      verificationDocuments: { isVerified: false },
    });
    const r = await requestMultipart('POST', '/api/article', {
      token: t,
      fields: {
        nomArticle: 'x',
        prixArticle: '1',
        quantiteArticle: '1',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_PROFILE_NOT_OPERATIONAL');
  });

  it('11 — doublon Vendeur → conflit', async () => {
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Dup',
      telephone: '+2250700002412',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const v1 = await createOperationalVendeur(u, 'dup_a');
    await createOperationalVendeur(u, 'dup_b');
    const r = await requestMultipart('POST', '/api/article', {
      token: t,
      fields: {
        nomArticle: 'x',
        prixArticle: '1',
        quantiteArticle: '1',
        vendeur: String(v1._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_PROFILE_CONFLICT');
  });

  it('12 — ownership tiers sur article (403 ownership)', async () => {
    const owner = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Own',
      telephone: '+2250700002413',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    await saveToken(owner, issueToken(owner._id, 'Client'));
    const v = await createOperationalVendeur(owner, 'owned');
    const intruder = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Intr',
      telephone: '+2250700002414',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const intruderToken = await saveToken(intruder, issueToken(intruder._id, 'Client'));
    await createOperationalVendeur(intruder, 'intruder_shop');
    const r = await requestMultipart('POST', '/api/article', {
      token: intruderToken,
      fields: {
        nomArticle: 'x',
        prixArticle: '1',
        quantiteArticle: '1',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 403);
    assert.ok(r.json.error?.includes('boutique') || r.text.includes('boutique'));
  });

  it('13 — bypass Admin sur article (allowAdmin: true)', async () => {
    const admin = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Admin',
      telephone: '+2250700002415',
      password: 'Dash8e2Pass!!',
      role: 'Admin',
    });
    const adminToken = await saveToken(admin, issueToken(admin._id, 'Admin'));
    const seller = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Shop',
      telephone: '+2250700002416',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const v = await createOperationalVendeur(seller, 'admin_target');
    const r = await requestMultipart('POST', '/api/article', {
      token: adminToken,
      fields: {
        nomArticle: 'admin_item',
        prixArticle: '10',
        quantiteArticle: '1',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 201);
  });

  it('13b — Admin sans allowAdmin sur gate Freelance → refus', async () => {
    const admin = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Admin2',
      telephone: '+2250700002417',
      password: 'Dash8e2Pass!!',
      role: 'Admin',
    });
    const adminToken = await saveToken(admin, issueToken(admin._id, 'Admin'));
    const r = await requestJson('GET', '/api/test/freelance-exercise', { token: adminToken });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_PROFILE_REQUIRED');
  });

  it('14 — erreurs sans KYC ni ObjectId profil', async () => {
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Kyc',
      telephone: '+2250700002418',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    await vendeurModel.create({
      utilisateur: u._id,
      shopName: 'kyc_shop',
      shopDescription: 'S',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
      status: 'pending',
      cni1: 'https://secret/kyc.jpg',
    });
    const v = await vendeurModel.findOne({ utilisateur: u._id });
    const r = await requestMultipart('POST', '/api/article', {
      token: t,
      fields: {
        nomArticle: 'x',
        prixArticle: '1',
        quantiteArticle: '1',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(r.status, 403);
    assert.ok(!r.text.includes('secret/kyc'));
    assert.ok(!r.text.includes('cni'));
  });

  it('15 — middlewares read-only (counts documents)', async () => {
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Ro',
      telephone: '+2250700002419',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const v = await createOperationalVendeur(u, 'ro_shop');
    const beforeUsers = await Utilisateur.countDocuments();
    const beforeV = await vendeurModel.countDocuments();
    await requestMultipart('POST', '/api/article', {
      token: t,
      fields: {
        nomArticle: 'ro_item',
        prixArticle: '1',
        quantiteArticle: '1',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(await Utilisateur.countDocuments(), beforeUsers);
    const afterV = await vendeurModel.findById(v._id).lean();
    assert.equal(afterV.__v, v.__v);
    assert.equal(await vendeurModel.countDocuments(), beforeV + 0);
  });

  it('16 — JWT Vendeur seul ne suffit pas sans profil opérationnel', async () => {
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'JwtOnly',
      telephone: '+2250700002420',
      password: 'Dash8e2Pass!!',
      role: 'Vendeur',
    });
    const t = await saveToken(u, issueToken(u._id, 'Vendeur'));
    const r = await requestJson('GET', '/api/test/freelance-exercise', { token: t });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_PROFILE_REQUIRED');
  });

  it('17 — multi-profils opérationnels Prestataire + Vendeur (cycle pause)', async () => {
    const svc = await seedService();
    const u = await Utilisateur.create({
      nom: 'E2',
      prenom: 'Multi',
      telephone: '+2250700002421',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const presta = await createOperationalPrestataire(u, svc);
    const v = await createOperationalVendeur(u, 'multi_shop');
    const art = await requestMultipart('POST', '/api/article', {
      token: t,
      fields: {
        nomArticle: 'multi',
        prixArticle: '1',
        quantiteArticle: '1',
        vendeur: String(v._id),
        categorie: categorieId,
      },
      fileField: 'photoArticle',
    });
    assert.equal(art.status, 201);
    const deact = await requestJson('POST', `/api/prestataire/${presta._id}/deactivate`, { token: t });
    assert.equal(deact.status, 200);
    const paused = await resolveProfessionalCapabilities(u._id);
    assert.ok(!paused.capabilities.includes('Prestataire'));
    assert.equal(paused.profiles.prestataire.canOperate, false);
    const react = await requestJson('POST', `/api/prestataire/${presta._id}/reactivate`, { token: t });
    assert.equal(react.status, 200);
    const restored = await resolveProfessionalCapabilities(u._id);
    assert.ok(restored.capabilities.includes('Prestataire'));
    assert.equal(restored.profiles.prestataire.canOperate, true);
  });

  it('E21-6 pending → reactivate refusé', async () => {
    const svc = await seedService();
    const u = await Utilisateur.create({
      nom: 'E21',
      prenom: 'Pend',
      telephone: '+2250700002501',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const p = await prestataireModel.create({
      utilisateur: u._id,
      service: svc._id,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'pending',
    });
    const r = await requestJson('POST', `/api/prestataire/${p._id}/reactivate`, { token: t });
    assert.equal(r.status, 409);
    assert.equal(r.json.code, 'INVALID_PROFESSIONAL_STATE_TRANSITION');
  });

  it('E21-7 rejected → reactivate refusé', async () => {
    const svc = await seedService();
    const u = await Utilisateur.create({
      nom: 'E21',
      prenom: 'Rej',
      telephone: '+2250700002502',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const p = await prestataireModel.create({
      utilisateur: u._id,
      service: svc._id,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'rejected',
    });
    const r = await requestJson('POST', `/api/prestataire/${p._id}/reactivate`, { token: t });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_REACTIVATION_FORBIDDEN');
  });

  it('E21-8 suspension admin → reactivate self refusé', async () => {
    const svc = await seedService();
    const u = await Utilisateur.create({
      nom: 'E21',
      prenom: 'Adm',
      telephone: '+2250700002503',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const p = await prestataireModel.create({
      utilisateur: u._id,
      service: svc._id,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'suspended',
      verifier: false,
      ownerSelfPaused: false,
    });
    const r = await requestJson('POST', `/api/prestataire/${p._id}/reactivate`, { token: t });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_REACTIVATION_FORBIDDEN');
  });

  it('E21-9 non vérifié → reactivate refusé', async () => {
    const svc = await seedService();
    const u = await Utilisateur.create({
      nom: 'E21',
      prenom: 'Nv',
      telephone: '+2250700002504',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const p = await prestataireModel.create({
      utilisateur: u._id,
      service: svc._id,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'pending',
    });
    await prestataireModel.collection.updateOne(
      { _id: p._id },
      { $set: { status: 'active', verifier: false, ownerSelfPaused: true } },
    );
    const r = await requestJson('POST', `/api/prestataire/${p._id}/reactivate`, { token: t });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_REACTIVATION_FORBIDDEN');
  });

  it('E21-10 doublons → deactivate refusé', async () => {
    const svc = await seedService();
    const u = await Utilisateur.create({
      nom: 'E21',
      prenom: 'Dup',
      telephone: '+2250700002505',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const p1 = await createOperationalPrestataire(u, svc);
    await createOperationalPrestataire(u, svc);
    const r = await requestJson('POST', `/api/prestataire/${p1._id}/deactivate`, { token: t });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_PROFILE_CONFLICT');
  });

  it('E21-11 tiers → 403 ownership', async () => {
    const svc = await seedService();
    const owner = await Utilisateur.create({
      nom: 'E21',
      prenom: 'Own',
      telephone: '+2250700002506',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const intruder = await Utilisateur.create({
      nom: 'E21',
      prenom: 'Int',
      telephone: '+2250700002507',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const intruderToken = await saveToken(intruder, issueToken(intruder._id, 'Client'));
    const p = await createOperationalPrestataire(owner, svc);
    await createOperationalPrestataire(intruder, svc);
    const r = await requestJson('POST', `/api/prestataire/${p._id}/deactivate`, { token: intruderToken });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'USER_ACCESS_FORBIDDEN');
  });

  it('E21-12 JWT Prestataire sans profil opérationnel → deactivate refusé', async () => {
    const u = await Utilisateur.create({
      nom: 'E21',
      prenom: 'Jwt',
      telephone: '+2250700002508',
      password: 'Dash8e2Pass!!',
      role: 'Prestataire',
    });
    const t = await saveToken(u, issueToken(u._id, 'Prestataire'));
    const svc = await seedService();
    const p = await prestataireModel.create({
      utilisateur: u._id,
      service: svc._id,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'pending',
    });
    const r = await requestJson('POST', `/api/prestataire/${p._id}/deactivate`, { token: t });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'PROFESSIONAL_PROFILE_NOT_OPERATIONAL');
  });

  it('E21-13 Admin sans bypass deactivate', async () => {
    const svc = await seedService();
    const admin = await Utilisateur.create({
      nom: 'E21',
      prenom: 'Admin',
      telephone: '+2250700002509',
      password: 'Dash8e2Pass!!',
      role: 'Admin',
    });
    const owner = await Utilisateur.create({
      nom: 'E21',
      prenom: 'Own2',
      telephone: '+2250700002510',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const adminToken = await saveToken(admin, issueToken(admin._id, 'Admin'));
    const p = await createOperationalPrestataire(owner, svc);
    const r = await requestJson('POST', `/api/prestataire/${p._id}/deactivate`, { token: adminToken });
    assert.equal(r.status, 403);
    assert.equal(r.json.code, 'USER_ACCESS_FORBIDDEN');
  });

  it('E21-14 refus sans mutation', async () => {
    const svc = await seedService();
    const u = await Utilisateur.create({
      nom: 'E21',
      prenom: 'Ro',
      telephone: '+2250700002511',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const p = await prestataireModel.create({
      utilisateur: u._id,
      service: svc._id,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'pending',
    });
    const before = (await prestataireModel.findById(p._id).lean()).ownerSelfPaused;
    const denied = await requestJson('POST', `/api/prestataire/${p._id}/deactivate`, { token: t });
    assert.equal(denied.status, 403);
    const after = await prestataireModel.findById(p._id).lean();
    assert.equal(after.ownerSelfPaused, before);
    assert.equal(after.status, 'pending');
  });

  it('E21-15 deactivate idempotent', async () => {
    const svc = await seedService();
    const u = await Utilisateur.create({
      nom: 'E21',
      prenom: 'Idem',
      telephone: '+2250700002512',
      password: 'Dash8e2Pass!!',
      role: 'Client',
    });
    const t = await saveToken(u, issueToken(u._id, 'Client'));
    const p = await createOperationalPrestataire(u, svc);
    const first = await requestJson('POST', `/api/prestataire/${p._id}/deactivate`, { token: t });
    assert.equal(first.status, 200);
    const second = await requestJson('POST', `/api/prestataire/${p._id}/deactivate`, { token: t });
    assert.equal(second.status, 200);
    assert.equal(second.json.idempotent, true);
  });
});
