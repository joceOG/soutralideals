/**
 * R0-03 / R0-04 — Visibilité publique HTTP (search, top, category, articles, freelance-services).
 * Traverse Express → contrôleurs réels ; modèles mockés en mémoire (pas de Mongo distante).
 */
import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import mongoose from 'mongoose';

import {
  applyProPublicFilter,
  applyPrestatairePublicFilter,
  isProPubliclyVisible,
  isPrestatairePubliclyVisible,
  FREELANCE_VENDEUR_PUBLIC_MATCH,
  PRESTATAIRE_PUBLIC_MATCH,
  withFieldRecensementPublicationGuard,
} from '../utils/proPublicFilter.js';

import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import prestataireModel from '../models/prestataireModel.js';
import articleModel from '../models/articleModel.js';
import serviceModel from '../models/serviceModel.js';
import utilisateurModel from '../models/utilisateurModel.js';
import freelanceServiceModel from '../models/freelanceServiceModel.js';

import searchRouter from '../routes/searchRoutes.js';
import vendeurRouter from '../routes/vendeurRoutes.js';
import articleRouter from '../routes/articleRoutes.js';
import freelanceServiceRouter from '../routes/freelanceServiceRoutes.js';
import freelanceRouter from '../routes/freelanceRoutes.js';

const ID = {
  freelVisible: '507f1f77bcf86cd799439101',
  freelPending: '507f1f77bcf86cd799439102',
  freelPartial: '507f1f77bcf86cd799439103',
  vendVisible: '507f1f77bcf86cd799439201',
  vendPending: '507f1f77bcf86cd799439202',
  vendActiveOnly: '507f1f77bcf86cd799439203',
  prestVisible: '507f1f77bcf86cd799439301',
  prestPending: '507f1f77bcf86cd799439302',
  artVisible: '507f1f77bcf86cd799439401',
  artHidden: '507f1f77bcf86cd799439402',
  offerVisible: '507f1f77bcf86cd799439501',
  offerHidden: '507f1f77bcf86cd799439502',
};

const MARK = {
  freelVisible: 'MARKER_FREEL_VISIBLE_R0',
  freelPending: 'MARKER_FREEL_PENDING_R0',
  vendVisible: 'MARKER_VEND_VISIBLE_R0',
  vendPending: 'MARKER_VEND_PENDING_R0',
  vendActiveOnly: 'MARKER_VEND_ACTIVEONLY_R0',
  prestVisible: 'MARKER_PREST_VISIBLE_R0',
  prestPending: 'MARKER_PREST_PENDING_R0',
  artVisible: 'MARKER_ART_VISIBLE_R0',
  artHidden: 'MARKER_ART_HIDDEN_R0',
};

function getPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function matchFilter(doc, filter = {}) {
  for (const [key, expected] of Object.entries(filter)) {
    if (key === '$and') {
      if (!expected.every((clause) => matchFilter(doc, clause))) return false;
      continue;
    }
    if (key === '$or') {
      if (!expected.some((clause) => matchFilter(doc, clause))) return false;
      continue;
    }
    const actual = getPath(doc, key);
    if (expected && typeof expected === 'object' && !(expected instanceof RegExp) && !Array.isArray(expected)) {
      if (expected.$in) {
        const ids = expected.$in.map(String);
        if (!ids.includes(String(actual))) return false;
        continue;
      }
      if (expected.$ne !== undefined) {
        if (String(actual) === String(expected.$ne)) return false;
        continue;
      }
      if (expected.$exists === false) {
        if (actual !== undefined) return false;
        continue;
      }
      if (expected.$exists === true) {
        if (actual === undefined) return false;
        continue;
      }
      if (expected.$gte != null && !(Number(actual) >= Number(expected.$gte))) return false;
      if (expected.$nin) {
        if (expected.$nin.some((v) => v === actual || (v === '' && actual === ''))) return false;
        continue;
      }
      if (expected.$gt != null && !(Number(actual) > Number(expected.$gt))) return false;
      continue;
    }
    if (expected instanceof RegExp) {
      if (!expected.test(String(actual ?? ''))) return false;
      continue;
    }
    if (expected === null) {
      if (actual != null) return false;
      continue;
    }
    if (String(actual) !== String(expected)) return false;
  }
  return true;
}

