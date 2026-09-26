/**
 * DASH-8E.3B.2 — Traçabilité Article sur lignes Commande + compatibilité legacy.
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
import vendeurModel from '../models/vendeurModel.js';
import articleModel from '../models/articleModel.js';
import commandeModel from '../models/commandeModel.js';
import commandeRouter from '../routes/commandeRoutes.js';
import {
  formatPublicCommandeResponse,
  normalizePublicOrderLine,
} from '../services/commandeCreationService.js';

const SECRET = 'dash8e3b2-traceability-secret-min-32-chars!!';

let server;
let baseUrl;
let categoryId;

function token(user) {
  return jwt.sign({ _id: String(user._id), id: String(user._id), role: user.role }, SECRET, {
    expiresIn: '1h',
  });
}

async function saveUserWithToken(user) {
  const t = token(user);
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

function orderInfo() {
  return {
    addresse: 'Rue test',
    ville: 'Abidjan',
    telephone: '+2250700111222',
    codePostal: '00225',
    pays: 'CI',
  };
}

async function seedCategory() {
  const gId = new mongoose.Types.ObjectId();
  categoryId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('groupes').insertOne({ _id: gId, nomgroupe: 'E3B2' });
  await mongoose.connection.collection('categories').insertOne({
    _id: categoryId,
    nomcategorie: 'E3B2',
    imagecategorie: 'https://res.cloudinary.com/demo/e3b2.jpg',
    groupe: gId,
  });
}

async function createOperationalVendor() {
  const u = await Utilisateur.create({
    nom: 'V',
    prenom: 'E3B2',
    telephone: `+22507019${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`,
    password: 'Dash8e3b2Pass!!',
    role: 'Client',
  });
  const vendeur = await vendeurModel.create({
    utilisateur: u._id,
    shopName: 'Boutique E3B2',
    shopDescription: 'Desc',
    businessType: 'Particulier',
    businessCategories: ['Mode'],
    status: 'active',
    accountStatus: 'Active',
    verificationDocuments: { isVerified: true },
  });
  return { u, vendeur };
}

async function createArticle(vendeurId, overrides = {}) {
  return articleModel.create({
    nomArticle: 'Produit E3B2',
    prixArticle: 1500,
    quantiteArticle: 50,
    photoArticle: 'https://res.cloudinary.com/demo/p.jpg',
    vendeur: vendeurId,
    categorie: categoryId,
    ...overrides,
  });
}

async function createBuyer() {
  return Utilisateur.create({
    nom: 'C',
    prenom: 'E3B2',
    telephone: `+22507018${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`,
    password: 'Dash8e3b2Pass!!',
    role: 'Client',
  });
}

async function postOrder(client, body) {
  const t = await saveUserWithToken(client);
  return reqJson('POST', '/api/commande', { token: t, body });
}

describe('DASH-8E.3B.2 — traçabilité Commande / Article', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = SECRET;
    await startIsolatedMongo();
    const app = express();
    app.use(express.json());
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
    await seedCategory();
  });

  it('1 nouvelle Commande stocke la référence Article', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.status, 201);
    const doc = await commandeModel.findById(res.json._id);
    assert.equal(String(doc.articles[0].article), String(art._id));
  });

  it('2 snapshot nom/prix/image conservé', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id, {
      nomArticle: 'Chemise',
      prixArticle: 12000,
      photoArticle: 'https://cdn.example/chemise.jpg',
    });
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 2 }],
    });
    const line = (await commandeModel.findById(res.json._id)).articles[0];
    assert.equal(line.nom, 'Chemise');
    assert.equal(line.prix, 12000);
    assert.equal(line.quantite, 2);
    assert.equal(line.image, 'https://cdn.example/chemise.jpg');
  });

  it('3 réponse expose articleId sans peupler tout l’Article', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.json.articles[0].articleId, String(art._id));
    assert.equal(res.json.articles[0].nomArticle, undefined);
    assert.equal(res.json.articles[0].prixArticle, undefined);
  });

  it('4 ancienne Commande sans référence reste lisible', async () => {
    const client = await createBuyer();
    const legacy = await commandeModel.create({
      utilisateur: client._id,
      infoCommande: orderInfo(),
      articles: [{ nom: 'Ancien produit', quantite: 1, prix: 10000, image: null }],
      prixArticles: 10000,
      prixLivraison: 0,
      prixTotal: 10000,
      statusCommande: 'En cours',
    });
    const pub = formatPublicCommandeResponse(legacy);
    assert.equal(pub.articles[0].articleId, null);
    assert.equal(pub.articles[0].nom, 'Ancien produit');
    assert.equal(pub.articles[0].prix, 10000);
  });

  it('5 Article supprimé après Commande → historique lisible', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id, { nomArticle: 'Persistant' });
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    await articleModel.deleteOne({ _id: art._id });
    const cmd = await commandeModel.findById(res.json._id);
    const pub = formatPublicCommandeResponse(cmd);
    assert.equal(pub.articles[0].articleId, String(art._id));
    assert.equal(pub.articles[0].nom, 'Persistant');
  });

  it('6 prix Article modifié après Commande → snapshot inchangé', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id, { prixArticle: 5000 });
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    await articleModel.updateOne({ _id: art._id }, { prixArticle: 1 });
    const cmd = await commandeModel.findById(res.json._id);
    assert.equal(cmd.articles[0].prix, 5000);
  });

  it('7 nom Article modifié après Commande → snapshot inchangé', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id, { nomArticle: 'Nom initial' });
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    await articleModel.updateOne({ _id: art._id }, { nomArticle: 'Autre nom' });
    const cmd = await commandeModel.findById(res.json._id);
    assert.equal(cmd.articles[0].nom, 'Nom initial');
  });

  it('8 date ISO valide acceptée', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
      dateLivraison: '2026-09-30',
    });
    assert.equal(res.status, 201);
    const cmd = await commandeModel.findById(res.json._id);
    assert.ok(cmd.dateLivraison instanceof Date);
    assert.equal(Number.isNaN(cmd.dateLivraison.getTime()), false);
  });

  it('9 date invalide refusée', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
      dateLivraison: 'pas-une-date',
    });
    assert.equal(res.status, 400);
    assert.equal(res.json.code, 'INVALID_ORDER_PAYLOAD');
  });

  it('10 réponse sans KYC ou paiement interne', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    const raw = JSON.stringify(res.json);
    assert.ok(!/cni|selfie|verificationDocuments|paiementInfo/i.test(raw));
    assert.equal(normalizePublicOrderLine(null).articleId, null);
  });
});
