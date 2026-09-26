/**
 * DASH-8E.3B — Autorisations Prestations, Commandes, Freelance.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import Utilisateur from '../models/utilisateurModel.js';
import prestataireModel from '../models/prestataireModel.js';
import vendeurModel from '../models/vendeurModel.js';
import freelanceModel from '../models/freelanceModel.js';
import prestationModel from '../models/prestationModel.js';
import commandeModel from '../models/commandeModel.js';
import articleModel from '../models/articleModel.js';
import prestationRouter from '../routes/prestationRoutes.js';
import commandeRouter from '../routes/commandeRoutes.js';
import { importPrestatairesCSV } from '../controller/importController.js';
import {
  authorizePrestationOperation,
  PrestationAuthorizationError,
} from '../services/prestationAuthorizationService.js';
import {
  authorizeCommandeOperation,
} from '../services/commandeAuthorizationService.js';
import {
  authorizeFreelanceProfileUpdate,
  authorizeFreelanceServiceExercise,
} from '../services/freelanceAuthorizationService.js';
import { resolveProfessionalCapabilities } from '../services/professionalCapabilitiesService.js';

const SECRET = 'dash8e3b-ops-authz-secret-min-32!!';

let server;
let baseUrl;
let serviceId;
let categoryId;
let adminUser;

function token(user, role) {
  return jwt.sign({ _id: String(user._id), id: String(user._id), role }, SECRET, {
    expiresIn: '1h',
  });
}

async function saveUserWithToken(user) {
  const t = token(user, user.role);
  user.tokens = [{ token: t }];
  await user.save();
  return t;
}

async function reqJson(method, path, { token: t, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function orderInfo(overrides = {}) {
  return {
    addresse: 'A',
    ville: 'Abidjan',
    telephone: '+2250700000000',
    codePostal: '01',
    pays: 'CI',
    ...overrides,
  };
}

async function createSellableArticle(vendeurId, overrides = {}) {
  return articleModel.create({
    nomArticle: 'Art E3B',
    prixArticle: 1000,
    quantiteArticle: 10,
    photoArticle: 'https://res.cloudinary.com/demo/e3b.jpg',
    vendeur: vendeurId,
    categorie: categoryId,
    ...overrides,
  });
}

function prestationBase(overrides = {}) {
  return {
    datePrestation: new Date(),
    heureDebut: '09:00',
    tarifHoraire: 0,
    montantTotal: 0,
    moyenPaiement: 'GRATUIT',
    description: 'Test',
    statutPaiement: 'GRATUIT',
    ...overrides,
  };
}

async function seedCatalog() {
  const gId = new mongoose.Types.ObjectId();
  categoryId = new mongoose.Types.ObjectId();
  serviceId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('groupes').insertOne({ _id: gId, nomgroupe: 'E3B' });
  await mongoose.connection.collection('categories').insertOne({
    _id: categoryId,
    nomcategorie: 'E3B',
    imagecategorie: 'https://res.cloudinary.com/demo/e3b.jpg',
    groupe: gId,
  });
  await mongoose.connection.collection('services').insertOne({
    _id: serviceId,
    nomservice: 'Plomberie',
    categorie: categoryId,
  });
}

describe('DASH-8E.3B — opérations professionnelles', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    await startIsolatedMongo();
    const app = express();
    app.use(express.json());
    app.use('/api', prestationRouter);
    app.use('/api', commandeRouter);
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
      prenom: 'E3B',
      telephone: '+2250700500001',
      password: 'Dash8e3bPass!!',
      role: 'Admin',
      telephoneVerified: true,
    });
  });

  it('1 Client crée prestation sans capability pro', async () => {
    const client = await Utilisateur.create({
      nom: 'Client',
      prenom: 'E3B',
      telephone: '+2250700500101',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const pUser = await Utilisateur.create({
      nom: 'P',
      prenom: 'E3B',
      telephone: '+2250700500102',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const prest = await prestataireModel.create({
      utilisateur: pUser._id,
      service: serviceId,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'active',
      verifier: true,
    });
    const t = await saveUserWithToken(client);
    const r = await reqJson('POST', '/api/prestation', {
      token: t,
      body: {
        utilisateur: String(client._id),
        prestataire: String(prest._id),
        service: String(serviceId),
        adresse: 'Rue 1',
        ville: 'Abidjan',
        description: 'Demande',
      },
    });
    assert.equal(r.status, 201);
    const caps = await resolveProfessionalCapabilities(client._id);
    assert.equal(caps.capabilities.length, 0);
  });

  it('2-3 prestataire affecté vs autre prestataire', async () => {
    const client = await Utilisateur.create({
      nom: 'C',
      prenom: 'E3B',
      telephone: '+2250700500201',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const pUser = await Utilisateur.create({
      nom: 'P1',
      prenom: 'E3B',
      telephone: '+2250700500202',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const otherP = await Utilisateur.create({
      nom: 'P2',
      prenom: 'E3B',
      telephone: '+2250700500203',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const prest = await prestataireModel.create({
      utilisateur: pUser._id,
      service: serviceId,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'active',
      verifier: true,
    });
    await prestataireModel.create({
      utilisateur: otherP._id,
      service: serviceId,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'active',
      verifier: true,
    });
    const mission = await prestationModel.create(
      prestationBase({
        utilisateur: client._id,
        prestataire: prest._id,
        service: serviceId,
        adresse: 'A',
        ville: 'Abidjan',
        statut: 'EN_ATTENTE',
      }),
    );
    await authorizePrestationOperation({
      utilisateur: pUser,
      prestation: mission,
      operation: 'changeStatus',
      payload: { statut: 'ACCEPTEE' },
    });
    await assert.rejects(
      () =>
        authorizePrestationOperation({
          utilisateur: otherP,
          prestation: mission,
          operation: 'changeStatus',
          payload: { statut: 'ACCEPTEE' },
        }),
      (e) => e instanceof PrestationAuthorizationError && e.code === 'RESOURCE_ACCESS_FORBIDDEN',
    );
  });

  it('7-8 pending / pause prestataire refus nouvelle activité', async () => {
    const client = await Utilisateur.create({
      nom: 'C',
      prenom: 'E3B',
      telephone: '+2250700500301',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const pUser = await Utilisateur.create({
      nom: 'P',
      prenom: 'E3B',
      telephone: '+2250700500302',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const prest = await prestataireModel.create({
      utilisateur: pUser._id,
      service: serviceId,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'pending',
      verifier: false,
      ownerSelfPaused: false,
    });
    const mission = await prestationModel.create(
      prestationBase({
        utilisateur: client._id,
        prestataire: prest._id,
        service: serviceId,
        adresse: 'A',
        ville: 'Abidjan',
        statut: 'EN_ATTENTE',
      }),
    );
    await assert.rejects(
      () =>
        authorizePrestationOperation({
          utilisateur: pUser,
          prestation: mission,
          operation: 'changeStatus',
          payload: { statut: 'ACCEPTEE' },
        }),
      (e) => e.code === 'PROFESSIONAL_PROFILE_NOT_OPERATIONAL',
    );
    prest.status = 'active';
    prest.verifier = true;
    prest.ownerSelfPaused = true;
    await prest.save();
    await assert.rejects(
      () =>
        authorizePrestationOperation({
          utilisateur: pUser,
          prestation: mission,
          operation: 'changeStatus',
          payload: { statut: 'ACCEPTEE' },
        }),
      (e) => e.code === 'PROFESSIONAL_PROFILE_NOT_OPERATIONAL',
    );
  });

  it('10 transition invalide prestation → 409', async () => {
    const client = await Utilisateur.create({
      nom: 'C',
      prenom: 'E3B',
      telephone: '+2250700500401',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const pUser = await Utilisateur.create({
      nom: 'P',
      prenom: 'E3B',
      telephone: '+2250700500402',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const prest = await prestataireModel.create({
      utilisateur: pUser._id,
      service: serviceId,
      prixprestataire: 1000,
      localisation: 'Abidjan',
      status: 'active',
      verifier: true,
    });
    const mission = await prestationModel.create(
      prestationBase({
        utilisateur: client._id,
        adresse: 'A',
        ville: 'Abidjan',
        statut: 'EN_ATTENTE',
        prestataire: prest._id,
        service: serviceId,
      }),
    );
    await assert.rejects(
      () =>
        authorizePrestationOperation({
          utilisateur: client,
          prestation: mission,
          operation: 'changeStatus',
          payload: { statut: 'TERMINEE' },
        }),
      (e) => e.code === 'INVALID_PRESTATION_STATUS_TRANSITION',
    );
  });

  it('13-15 commande client / vendeur owner', async () => {
    const client = await Utilisateur.create({
      nom: 'C',
      prenom: 'E3B',
      telephone: '+2250700500501',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const vUser = await Utilisateur.create({
      nom: 'V',
      prenom: 'E3B',
      telephone: '+2250700500502',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const vendeur = await vendeurModel.create({
      utilisateur: vUser._id,
      shopName: 'Shop',
      shopDescription: 'D',
      rating: 5,
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true },
      status: 'active',
      verifier: true,
    });
    const art = await createSellableArticle(vendeur._id);
    const tClient = await saveUserWithToken(client);
    const rCreate = await reqJson('POST', '/api/commande', {
      token: tClient,
      body: {
        infoCommande: orderInfo(),
        articles: [{ articleId: String(art._id), quantite: 1 }],
      },
    });
    assert.equal(rCreate.status, 201);
    const cmd = await commandeModel.findById(rCreate.json._id);
    assert.equal(String(cmd.vendeur), String(vendeur._id));
    await authorizeCommandeOperation({
      utilisateur: vUser,
      commande: cmd,
      operation: 'changeStatus',
      payload: { statusCommande: 'Confirmée' },
    });
    const otherV = await Utilisateur.create({
      nom: 'V2',
      prenom: 'E3B',
      telephone: '+2250700500503',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    await vendeurModel.create({
      utilisateur: otherV._id,
      shopName: 'Shop2',
      shopDescription: 'D',
      rating: 5,
      accountStatus: 'Active',
      verificationDocuments: { isVerified: true },
      status: 'active',
      verifier: true,
    });
    await assert.rejects(
      () =>
        authorizeCommandeOperation({
          utilisateur: otherV,
          commande: cmd,
          operation: 'changeStatus',
          payload: { statusCommande: 'Confirmée' },
        }),
      (e) => e.code === 'RESOURCE_ACCESS_FORBIDDEN',
    );
  });

  it('22 body vendeur immuable refusé', async () => {
    const client = await Utilisateur.create({
      nom: 'C',
      prenom: 'E3B',
      telephone: '+2250700500601',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const cmd = await commandeModel.create({
      utilisateur: client._id,
      infoCommande: {
        addresse: 'A',
        ville: 'Abidjan',
        telephone: '1',
        codePostal: '1',
        pays: 'CI',
      },
      articles: [{ nom: 'X', quantite: 1, prix: 1 }],
      prixArticles: 1,
      prixLivraison: 0,
      prixTotal: 1,
      statusCommande: 'En cours',
    });
    await assert.rejects(
      () =>
        authorizeCommandeOperation({
          utilisateur: client,
          commande: cmd,
          operation: 'updateFields',
          payload: { vendeur: new mongoose.Types.ObjectId() },
        }),
      (e) => e.code === 'UPDATE_FIELD_FORBIDDEN',
    );
  });

  it('24-25 freelance pending profil vs exercice', async () => {
    const u = await Utilisateur.create({
      nom: 'F',
      prenom: 'E3B',
      telephone: '+2250700500701',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const f = await freelanceModel.create({
      utilisateur: u._id,
      name: 'Freelance',
      job: 'Dev',
      category: 'IT',
      hourlyRate: 5000,
      location: 'Abidjan',
      status: 'pending',
      accountStatus: 'Pending',
      verificationDocuments: { isVerified: false },
    });
    await authorizeFreelanceProfileUpdate({
      utilisateur: u,
      freelance: f,
      payload: { description: 'Correction' },
      isAdmin: false,
    });
    await assert.rejects(
      () =>
        authorizeFreelanceServiceExercise({
          utilisateur: u,
          freelance: f,
          operation: 'create',
          isAdmin: false,
        }),
      (e) => e.code === 'PROFESSIONAL_PROFILE_NOT_OPERATIONAL',
    );
  });

  it('8E.3A.1 import utilisateurId Admin via req.utilisateur', async () => {
    const target = await Utilisateur.create({
      nom: 'Target',
      prenom: 'E3B',
      telephone: '+2250700500801',
      password: 'Dash8e3bPass!!',
      role: 'Client',
      telephoneVerified: true,
      isActive: true,
    });
    const client = await Utilisateur.create({
      nom: 'Bad',
      prenom: 'E3B',
      telephone: '+2250700500802',
      password: 'Dash8e3bPass!!',
      role: 'Client',
    });
    const row = {
      nom: 'Imp',
      telephone: '+2250700500803',
      metier: 'Plomberie',
      categorieId: String(categoryId),
      latitude: '5.3',
      longitude: '-4.0',
      ville: 'Abidjan',
      quartier: 'Plateau',
      utilisateurId: String(target._id),
    };
    const adminRes = await new Promise((resolve) => {
      importPrestatairesCSV(
        { body: { csvData: [row] }, utilisateur: adminUser },
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
    assert.equal(adminRes.json.results.success, 1);
    assert.equal(await prestataireModel.countDocuments({ utilisateur: target._id }), 1);
    const clientRes = await new Promise((resolve) => {
      importPrestatairesCSV(
        {
          body: { csvData: [{ ...row, telephone: '+2250700500804', utilisateurId: String(target._id) }] },
          utilisateur: client,
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
    assert.equal(clientRes.json.results.success, 1);
    assert.equal(await prestataireModel.countDocuments({ utilisateur: target._id }), 1);
  });

  it('36 services autorisation sans écriture', async () => {
    const before = await prestationModel.countDocuments();
    await assert.rejects(
      () =>
        authorizePrestationOperation({
          utilisateur: { _id: new mongoose.Types.ObjectId(), role: 'Client' },
          prestation: {
            utilisateur: new mongoose.Types.ObjectId(),
            statut: 'EN_ATTENTE',
          },
          operation: 'changeStatus',
          payload: { statut: 'ANNULEE' },
        }),
      PrestationAuthorizationError,
    );
    assert.equal(await prestationModel.countDocuments(), before);
  });
});
