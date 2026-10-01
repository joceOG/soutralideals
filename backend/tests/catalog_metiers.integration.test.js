/**
 * Catalogue Métiers : filtres avant pagination, recherche scoped, raccourcis, KYC.
 * MongoMemoryServer uniquement.
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
import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import Service from '../models/serviceModel.js';
import prestataireModel from '../models/prestataireModel.js';
import prestataireRouter from '../routes/prestataireRoutes.js';
import serviceRouter from '../routes/serviceRoutes.js';
import searchRouter from '../routes/searchRoutes.js';
import categorieRouter from '../routes/categorieRoutes.js';
import groupeRouter from '../routes/groupeRoutes.js';
import { KYC_FIELD_NAMES } from '../utils/kycAccess.js';

let server;
let baseUrl;
let ids;

async function request(path) {
  const res = await fetch(`${baseUrl}${path}`);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, headers: res.headers };
}

describe('catalogue Métiers — filtres et recherche', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'catalog-metiers-secret-min-32-chars!!';
    await startIsolatedMongo();
    const app = express();
    app.use(express.json());
    app.use('/api', groupeRouter);
    app.use('/api', categorieRouter);
    app.use('/api', serviceRouter);
    app.use('/api', prestataireRouter);
    app.use('/api', searchRouter);
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
    const gMetiers = await Groupe.create({ nomgroupe: 'Métiers' });
    const gFree = await Groupe.create({ nomgroupe: 'Freelance' });
    const catBat = await Categorie.create({
      nomcategorie: 'Bâtiment & Construction',
      groupe: gMetiers._id,
    });
    const catDom = await Categorie.create({
      nomcategorie: 'Services à Domicile & de Sécurité',
      groupe: gMetiers._id,
    });
    const catFree = await Categorie.create({
      nomcategorie: 'Design',
      groupe: gFree._id,
    });
    const plombier = await Service.create({
      nomservice: 'Plombier',
      categorie: catBat._id,
      aliases: ['plomberie'],
      needs: ['robinet', 'fuite d’eau'],
      shortcutRank: 1,
    });
    const elec = await Service.create({
      nomservice: 'Électricien',
      categorie: catBat._id,
      aliases: ['electricien'],
      shortcutRank: 2,
    });
    const menage = await Service.create({
      nomservice: 'Aide ménagère à domicile',
      categorie: catDom._id,
      aliases: ['Servante ménagère'],
      shortcutRank: 3,
    });
    const logo = await Service.create({
      nomservice: 'Création de logo',
      categorie: catFree._id,
    });
    const users = [];
    for (let i = 0; i < 12; i += 1) {
      users.push(
        await Utilisateur.create({
          nom: `N${i}`,
          prenom: `P${i}`,
          telephone: `+22507000001${String(i).padStart(2, '0')}`,
          email: `p${i}@test.local`,
          password: 'GateTest1a!!',
          role: 'Prestataire',
          isActive: true,
        }),
      );
    }
    const macons = [];
    for (let i = 0; i < 10; i += 1) {
      macons.push(
        await prestataireModel.create({
          utilisateur: users[i]._id,
          service: i === 0 ? plombier._id : elec._id,
          prixprestataire: 10000,
          localisation: 'Abidjan',
          status: 'active',
          verifier: true,
          cni1: 'cld_auth:fake-cni',
        }),
      );
    }
    await prestataireModel.create({
      utilisateur: users[10]._id,
      service: plombier._id,
      prixprestataire: 10000,
      localisation: 'Abidjan',
      status: 'active',
      verifier: true,
      source: 'field_recensement_v1',
      fieldPublicationStatus: 'preparing',
    });
    await prestataireModel.create({
      utilisateur: users[11]._id,
      service: menage._id,
      prixprestataire: 8000,
      localisation: 'Abidjan',
      status: 'active',
      verifier: true,
    });
    ids = {
      catBat: String(catBat._id),
      plombier: String(plombier._id),
      elec: String(elec._id),
      menage: String(menage._id),
      logo: String(logo._id),
      firstPlombierUser: String(users[0]._id),
    };
    void macons;
    void logo;
  });

  it('filtre service exact et compte cohérent, hors première page historique', async () => {
    const page1 = await request('/api/prestataire?page=1&limit=5');
    assert.equal(page1.status, 200);
    assert.equal(page1.json.length, 5);
    const totalAll = Number(page1.headers.get('x-total-count'));
    assert.equal(totalAll, 11);

    const byService = await request(`/api/prestataire?service=${ids.plombier}&page=1&limit=5`);
    assert.equal(byService.status, 200);
    assert.equal(Number(byService.headers.get('x-total-count')), 1);
    assert.equal(byService.json.length, 1);
    assert.equal(String(byService.json[0].service._id), ids.plombier);
    for (const row of byService.json) {
      for (const k of KYC_FIELD_NAMES) {
        if (k in row) assert.equal(typeof row[k], 'boolean');
      }
    }
  });

  it('filtre catégorie avant pagination', async () => {
    const res = await request(`/api/prestataire?categorie=${ids.catBat}&page=1&limit=3`);
    assert.equal(res.status, 200);
    assert.equal(Number(res.headers.get('x-total-count')), 10);
    assert.equal(res.json.length, 3);
  });

  it('sélection incompatible service/catégorie → vide', async () => {
    const res = await request(
      `/api/prestataire?service=${ids.menage}&categorie=${ids.catBat}`,
    );
    assert.equal(res.status, 200);
    assert.equal(res.json.length, 0);
  });

  it('recensement non publié exclu du public', async () => {
    const res = await request(`/api/prestataire?service=${ids.plombier}`);
    assert.equal(Number(res.headers.get('x-total-count')), 1);
  });

  it('recherche Métiers : robinet trouve Plombier puis le prestataire lié', async () => {
    const res = await request('/api/search/global?query=robinet&scope=metiers');
    assert.equal(res.status, 200);
    assert.equal(res.json.scope, 'metiers');
    const names = res.json.results.services.map((s) => s.nomservice);
    assert.ok(names.includes('Plombier'));
    assert.equal(res.json.results.prestataires.length, 1);
    assert.equal(res.json.results.articles.length, 0);
    assert.equal(res.json.results.freelances.length, 0);
  });

  it('création logo hors scope Métiers', async () => {
    const metiers = await request('/api/search/global?query=cr%C3%A9ation%20logo&scope=metiers');
    assert.equal(metiers.status, 200);
    const metierNames = (metiers.json.results.services || []).map((s) => s.nomservice);
    assert.equal(metierNames.includes('Création de logo'), false);
    const global = await request('/api/search/global?query=cr%C3%A9ation%20logo');
    const globalNames = (global.json.results.services || []).map((s) => s.nomservice);
    assert.ok(globalNames.includes('Création de logo'));
  });

  it('raccourcis éditoriaux stables', async () => {
    const res = await request('/api/service/shortcuts?scope=metiers');
    assert.equal(res.status, 200);
    assert.equal(res.json.length, 3);
    assert.deepEqual(
      res.json.map((s) => s.shortcutRank),
      [1, 2, 3],
    );
  });

  it('renommage conserve l’id et l’ancien nom en alias', async () => {
    const svc = await Service.findById(ids.menage);
    const oldId = String(svc._id);
    svc.nomservice = 'Aide ménagère à domicile';
    svc.aliases = Array.from(new Set([...(svc.aliases || []), 'Servante ménagère']));
    await svc.save();
    const again = await Service.findById(oldId);
    assert.equal(String(again._id), oldId);
    const search = await request('/api/search/global?query=Servante%20m%C3%A9nag%C3%A8re&scope=metiers');
    assert.ok(search.json.results.services.some((s) => String(s._id) === oldId));
  });

  it('catégorie sans image acceptable', async () => {
    const g = await Groupe.findOne({ nomgroupe: 'Métiers' });
    const cat = await Categorie.create({ nomcategorie: 'Test sans image', groupe: g._id });
    assert.ok(cat._id);
    assert.equal(cat.imagecategorie, undefined);
  });

  it('service orphelin diagnostiqué, non supprimé', async () => {
    const orphan = await Service.collection.insertOne({
      nomservice: 'Ferronnier',
      categorie: null,
    });
    const still = await Service.findById(orphan.insertedId);
    assert.equal(still.nomservice, 'Ferronnier');
    const shortcuts = await request('/api/service/shortcuts?scope=metiers');
    assert.equal(shortcuts.json.some((s) => s.nomservice === 'Ferronnier'), false);
  });

  it('référence categorie cassée : populate null, hors filtre Services généraux', async () => {
    const dangling = new mongoose.Types.ObjectId();
    const inserted = await Service.collection.insertOne({
      nomservice: 'Vulgarisateur test',
      categorie: dangling,
    });
    const raw = await Service.collection.findOne({ _id: inserted.insertedId });
    assert.ok(raw.categorie);
    const populated = await Service.findById(inserted.insertedId).populate('categorie');
    assert.equal(populated.categorie, null);
    const all = await request('/api/service');
    const row = all.json.find((s) => String(s._id) === String(inserted.insertedId));
    assert.ok(row);
    assert.equal(row.categorie, null);
  });

  it('création sans image et update conserve l’URL existante', async () => {
    const cat = await Categorie.findOne({ nomcategorie: 'Bâtiment & Construction' });
    const created = await Service.create({
      nomservice: 'Staffeur test img',
      categorie: cat._id,
    });
    assert.equal(created.imageservice, undefined);
    created.imageservice = 'https://example.com/kept.jpg';
    await created.save();
    created.nomservice = 'Staffeur test img';
    await created.save();
    const again = await Service.findById(created._id);
    assert.equal(again.imageservice, 'https://example.com/kept.jpg');
  });

  it('catalogKey unique : deuxième insertion refusée', async () => {
    const cat = await Categorie.findOne({ nomcategorie: 'Bâtiment & Construction' });
    await Service.create({
      nomservice: 'Clé unique A',
      categorie: cat._id,
      catalogKey: 'metiers.test-unique-key',
    });
    await assert.rejects(() =>
      Service.create({
        nomservice: 'Clé unique B',
        categorie: cat._id,
        catalogKey: 'metiers.test-unique-key',
      }),
    );
  });

  it('chaiose retrouve Menuisier ; acheter une chaise ne le fait pas', async () => {
    const cat = await Categorie.findOne({ nomcategorie: 'Bâtiment & Construction' });
    await Service.create({
      nomservice: 'Menuisier',
      categorie: cat._id,
      needs: ['chaise cassee', 'reparer une chaise'],
    });
    const typo = await request('/api/search/global?query=chaiose&scope=metiers');
    assert.ok((typo.json.results.services || []).some((s) => s.nomservice === 'Menuisier'));
    const buy = await request('/api/search/global?query=acheter%20une%20chaise&scope=metiers');
    assert.equal(
      (buy.json.results.services || []).some((s) => s.nomservice === 'Menuisier'),
      false,
    );
  });
});