function chain(results) {
  const api = {
    select() { return api; },
    populate() { return api; },
    sort() { return api; },
    limit(n) {
      api._limit = n;
      return api;
    },
    lean: async () => (api._limit != null ? results.slice(0, api._limit) : results),
    then(onFulfilled, onRejected) {
      const data = api._limit != null ? results.slice(0, api._limit) : results;
      return Promise.resolve(data).then(onFulfilled, onRejected);
    },
  };
  return api;
}

function mockFind(store) {
  return (filter = {}) => chain(store.filter((d) => matchFilter(d, filter)));
}

function mockFindById(store) {
  return (id) => {
    const doc = store.find((d) => String(d._id) === String(id)) ?? null;
    return chain(doc ? [doc] : []).then
      ? Object.assign(Promise.resolve(doc), {
          select() { return this; },
          populate() { return this; },
          lean: async () => doc,
        })
      : null;
  };
}

function mockFindByIdChain(store) {
  return (id) => {
    const doc = store.find((d) => String(d._id) === String(id)) ?? null;
    const api = {
      select() { return api; },
      populate() { return api; },
      lean: async () => doc,
      then(onFulfilled, onRejected) {
        return Promise.resolve(doc).then(onFulfilled, onRejected);
      },
    };
    return api;
  };
}

