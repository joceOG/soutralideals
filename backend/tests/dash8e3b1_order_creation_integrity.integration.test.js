/**
 * DASH-8E.3B.1 — Intégrité création Commande (Articles → Vendeur, prix serveur).
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
  assertNoImmutableCommandeFieldsInPayload,
  CommandeAuthorizationError,
} from '../services/commandeAuthorizationService.js';

const SECRET = 'dash8e3b1-order-integrity-secret-min-32!!';

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

function orderInfo(overrides = {}) {
  return {
    addresse: 'Rue test',
    ville: 'Abidjan',
    telephone: '+2250700111222',
    codePostal: '00225',
    pays: 'CI',
    ...overrides,
  };
}

async function seedCategory() {
  const gId = new mongoose.Types.ObjectId();
  categoryId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection('groupes').insertOne({ _id: gId, nomgroupe: 'E3B1' });
  await mongoose.connection.collection('categories').insertOne({
    _id: categoryId,
    nomcategorie: 'E3B1',
    imagecategorie: 'https://res.cloudinary.com/demo/e3b1.jpg',
    groupe: gId,
  });
}

async function createOperationalVendor(overrides = {}) {
  const u = await Utilisateur.create({
    nom: 'V',
    prenom: 'E3B1',
    telephone: `+22507009${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`,
    password: 'Dash8e3b1Pass!!',
    role: 'Client',
    ...overrides.user,
  });
  const vendeur = await vendeurModel.create({
    utilisateur: u._id,
    shopName: 'Boutique E3B1',
    shopDescription: 'Desc',
    businessType: 'Particulier',
    businessCategories: ['Mode'],
    status: 'active',
    accountStatus: 'Active',
    verificationDocuments: { isVerified: true },
    ...overrides.vendeur,
  });
  return { u, vendeur };
}

async function createArticle(vendeurId, overrides = {}) {
  return articleModel.create({
    nomArticle: 'Produit E3B1',
    prixArticle: 2500,
    quantiteArticle: 20,
    photoArticle: 'https://res.cloudinary.com/demo/p.jpg',
    vendeur: vendeurId,
    categorie: categoryId,
    ...overrides,
  });
}

async function createBuyer() {
  return Utilisateur.create({
    nom: 'C',
    prenom: 'E3B1',
    telephone: `+22507008${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`,
    password: 'Dash8e3b1Pass!!',
    role: 'Client',
  });
}

async function postOrder(client, body) {
  const t = await saveUserWithToken(client);
  return reqJson('POST', '/api/commande', { token: t, body });
}

describe('DASH-8E.3B.1 — création commande intégrité', () => {
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

  it('1 Client crée une Commande mono-vendeur valide', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 2 }],
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.success, true);
    assert.equal(res.json.prixTotal, 5000);
  });

  it('2 acheteur dérivé du JWT', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    const doc = await commandeModel.findById(res.json._id);
    assert.equal(String(doc.utilisateur), String(client._id));
  });

  it('3 utilisateur falsifié dans le body refusé', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const other = await createBuyer();
    const res = await postOrder(client, {
      utilisateur: String(other._id),
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.status, 400);
    assert.equal(res.json.code, 'ORDER_FIELD_FORBIDDEN');
  });

  it('4 Vendeur dérivé de l’Article', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(String(res.json.vendeur._id), String(vendeur._id));
  });

  it('5 vendeur falsifié refusé', async () => {
    const { vendeur } = await createOperationalVendor();
    const { vendeur: otherV } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      vendeur: String(otherV._id),
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.json.code, 'ORDER_FIELD_FORBIDDEN');
  });

  it('6 prix body falsifié refusé', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      prixArticles: 1,
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.json.code, 'ORDER_FIELD_FORBIDDEN');
  });

  it('7 montant total falsifié refusé', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      prixTotal: 1,
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.json.code, 'ORDER_FIELD_FORBIDDEN');
  });

  it('8 statut initial falsifié refusé', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      statusCommande: 'Livrée',
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.json.code, 'ORDER_FIELD_FORBIDDEN');
  });

  it('9 paiement injecté refusé', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      paiementInfo: { id: 'hack', status: 'PAYE' },
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.json.code, 'ORDER_FIELD_FORBIDDEN');
  });

  it('10 commission injectée refusée', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      commission: 999,
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.json.code, 'ORDER_FIELD_FORBIDDEN');
  });

  it('11 Article inexistant → 404', async () => {
    const client = await createBuyer();
    const fake = new mongoose.Types.ObjectId();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(fake), quantite: 1 }],
    });
    assert.equal(res.status, 404);
    assert.equal(res.json.code, 'ARTICLE_NOT_FOUND');
  });

  it('12 ObjectId Article invalide → 400', async () => {
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: 'not-an-id', quantite: 1 }],
    });
    assert.equal(res.status, 400);
    assert.equal(res.json.code, 'INVALID_ARTICLE_ID');
  });

  it('13 quantité zéro → 400', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 0 }],
    });
    assert.equal(res.json.code, 'INVALID_ORDER_QUANTITY');
  });

  it('14 quantité négative → 400', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: -3 }],
    });
    assert.equal(res.json.code, 'INVALID_ORDER_QUANTITY');
  });

  it('15 quantité NaN/chaîne invalide → 400', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 'deux' }],
    });
    assert.equal(res.json.code, 'INVALID_ORDER_QUANTITY');
  });

  it('16 doublons du même Article correctement agrégés', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id, { prixArticle: 1000, quantiteArticle: 10 });
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [
        { articleId: String(art._id), quantite: 2 },
        { articleId: String(art._id), quantite: 3 },
      ],
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.articles.length, 1);
    assert.equal(res.json.articles[0].quantite, 5);
    assert.equal(res.json.prixArticles, 5000);
  });

  it('17 stock insuffisant → 409', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id, { quantiteArticle: 2 });
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 5 }],
    });
    assert.equal(res.status, 409);
    assert.equal(res.json.code, 'INSUFFICIENT_STOCK');
  });

  it('18 aucun stock modifié sur refus', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id, { quantiteArticle: 1 });
    const before = (await articleModel.findById(art._id)).quantiteArticle;
    const client = await createBuyer();
    await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 10 }],
    });
    const after = (await articleModel.findById(art._id)).quantiteArticle;
    assert.equal(after, before);
  });

  it('19 Articles d’un seul Vendeur → succès', async () => {
    const { vendeur } = await createOperationalVendor();
    const a1 = await createArticle(vendeur._id, { nomArticle: 'A1' });
    const a2 = await createArticle(vendeur._id, { nomArticle: 'A2', prixArticle: 1000 });
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [
        { articleId: String(a1._id), quantite: 1 },
        { articleId: String(a2._id), quantite: 2 },
      ],
    });
    assert.equal(res.status, 201);
  });

  it('20 Articles de deux Vendeurs → 409', async () => {
    const { vendeur: v1 } = await createOperationalVendor();
    const { vendeur: v2 } = await createOperationalVendor();
    const a1 = await createArticle(v1._id);
    const a2 = await createArticle(v2._id);
    const client = await createBuyer();
    const before = await commandeModel.countDocuments();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [
        { articleId: String(a1._id), quantite: 1 },
        { articleId: String(a2._id), quantite: 1 },
      ],
    });
    assert.equal(res.status, 409);
    assert.equal(res.json.code, 'MULTI_VENDOR_ORDER_NOT_SUPPORTED');
    assert.equal(await commandeModel.countDocuments(), before);
  });

  it('21 Vendeur absent → conflit contrôlé', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    await vendeurModel.deleteOne({ _id: vendeur._id });
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.status, 409);
    assert.equal(res.json.code, 'VENDOR_NOT_AVAILABLE');
  });

  it('22 Vendeur non vérifié → indisponible', async () => {
    const { vendeur } = await createOperationalVendor({
      vendeur: { verificationDocuments: { isVerified: false } },
    });
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.json.code, 'VENDOR_NOT_AVAILABLE');
  });

  it('23 Vendeur suspended → indisponible', async () => {
    const { vendeur } = await createOperationalVendor({
      vendeur: { status: 'suspended' },
    });
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.json.code, 'VENDOR_NOT_AVAILABLE');
  });

  it('24 rôle JWT Vendeur sans profil réel n’a aucun effet sur l’achat', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const buyer = await Utilisateur.create({
      nom: 'Legacy',
      prenom: 'V',
      telephone: '+2250700777001',
      password: 'Dash8e3b1Pass!!',
      role: 'Vendeur',
    });
    const res = await postOrder(buyer, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.status, 201);
  });

  it('25 Client sans profil professionnel peut commander', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.status, 201);
  });

  it('26 snapshot utilise le prix Mongo', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id, { prixArticle: 4321 });
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(res.json.articles[0].prix, 4321);
  });

  it('27 changement du prix body n’affecte pas le snapshot', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id, { prixArticle: 3000 });
    const client = await createBuyer();
    const bad = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1, prix: 1 }],
    });
    assert.equal(bad.json.code, 'ORDER_FIELD_FORBIDDEN');
    const ok = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    assert.equal(ok.json.articles[0].prix, 3000);
  });

  it('28 aucun KYC ou secret dans la réponse', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const res = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    const raw = JSON.stringify(res.json);
    assert.ok(!/cni|selfie|taxDocument|verificationDocuments/i.test(raw));
    assert.equal(res.json.paiementInfo, undefined);
  });

  it('29 aucune Commande partielle après erreur', async () => {
    const { vendeur: v1 } = await createOperationalVendor();
    const { vendeur: v2 } = await createOperationalVendor();
    const a1 = await createArticle(v1._id);
    const a2 = await createArticle(v2._id);
    const client = await createBuyer();
    const n0 = await commandeModel.countDocuments();
    await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [
        { articleId: String(a1._id), quantite: 1 },
        { articleId: String(a2._id), quantite: 1 },
      ],
    });
    assert.equal(await commandeModel.countDocuments(), n0);
  });

  it('30 champs immuables toujours protégés après création', async () => {
    const { vendeur } = await createOperationalVendor();
    const art = await createArticle(vendeur._id);
    const client = await createBuyer();
    const created = await postOrder(client, {
      infoCommande: orderInfo(),
      articles: [{ articleId: String(art._id), quantite: 1 }],
    });
    const cmd = await commandeModel.findById(created.json._id);
    await assert.rejects(
      async () => {
        assertNoImmutableCommandeFieldsInPayload({
          vendeur: new mongoose.Types.ObjectId(),
        });
      },
      (e) => e instanceof CommandeAuthorizationError && e.code === 'UPDATE_FIELD_FORBIDDEN',
    );
    assert.equal(String(cmd.vendeur), String(vendeur._id));
  });
});
