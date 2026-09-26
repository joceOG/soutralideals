/**
 * DASH-8E.3A.1 — Durcissement import, recherche publique, identité.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import mongoose from 'mongoose';

import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import Utilisateur from '../models/utilisateurModel.js';
import Categorie from '../models/categorieModel.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import { importPrestatairesCSV } from '../controller/importController.js';
import { globalSearch } from '../controller/searchController.js';
import {
  PUBLIC_SEARCH_KEYS,
  assertPublicSearchDtoKeys,
} from '../utils/publicSearchPresenters.js';

let server;
let baseUrl;
let categoryId;
let serviceId;
let adminUser;

function baseRow(overrides = {}) {
  return {
    nom: 'ImportA31',
    telephone: '+2250700400101',
    metier: 'Plomberie',
    categorieId: String(categoryId),
    latitude: '5.3',
    longitude: '-4.0',
    ville: 'Abidjan',
    quartier: 'Plateau',
    ...overrides,
  };
}

async function importRows(rows, user = null) {
  return new Promise((resolve) => {
    importPrestatairesCSV(
      {
        body: { csvData: rows },
        user: user || { role: 'Admin', _id: adminUser._id },
      },
      {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          resolve({ status: this.statusCode || 200, json: payload });
        },
      },
    );
  });
}

async function seedCatalog() {
  const gId = new mongoose.Types.ObjectId();
  categoryId = new mongoose.Types.ObjectId();
  serviceId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('groupes').insertOne({ _id: gId, nomgroupe: 'A31' });
  await mongoose.connection.collection('categories').insertOne({
    _id: categoryId,
    nomcategorie: 'A31-Catalog',
    imagecategorie: 'https://res.cloudinary.com/demo/a31.jpg',
    groupe: gId,
  });
  await mongoose.connection.collection('services').insertOne({
    _id: serviceId,
    nomservice: 'Plomberie',
    categorie: categoryId,
  });
}

describe('DASH-8E.3A.1 — import & recherche durcis', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await startIsolatedMongo();
    const app = express();
    app.get('/api/search', (req, res) => globalSearch(req, res));
    server = http.createServer(app);
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise((r) => server.close(r));
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    await seedCatalog();
    adminUser = await Utilisateur.create({
      nom: 'Admin',
      prenom: 'A31',
      telephone: '+2250700400001',
      password: 'Dash8e3a1Pass!!',
      role: 'Admin',
      telephoneVerified: true,
    });
  });

  it('1 import téléphone vérifié unique → rattachement', async () => {
    const tel = '+2250700400201';
    const existing = await Utilisateur.create({
      nom: 'Verified',
      prenom: 'U',
      telephone: tel,
      password: 'Dash8e3a1Pass!!',
      role: 'Client',
      telephoneVerified: true,
      isActive: true,
    });
    const beforeP = await prestataireModel.countDocuments();
    const r = await importRows([baseRow({ telephone: tel })]);
    assert.equal(r.json.results.success, 1);
    assert.equal(await prestataireModel.countDocuments(), beforeP + 1);
    const p = await prestataireModel.findOne({ utilisateur: existing._id });
    assert.ok(p);
    assert.equal((await Utilisateur.findById(existing._id)).role, 'Client');
  });

  it('2-4 import téléphone non vérifié → conflit sans profil ni mutation', async () => {
    const tel = '+2250700400301';
    const existing = await Utilisateur.create({
      nom: 'Unverified',
      prenom: 'U',
      telephone: tel,
      password: 'Dash8e3a1Pass!!',
      role: 'Client',
      telephoneVerified: false,
      isActive: true,
    });
    const snap = existing.toObject();
    const r = await importRows([baseRow({ telephone: tel })]);
    const c = r.json.results.conflicts.find((x) => x.code === 'IMPORT_IDENTITY_REVIEW_REQUIRED');
    assert.ok(c);
    assert.equal(r.json.results.success, 0);
    assert.equal(await prestataireModel.countDocuments({ utilisateur: existing._id }), 0);
    const after = await Utilisateur.findById(existing._id).lean();
    assert.equal(after.role, snap.role);
    assert.equal(after.telephoneVerified, false);
    assert.ok(!JSON.stringify(r.json).includes(String(existing._id)));
  });

  it('5 plusieurs comptes vérifiés → conflit', async () => {
    const tel = '+2250700400401';
    await Utilisateur.create({
      nom: 'A',
      prenom: 'X',
      telephone: tel,
      password: 'Dash8e3a1Pass!!',
      role: 'Client',
      telephoneVerified: true,
    });
    await Utilisateur.create({
      nom: 'B',
      prenom: 'X',
      telephone: `00${tel.slice(1)}`,
      password: 'Dash8e3a1Pass!!',
      role: 'Client',
      telephoneVerified: true,
    });
    const r = await importRows([baseRow({ telephone: tel })]);
    assert.ok(
      r.json.results.conflicts.some((x) => x.code === 'IMPORT_IDENTITY_REVIEW_REQUIRED'),
    );
    assert.equal(r.json.results.success, 0);
  });

  it('6-7 stub Client inactif persisté en Mongo', async () => {
    const tel = '+2250700400501';
    const r = await importRows([baseRow({ telephone: tel })]);
    assert.equal(r.json.results.success, 1);
    const reloaded = await Utilisateur.findOne({ telephone: tel }).lean();
    assert.ok(reloaded);
    assert.equal(reloaded.role, 'Client');
    assert.equal(reloaded.isActive, false);
    assert.equal(reloaded.telephoneVerified, false);
    assert.equal(reloaded.activationStatus, 'pending_claim');
    assert.equal(reloaded.source, 'import');
  });

  it('8 Admin vérifié → rôle conservé', async () => {
    const tel = '+2250700400601';
    const admin = await Utilisateur.create({
      nom: 'Boss',
      prenom: 'A31',
      telephone: tel,
      password: 'Dash8e3a1Pass!!',
      role: 'Admin',
      telephoneVerified: true,
      isActive: true,
    });
    const r = await importRows([baseRow({ telephone: tel })]);
    assert.equal(r.json.results.success, 1);
    assert.equal((await Utilisateur.findById(admin._id)).role, 'Admin');
  });

  it('9 second Prestataire même user → conflit profil', async () => {
    const tel = '+2250700400701';
    await Utilisateur.create({
      nom: 'HasP',
      prenom: 'A31',
      telephone: tel,
      password: 'Dash8e3a1Pass!!',
      role: 'Client',
      telephoneVerified: true,
      isActive: true,
    });
    await importRows([baseRow({ telephone: tel })]);
    const r2 = await importRows([baseRow({ telephone: tel, nom: 'Again' })]);
    assert.ok(
      r2.json.results.conflicts.some((x) => x.code === 'PROFESSIONAL_PROFILE_ALREADY_EXISTS'),
    );
  });

  it('10-11 catégorie manquante → erreur sans catégorie Import CSV', async () => {
    const beforeCats = await Categorie.countDocuments({ nomcategorie: 'Import CSV' });
    const row = baseRow({ telephone: '+2250700400801' });
    delete row.categorieId;
    delete process.env.IMPORT_PRESTATAIRE_CATEGORIE_ID;
    const r = await importRows([row]);
    assert.ok(
      r.json.results.errors.some((e) => e.code === 'IMPORT_CATEGORY_CONFIGURATION_REQUIRED'),
    );
    assert.equal(r.json.results.success, 0);
    assert.equal(await Categorie.countDocuments({ nomcategorie: 'Import CSV' }), beforeCats);
  });

  it('12-15 DTO whitelist + champ sensible non exposé', async () => {
    const u = await Utilisateur.create({
      nom: 'Pub',
      prenom: 'Search',
      telephone: '+2250700400901',
      password: 'Dash8e3a1Pass!!',
      role: 'Client',
    });
    await prestataireModel.collection.insertOne({
      utilisateur: u._id,
      service: serviceId,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      description: 'WhitelistKeywordA31',
      status: 'active',
      verifier: true,
      secretInternalField: 'must-not-leak',
    });
    await freelanceModel.create({
      utilisateur: u._id,
      name: 'FreelanceA31',
      job: 'WhitelistKeywordA31',
      category: 'Batiment',
      hourlyRate: 5000,
      location: 'Abidjan',
      rating: 4,
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true, cni: 'secret-cni' },
      status: 'active',
    });
    await vendeurModel.create({
      utilisateur: u._id,
      shopName: 'ShopWhitelistKeywordA31',
      shopDescription: 'Desc',
      rating: 5,
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true },
      status: 'active',
      verifier: true,
      email: 'secret@example.com',
      telephone: '+2250999999999',
    });

    const res = await fetch(`${baseUrl}/api/search?query=WhitelistKeywordA31`);
    const body = await res.json();
    const json = JSON.stringify(body);
    assert.ok(!json.includes('secret-cni'));
    assert.ok(!json.includes('secret@example.com'));
    assert.ok(!json.includes('+2250999999999'));
    assert.ok(!json.includes('must-not-leak'));
    assert.ok(!json.includes('verificationDocuments'));

    for (const p of body.results.prestataires) {
      assertPublicSearchDtoKeys(p, 'prestataire');
      for (const k of PUBLIC_SEARCH_KEYS.prestataire) assert.ok(k in p || p[k] === null);
    }
    for (const f of body.results.freelances) {
      assertPublicSearchDtoKeys(f, 'freelance');
    }
    for (const v of body.results.vendeurs) {
      assertPublicSearchDtoKeys(v, 'vendeur');
    }
  });

  it('16-18 doublons prestataire exclus ; multi-types conservés', async () => {
    const u = await Utilisateur.create({
      nom: 'DupSearch',
      prenom: 'A31',
      telephone: '+2250700401001',
      password: 'Dash8e3a1Pass!!',
      role: 'Client',
    });
    await prestataireModel.create({
      utilisateur: u._id,
      service: serviceId,
      prixprestataire: 1,
      localisation: 'Abidjan',
      description: 'DupUserKeywordA31',
      status: 'active',
      verifier: true,
    });
    await prestataireModel.create({
      utilisateur: u._id,
      service: serviceId,
      prixprestataire: 2,
      localisation: 'Abidjan',
      description: 'DupUserKeywordA31',
      status: 'active',
      verifier: true,
    });
    await vendeurModel.create({
      utilisateur: u._id,
      shopName: 'DupUserKeywordA31 Shop',
      shopDescription: 'Ok',
      rating: 4,
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true },
      status: 'active',
      verifier: true,
    });

    const res = await fetch(`${baseUrl}/api/search?query=DupUserKeywordA31`);
    const body = await res.json();
    assert.equal(body.results.prestataires.length, 0);
    assert.ok(body.results.vendeurs.length >= 1);
    assert.equal(body.counts.prestataires, body.results.prestataires.length);
    assert.equal(body.pagination.paginated, false);
  });
});