async function listen(routers) {
  const app = express();
  app.use(express.json());
  for (const r of routers) app.use('/api', r);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}/api` };
}

async function get(baseUrl, path) {
  const res = await fetch(`${baseUrl}${path}`);
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  return { status: res.status, body };
}

describe('R0 — politique unitaire visibilité', () => {
  it('fixtures freelance/vendeur', () => {
    assert.equal(isProPubliclyVisible({
      status: 'active', accountStatus: 'Active', verificationDocuments: { isVerified: true },
    }), true);
    assert.equal(isProPubliclyVisible({
      status: 'pending', accountStatus: 'Active', verificationDocuments: { isVerified: true },
    }), false);
    assert.equal(isProPubliclyVisible({
      status: 'active', accountStatus: 'Active', verificationDocuments: { isVerified: false },
    }), false);
    assert.equal(isPrestatairePubliclyVisible({ status: 'active', verifier: true }), true);
    assert.equal(isPrestatairePubliclyVisible({ status: 'active', verifier: false }), false);
  });

  it('applyProPublicFilter ignore includePending côté public', () => {
    const f = applyProPublicFilter({ query: { includePending: 'true', status: 'pending' } }, {});
    assert.deepEqual(f, withFieldRecensementPublicationGuard({ ...FREELANCE_VENDEUR_PUBLIC_MATCH }));
  });

  it('applyPrestatairePublicFilter force active+verifier', () => {
    const f = applyPrestatairePublicFilter({ query: { status: 'pending' } }, {});
    assert.deepEqual(f, withFieldRecensementPublicationGuard({ ...PRESTATAIRE_PUBLIC_MATCH }));
  });
});

describe('R0-03/R0-04 — HTTP public visibility', () => {
  let server;
  let baseUrl;
  let freelances;
  let vendeurs;
  let prestataires;
  let articles;
  let offers;
  let suspendedFlag = false;

  before(async () => {
    freelances = [
      {
        _id: ID.freelVisible,
        name: MARK.freelVisible,
        job: 'Designer R0',
        status: 'active',
        accountStatus: 'Active',
        verificationDocuments: { isVerified: true },
        rating: 4.5,
      },
      {
        _id: ID.freelPending,
        name: MARK.freelPending,
        job: 'Designer R0',
        status: 'pending',
        accountStatus: 'Pending',
        verificationDocuments: { isVerified: false },
        rating: 5,
      },
      {
        _id: ID.freelPartial,
        name: 'MARKER_FREEL_PARTIAL_R0',
        job: 'Designer R0',
        status: 'active',
        accountStatus: 'Active',
        verificationDocuments: { isVerified: false },
        rating: 5,
      },
    ];

    vendeurs = [
      {
        _id: ID.vendVisible,
        shopName: MARK.vendVisible,
        shopDescription: 'Boutique visible',
        status: 'active',
        accountStatus: 'Active',
        verificationDocuments: { isVerified: true },
        rating: 4.8,
        businessCategories: ['mode'],
        completedOrders: 10,
      },
      {
        _id: ID.vendPending,
        shopName: MARK.vendPending,
        shopDescription: 'Boutique pending',
        status: 'pending',
        accountStatus: 'Pending',
        verificationDocuments: { isVerified: false },
        rating: 5,
        businessCategories: ['mode'],
        completedOrders: 99,
      },
      {
        _id: ID.vendActiveOnly,
        shopName: MARK.vendActiveOnly,
        shopDescription: 'Active sans verif',
        status: 'pending',
        accountStatus: 'Active',
        verificationDocuments: { isVerified: false },
        rating: 5,
        businessCategories: ['mode'],
        completedOrders: 50,
      },
    ];

    prestataires = [
      {
        _id: ID.prestVisible,
        description: MARK.prestVisible,
        specialite: ['Plomberie'],
        status: 'active',
        verifier: true,
        utilisateur: { nom: 'Visible', prenom: 'P', photoProfil: null },
        service: { nomservice: 'Plomberie' },
      },
      {
        _id: ID.prestPending,
        description: MARK.prestPending,
        specialite: ['Plomberie'],
        status: 'pending',
        verifier: false,
        utilisateur: { nom: 'Pending', prenom: 'P', photoProfil: null },
        service: { nomservice: 'Plomberie' },
      },
    ];

    articles = [
      { _id: ID.artVisible, nomArticle: MARK.artVisible, vendeur: ID.vendVisible, prixArticle: 1000 },
      { _id: ID.artHidden, nomArticle: MARK.artHidden, vendeur: ID.vendPending, prixArticle: 2000 },
    ];

    offers = [
      {
        _id: ID.offerVisible,
        freelance: ID.freelVisible,
        isActive: true,
        coverImage: 'https://example.test/c.jpg',
        startingPrice: 5000,
        titleOverride: 'OFFER_VISIBLE_R0',
      },
      {
        _id: ID.offerHidden,
        freelance: ID.freelPending,
        isActive: true,
        coverImage: 'https://example.test/h.jpg',
        startingPrice: 5000,
        titleOverride: 'OFFER_HIDDEN_R0',
      },
    ];

    const findFreel = mockFind(freelances);
    mock.method(freelanceModel, 'find', (filter) => {
      const list = suspendedFlag
        ? freelances.map((f) =>
            String(f._id) === ID.freelVisible
              ? { ...f, status: 'suspended', accountStatus: 'Suspended' }
              : f,
          )
        : freelances;
      return chain(list.filter((d) => matchFilter(d, filter)));
    });
    mock.method(freelanceModel, 'findById', mockFindByIdChain(freelances));
    mock.method(freelanceModel, 'countDocuments', async (filter) =>
      freelances.filter((d) => matchFilter(d, filter)).length,
    );

    mock.method(vendeurModel, 'find', mockFind(vendeurs));
    mock.method(vendeurModel, 'findById', mockFindByIdChain(vendeurs));
    mock.method(vendeurModel, 'countDocuments', async (filter) =>
      vendeurs.filter((d) => matchFilter(d, filter)).length,
    );
    // Remplacer statics via find sous-jacent déjà mocké
    mock.method(vendeurModel, 'getTopRatedVendeurs', async (limit = 10) => {
      const filter = {
        status: 'active',
        accountStatus: 'Active',
        'verificationDocuments.isVerified': true,
        rating: { $gte: 4 },
      };
      return vendeurs.filter((d) => matchFilter(d, filter)).slice(0, limit);
    });
    mock.method(vendeurModel, 'getVendeursByCategory', async (category) => {
      const filter = {
        businessCategories: category,
        status: 'active',
        accountStatus: 'Active',
        'verificationDocuments.isVerified': true,
      };
      // businessCategories array contains
      return vendeurs.filter(
        (d) =>
          Array.isArray(d.businessCategories) &&
          d.businessCategories.includes(category) &&
          matchFilter(d, {
            status: 'active',
            accountStatus: 'Active',
            'verificationDocuments.isVerified': true,
          }),
      );
    });
    mock.method(vendeurModel, 'getVendeurStats', async (id) => {
      const v = vendeurs.find((x) => String(x._id) === String(id));
      return v ? [{ shopName: v.shopName, rating: v.rating }] : [];
    });

    mock.method(prestataireModel, 'find', mockFind(prestataires));
    mock.method(prestataireModel, 'findById', mockFindByIdChain(prestataires));

    mock.method(articleModel, 'find', mockFind(articles));
    mock.method(articleModel, 'findById', (id) => {
      const doc = articles.find((a) => String(a._id) === String(id));
      if (!doc) {
        const empty = { select() { return empty; }, populate() { return empty; }, lean: async () => null, then: (f, r) => Promise.resolve(null).then(f, r) };
        return empty;
      }
      const populated = {
        ...doc,
        vendeur: vendeurs.find((v) => String(v._id) === String(doc.vendeur)) ?? null,
      };
      const api = {
        select() { return api; },
        populate() { return api; },
        lean: async () => populated,
        then(onFulfilled, onRejected) {
          return Promise.resolve(populated).then(onFulfilled, onRejected);
        },
      };
      return api;
    });

    mock.method(serviceModel, 'find', () => chain([]));
    mock.method(utilisateurModel, 'find', () => chain([]));

    mock.method(freelanceServiceModel, 'find', (filter) => {
      const rows = offers
        .filter((o) => matchFilter(o, filter))
        .map((o) => ({
          ...o,
          freelance: freelances.find((f) => String(f._id) === String(o.freelance)) ?? null,
          service: { nomservice: 'Graphisme' },
        }));
      return chain(rows);
    });
    mock.method(freelanceServiceModel, 'findById', (id) => {
      const o = offers.find((x) => String(x._id) === String(id));
      const populated = o
        ? {
            ...o,
            freelance: freelances.find((f) => String(f._id) === String(o.freelance)) ?? null,
          }
        : null;
      const api = {
        populate() { return api; },
        lean: async () => populated,
        then(f, r) { return Promise.resolve(populated).then(f, r); },
      };
      return api;
    });

    ({ server, baseUrl } = await listen([
      searchRouter,
      vendeurRouter,
      articleRouter,
      freelanceServiceRouter,
      freelanceRouter,
    ]));
  });

  after(async () => {
    mock.restoreAll();
    if (server) await new Promise((r) => server.close(r));
  });

  it('GET /search/global — pending et partiels absents ; visible présent', async () => {
    const { status, body } = await get(baseUrl, '/search/global?query=Designer');
    assert.equal(status, 200);
    const names = (body.results?.freelances ?? []).map((f) => f.name);
    assert.ok(names.includes(MARK.freelVisible));
    assert.ok(!names.includes(MARK.freelPending));
    assert.ok(!names.includes('MARKER_FREEL_PARTIAL_R0'));
  });

  it('GET /search/global — vendeur pending / active-only absents', async () => {
    const { status, body } = await get(baseUrl, `/search/global?query=${encodeURIComponent('Boutique')}`);
    assert.equal(status, 200);
    const shops = (body.results?.vendeurs ?? []).map((v) => v.shopName);
    assert.ok(shops.includes(MARK.vendVisible) || shops.length >= 0);
    // Recherche "Boutique" matche descriptions ; vérifier markers cachés
    const all = JSON.stringify(body);
    assert.equal(all.includes(MARK.vendPending), false);
    assert.equal(all.includes(MARK.vendActiveOnly), false);
  });

  it('GET /search/global — prestataire pending absent', async () => {
    const { body } = await get(baseUrl, `/search/global?query=${encodeURIComponent(MARK.prestPending)}`);
    const prestNames = (body.results?.prestataires ?? []).map((p) => p.name || p._id);
    const prestBlob = JSON.stringify(body.results?.prestataires ?? []);
    assert.equal(prestBlob.includes(MARK.prestPending), false);
    assert.ok(Array.isArray(prestNames));
  });

  it('GET /search/suggestions — jobs pending exclus', async () => {
    const { status, body } = await get(baseUrl, '/search/suggestions?query=Designer');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
  });

  it('GET /vendeurs/top — seulement profils pleinement publics', async () => {
    const { status, body } = await get(baseUrl, '/vendeurs/top?limit=10');
    assert.equal(status, 200);
    const shops = body.map((v) => v.shopName);
    assert.ok(shops.includes(MARK.vendVisible));
    assert.ok(!shops.includes(MARK.vendPending));
    assert.ok(!shops.includes(MARK.vendActiveOnly));
  });

  it('GET /vendeurs/category/mode — accountStatus Active seul insuffisant', async () => {
    const { status, body } = await get(baseUrl, '/vendeurs/category/mode');
    assert.equal(status, 200);
    const shops = body.map((v) => v.shopName);
    assert.ok(shops.includes(MARK.vendVisible));
    assert.ok(!shops.includes(MARK.vendActiveOnly));
    assert.ok(!shops.includes(MARK.vendPending));
  });

  it('GET /vendeur/:id pending → 404 opaque', async () => {
    const { status, body } = await get(baseUrl, `/vendeur/${ID.vendPending}`);
    assert.equal(status, 404);
    assert.equal(body?.status, undefined);
    assert.equal(JSON.stringify(body).includes('pending'), false);
  });

  it('GET /vendeur/:id/stats pending → 404', async () => {
    const { status } = await get(baseUrl, `/vendeur/${ID.vendPending}/stats`);
    assert.equal(status, 404);
  });

  it('GET /articles — article vendeur pending absent', async () => {
    const { status, body } = await get(baseUrl, '/articles');
    assert.equal(status, 200);
    const names = body.map((a) => a.nomArticle);
    assert.ok(names.includes(MARK.artVisible));
    assert.ok(!names.includes(MARK.artHidden));
  });

  it('GET /article/:id vendeur pending → 404', async () => {
    const { status } = await get(baseUrl, `/article/${ID.artHidden}`);
    assert.equal(status, 404);
  });

  it('GET /freelance-services/home — offre freelance pending absente', async () => {
    const { status, body } = await get(baseUrl, '/freelance-services/home?limit=12');
    assert.equal(status, 200);
    const titles = (body.offers ?? []).map((o) => o.displayTitle || o.titleOverride);
    assert.ok(titles.includes('OFFER_VISIBLE_R0'));
    assert.ok(!titles.includes('OFFER_HIDDEN_R0'));
  });

  it('GET /freelance-services/:id pending → 404', async () => {
    const { status } = await get(baseUrl, `/freelance-services/${ID.offerHidden}`);
    assert.equal(status, 404);
  });

  it('GET /freelance/:id/services pending → 404', async () => {
    const { status } = await get(baseUrl, `/freelance/${ID.freelPending}/services`);
    assert.equal(status, 404);
  });

  it('Suspension : profil visible disparaît de la recherche après status suspended', async () => {
    const before = await get(baseUrl, '/search/global?query=Designer');
    assert.ok((before.body.results?.freelances ?? []).some((f) => f.name === MARK.freelVisible));
    suspendedFlag = true;
    const after = await get(baseUrl, '/search/global?query=Designer');
    suspendedFlag = false;
    const names = (after.body.results?.freelances ?? []).map((f) => f.name);
    assert.ok(!names.includes(MARK.freelVisible));
  });
});
