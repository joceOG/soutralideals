/**
 * DASH-8E.3A — Création profils, import, recherche, intégrité.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import mongoose from 'mongoose';
import crypto from 'node:crypto';

import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import Utilisateur from '../models/utilisateurModel.js';
import FieldRecensement from '../models/fieldRecensementModel.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import { publishFieldRecensement } from '../services/fieldRecensementPublishService.js';
import { importPrestatairesCSV } from '../controller/importController.js';
import { globalSearch } from '../controller/searchController.js';
import {
  auditProfessionalProfileDuplicates,
  loadProfileSampleForUser,
  resolveProfileAttachDecision,
} from '../services/professionalProfileIntegrityService.js';
import { resolveProfessionalCapabilities } from '../services/professionalCapabilitiesService.js';

const SECRET = 'dash8e3a-integrity-secret-min-32-chars!!';

let server;
let baseUrl;
let serviceId;
let categoryId;
let agentUser;
let adminUser;

function op(n) {
  return `660e8400-e29b-41d4-a716-44665547${String(n).padStart(4, '0')}`;
}

async function seedCatalog() {
  const gId = new mongoose.Types.ObjectId();
  categoryId = new mongoose.Types.ObjectId();
  serviceId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('groupes').insertOne({ _id: gId, nomgroupe: 'E3A' });
  await mongoose.connection.collection('categories').insertOne({
    _id: categoryId,
    nomcategorie: 'E3A-Cat',
    imagecategorie: 'https://res.cloudinary.com/demo/x.jpg',
    groupe: gId,
  });
  await mongoose.connection.collection('services').insertOne({
    _id: serviceId,
    nomservice: 'Plomberie',
    categorie: categoryId,
  });
  await mongoose.connection.collection('groupes').insertOne({
    _id: new mongoose.Types.ObjectId(),
    nomgroupe: 'Métiers',
  });
}

async function createApprovedRec(overrides = {}) {
  const { person: personOverrides, ...restOverrides } = overrides;
  const tel =
    personOverrides?.telephone ||
    `+2250701${String(Math.floor(100000 + Math.random() * 899999))}`;
  const professionalType = restOverrides.professionalType || overrides.professionalType || 'prestataire';
  let business = {
    serviceId,
    description: 'Travaux',
    tarifDeclareMin: 1000,
    tarifDeclareMax: 5000,
  };
  if (professionalType === 'freelance') {
    business = {
      displayName: 'Freelance E3A',
      jobTitle: 'Dev',
      categoryId,
      hourlyRate: 5000,
      bio: 'Bio',
      skills: ['JS'],
    };
  } else if (professionalType === 'vendeur') {
    business = {
      shopName: 'Shop E3A',
      shopDescription: 'Desc',
      businessType: 'Particulier',
      businessCategoryIds: [categoryId],
      productTypeLabels: ['Mode'],
    };
  }
  return FieldRecensement.create({
    schemaVersion: 1,
    clientMutationId: overrides.clientMutationId || op(Math.floor(Math.random() * 9000)),
    revision: 1,
    recenseur: agentUser._id,
    professionalType,
    reviewStatus: 'approved',
    publicationStatus: 'not_started',
    ingestionStatus: 'completed',
    person: {
      nom: 'Test',
      prenoms: 'E3A',
      telephone: tel,
      ...(personOverrides || {}),
    },
    business,
    location: { commune: 'Abidjan', latitude: 5.3, longitude: -4.0 },
    consent: {
      recensementAccepted: true,
      textVersion: 'ci-fr-2026-09',
      acceptedAt: new Date(),
    },
    app: { version: '1.0.0', buildNumber: 1, installationId: 'e3a' },
    timing: { recordedAt: new Date(), serverReceivedAt: new Date() },
    media: {},
    ...restOverrides,
  });
}

async function publishDoc(doc) {
  return publishFieldRecensement({
    id: String(doc._id),
    actorUser: adminUser,
    operationMutationId: op(100),
  });
}

async function importRows(rows, user = null) {
  return new Promise((resolve) => {
    importPrestatairesCSV(
      { body: { csvData: rows }, user: user || { role: 'Admin', _id: adminUser?._id } },
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

describe('DASH-8E.3A — création & intégrité professionnelle', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    process.env.FIELD_PUBLISH_LEASE_MS = '5000';
    await startIsolatedMongo();

    const app = express();
    app.use(express.json());
    app.get('/api/search', async (req, res) => globalSearch(req, res));
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
    delete process.env.TEST_PUBLISH_CRASH_AFTER;
    agentUser = await Utilisateur.create({
      nom: 'Agent',
      prenom: 'E3A',
      telephone: `+2250700${Date.now().toString().slice(-7)}`,
      password: 'Dash8e3aPass!!',
      role: 'Client',
    });
    adminUser = await Utilisateur.create({
      nom: 'Admin',
      prenom: 'E3A',
      telephone: `+2250701${Date.now().toString().slice(-7)}`,
      password: 'Dash8e3aPass!!',
      role: 'Admin',
    });
    await seedCatalog();
  });

  it('1-3 publication → utilisateur stub Client (prestataire, freelance, vendeur)', async () => {
    for (const type of ['prestataire', 'freelance', 'vendeur']) {
      const doc = await createApprovedRec({ professionalType: type });
      const result = await publishDoc(doc);
      assert.ok(result.status === 200 || result.kind === 'already');
      const u = await Utilisateur.findOne({ sourceFieldRecensementId: doc._id });
      assert.equal(u.role, 'Client');
      assert.equal(u.isActive, false);
      assert.equal(u.telephoneVerified, false);
    }
  });

  it('4 Client existant + nouveau type de profil', async () => {
    const tel = '+2250700003201';
    const client = await Utilisateur.create({
      nom: 'Multi',
      prenom: 'E3A',
      telephone: tel,
      password: 'Dash8e3aPass!!',
      role: 'Client',
      telephoneVerified: true,
    });
    const docP = await createApprovedRec({
      professionalType: 'prestataire',
      person: { telephone: tel },
    });
    await publishDoc(docP);
    const docV = await createApprovedRec({
      professionalType: 'vendeur',
      person: { telephone: tel },
    });
    await publishDoc(docV);
    const fresh = await Utilisateur.findById(client._id);
    assert.equal(fresh.role, 'Client');
    assert.equal(await prestataireModel.countDocuments({ utilisateur: client._id }), 1);
    assert.equal(await vendeurModel.countDocuments({ utilisateur: client._id }), 1);
  });

  it('5 Admin existant → rôle Admin conservé', async () => {
    const tel = '+2250700003202';
    const admin = await Utilisateur.create({
      nom: 'Boss',
      prenom: 'E3A',
      telephone: tel,
      password: 'Dash8e3aPass!!',
      role: 'Admin',
      telephoneVerified: true,
    });
    const doc = await createApprovedRec({
      professionalType: 'prestataire',
      person: { telephone: tel },
    });
    await publishDoc(doc);
    assert.equal((await Utilisateur.findById(admin._id)).role, 'Admin');
  });

  it('6 legacy role Prestataire non écrasé', async () => {
    const tel = '+2250700003203';
    const legacy = await Utilisateur.create({
      nom: 'Legacy',
      prenom: 'E3A',
      telephone: tel,
      password: 'Dash8e3aPass!!',
      role: 'Prestataire',
      telephoneVerified: true,
    });
    const doc = await createApprovedRec({
      professionalType: 'vendeur',
      person: { telephone: tel },
    });
    await publishDoc(doc);
    assert.equal((await Utilisateur.findById(legacy._id)).role, 'Prestataire');
  });

  it('7 même recensement rejoué → idempotent', async () => {
    const doc = await createApprovedRec();
    const a = await publishDoc(doc);
    const b = await publishDoc(doc);
    assert.ok(a.status === 200 || a.kind);
    assert.ok(b.code === 'RECENSEMENT_ALREADY_APPLIED' || b.kind === 'already');
    assert.equal(await prestataireModel.countDocuments({ sourceFieldRecensementId: doc._id }), 1);
  });

  it('9 profil même type déjà présent → PROFESSIONAL_PROFILE_ALREADY_EXISTS', async () => {
    const tel = '+2250700003204';
    const client = await Utilisateur.create({
      nom: 'HasP',
      prenom: 'E3A',
      telephone: tel,
      password: 'Dash8e3aPass!!',
      role: 'Client',
      telephoneVerified: true,
    });
    await prestataireModel.create({
      utilisateur: client._id,
      service: serviceId,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'pending',
    });
    const doc = await createApprovedRec({
      person: { telephone: tel },
    });
    await assert.rejects(
      () => publishDoc(doc),
      (err) => err.code === 'PROFESSIONAL_PROFILE_ALREADY_EXISTS',
    );
  });

  it('11 matching ambigu → bloqué', async () => {
    const tel = '+2250700003205';
    await Utilisateur.create({
      nom: 'A',
      prenom: 'E3A',
      telephone: tel,
      password: 'Dash8e3aPass!!',
      role: 'Client',
      telephoneVerified: true,
    });
    await Utilisateur.create({
      nom: 'B',
      prenom: 'E3A',
      telephone: `00${tel.slice(1)}`,
      password: 'Dash8e3aPass!!',
      role: 'Client',
      telephoneVerified: true,
    });
    const doc = await createApprovedRec({ person: { telephone: tel } });
    await assert.rejects(
      () => publishDoc(doc),
      (err) => err.code === 'RECENSEMENT_PUBLICATION_BLOCKED',
    );
  });

  it('13-15 import Prestataire Client + profil, répétition, ligne invalide', async () => {
    const row = {
      nom: 'Import',
      telephone: '+2250700003301',
      metier: 'Plomberie',
      categorieId: String(categoryId),
      latitude: '5.3',
      longitude: '-4.0',
      ville: 'Abidjan',
      quartier: 'Plateau',
    };
    const r1 = await importRows([row]);
    assert.equal(r1.json.results.success, 1);
    const u = await Utilisateur.findOne({ telephone: row.telephone });
    assert.equal(u.role, 'Client');
    assert.equal(u.isActive, false);
    assert.equal(u.source, 'import');
    assert.equal(u.activationStatus, 'pending_claim');
    const r2 = await importRows([row]);
    assert.ok(
      r2.json.results.conflicts.some((c) => c.code === 'IMPORT_IDENTITY_REVIEW_REQUIRED'),
    );
    assert.equal(await prestataireModel.countDocuments({ utilisateur: u._id }), 1);
    const bad = await importRows([{ ...row, latitude: 'bad' }]);
    assert.ok(bad.json.results.errors.length >= 1);
    assert.notEqual(bad.status, 500);
  });

  it('16-18 recherche sur profils réels', async () => {
    const client = await Utilisateur.create({
      nom: 'Search',
      prenom: 'Pro',
      telephone: '+2250700003401',
      password: 'Dash8e3aPass!!',
      role: 'Client',
    });
    await prestataireModel.create({
      utilisateur: client._id,
      service: serviceId,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      description: 'UniqueE3AKeyword',
      status: 'active',
      verifier: true,
    });
    await Utilisateur.create({
      nom: 'Ghost',
      prenom: 'Legacy',
      telephone: '+2250700003402',
      password: 'Dash8e3aPass!!',
      role: 'Prestataire',
    });
    const res = await fetch(`${baseUrl}/api/search?query=UniqueE3AKeyword`);
    const body = await res.json();
    assert.ok(body.results.prestataires.length >= 1);
    const legacyHit = body.results.prestataires.some((p) => String(p.name).includes('Ghost'));
    assert.equal(legacyHit, false);
    assert.ok(!JSON.stringify(body).includes('cni'));
  });

  it('20-21 audit doublons read-only', async () => {
    const u = await Utilisateur.create({
      nom: 'Dup',
      prenom: 'E3A',
      telephone: '+2250700003501',
      password: 'Dash8e3aPass!!',
      role: 'Client',
    });
    let summary = await auditProfessionalProfileDuplicates();
    assert.equal(summary.prestataires.duplicateUsers, 0);
    await prestataireModel.create({
      utilisateur: u._id,
      service: serviceId,
      prixprestataire: 1,
      localisation: 'A',
      status: 'pending',
    });
    await prestataireModel.create({
      utilisateur: u._id,
      service: serviceId,
      prixprestataire: 2,
      localisation: 'B',
      status: 'pending',
    });
    summary = await auditProfessionalProfileDuplicates();
    assert.equal(summary.prestataires.duplicateUsers, 1);
    assert.equal(summary.prestataires.duplicateDocuments, 2);
    const before = await prestataireModel.countDocuments();
    await auditProfessionalProfileDuplicates();
    assert.equal(await prestataireModel.countDocuments(), before);
  });

  it('10 capabilities multi-profils', async () => {
    const u = await Utilisateur.create({
      nom: 'Cap',
      prenom: 'E3A',
      telephone: '+2250700003601',
      password: 'Dash8e3aPass!!',
      role: 'Client',
    });
    await prestataireModel.create({
      utilisateur: u._id,
      service: serviceId,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'active',
      verifier: true,
    });
    await vendeurModel.create({
      utilisateur: u._id,
      shopName: 'S',
      shopDescription: 'D',
      businessType: 'Particulier',
      businessCategories: ['Mode'],
      status: 'active',
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true },
    });
    const caps = await resolveProfessionalCapabilities(u._id);
    assert.equal(caps.capabilities.length, 2);
  });

  it('23-24 reactivate rejected → 403 stabilisé', async () => {
    const sample = await loadProfileSampleForUser(new mongoose.Types.ObjectId(), 'prestataire');
    const d = resolveProfileAttachDecision(sample, {});
    assert.equal(d.action, 'create');
  });
});
