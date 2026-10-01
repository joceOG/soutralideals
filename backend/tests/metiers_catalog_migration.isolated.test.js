/**
 * Migration Métiers — idempotence, journal, retour arrière partiel.
 * MongoMemoryServer uniquement. Aucun Atlas.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import Groupe from '../models/groupeModel.js';
import Categorie from '../models/categorieModel.js';
import Service from '../models/serviceModel.js';
import {
  mergeJournal,
  rollbackPartial,
  runMetiersCatalogMigration,
} from '../catalog/runMetiersCatalogMigration.js';
import { proposalShouldCreate, PROPOSALS } from '../catalog/metiersCatalogPlan.js';

async function seedBase() {
  const g = await Groupe.create({ nomgroupe: 'Métiers' });
  const catBat = await Categorie.create({
    nomcategorie: 'Bâtiment & Construction',
    groupe: g._id,
  });
  const catDom = await Categorie.create({
    nomcategorie: 'Services à Domicile & de Sécurité',
    groupe: g._id,
  });
  const catBeaute = await Categorie.create({
    nomcategorie: ' Beauté & Soins',
    groupe: g._id,
  });
  const catMech = await Categorie.create({
    nomcategorie: 'Mécanique & Transport',
    groupe: g._id,
  });
  const catElec = await Categorie.create({
    nomcategorie: 'Electronique & Technologie',
    groupe: g._id,
  });
  const catTex = await Categorie.create({
    nomcategorie: 'Textile & Habillement',
    groupe: g._id,
  });
  const catAlim = await Categorie.create({
    nomcategorie: 'Alimentation & Restauration',
    groupe: g._id,
  });
  const catArt = await Categorie.create({
    nomcategorie: 'Artisanat & Art',
    groupe: g._id,
  });
  const catCom = await Categorie.create({
    nomcategorie: 'Commerce & Service de Proximité',
    groupe: g._id,
  });
  const catElev = await Categorie.create({
    nomcategorie: 'Élevage, Animaux & Services Associés',
    groupe: g._id,
  });

  const plombier = await Service.create({
    nomservice: 'Plombier',
    categorie: catBat._id,
  });
  const elec = await Service.create({
    nomservice: 'Electricien',
    categorie: catBat._id,
  });
  const menage = await Service.create({
    nomservice: 'Servante ménagère',
    categorie: catDom._id,
  });
  const macon = await Service.create({
    nomservice: 'Maçon',
    categorie: catBat._id,
  });
  const auto = await Service.create({
    nomservice: 'Mecanicien Auto',
    categorie: catMech._id,
  });
  const coif = await Service.create({
    nomservice: 'Coiffure Homme',
    categorie: catBeaute._id,
  });
  const menuisier = await Service.create({
    nomservice: 'Menuisier',
    categorie: catBat._id,
  });
  const jardinier = await Service.create({
    nomservice: 'Jardinier / Paysagiste',
    categorie: catBat._id,
  });
  const piscine = await Service.create({
    nomservice: 'Installateur Piscine',
    categorie: catBat._id,
  });
  const couture = await Service.create({
    nomservice: 'Couturiere',
    categorie: catTex._id,
  });
  const clim = await Service.create({
    nomservice: 'Réparateur de climatiseur',
    categorie: catElec._id,
  });
  const tel = await Service.create({
    nomservice: 'Réparateur de téléphone',
    categorie: catElec._id,
  });
  const instClim = await Service.create({
    nomservice: 'Installateur Climatisation',
    categorie: catBat._id,
  });
  const cord = await Service.create({
    nomservice: 'Cordonnier',
    categorie: catTex._id,
  });
  const dame = await Service.create({
    nomservice: 'Coiffeuse Dame',
    categorie: catBeaute._id,
  });
  return {
    g, catBat, catDom, plombier, elec, menage, macon, auto, coif,
    menuisier, jardinier, piscine, couture, clim, tel, instClim, cord, dame,
    extraCats: { catElec, catTex, catAlim, catArt, catCom, catElev, catBeaute, catMech },
  };
}

describe('migration catalogue Métiers — isolée', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await startIsolatedMongo();
  });
  after(async () => {
    await stopIsolatedMongo();
  });
  beforeEach(async () => {
    await clearIsolatedMongo();
  });

  it('dry-run puis double apply : zéro création/renommage répétés', async () => {
    const seeded = await seedBase();
    const dry1 = await runMetiersCatalogMigration({
      apply: false, Groupe, Categorie, Service,
    });
    assert.equal(dry1.apply, false);
    assert.ok(dry1.counts.planned > 0);
    assert.equal(dry1.counts.created, 0);

    const apply1 = await runMetiersCatalogMigration({
      apply: true, Groupe, Categorie, Service,
    });
    assert.equal(apply1.failed.length, 0);
    assert.ok(apply1.counts.applied > 0);
    const elecAfter = await Service.findById(seeded.elec._id);
    assert.equal(elecAfter.nomservice, 'Électricien');
    assert.ok((elecAfter.aliases || []).includes('Electricien'));
    const createdCount = apply1.operations.filter((o) => o.type === 'add' && o.status === 'applied').length;
    assert.ok(createdCount > 0);

    const dry2 = await runMetiersCatalogMigration({
      apply: false, Groupe, Categorie, Service,
    });
    const plannedAdds = dry2.operations.filter((o) => o.type === 'add' && o.status === 'planned');
    const plannedRenames = dry2.operations.filter((o) => o.type === 'rename' && o.status === 'planned');
    assert.equal(plannedAdds.length, 0);
    assert.equal(plannedRenames.length, 0);

    const apply2 = await runMetiersCatalogMigration({
      apply: true, Groupe, Categorie, Service,
    });
    assert.equal(apply2.createdIds.length, 0);
    assert.equal(apply2.operations.filter((o) => o.type === 'rename' && o.status === 'applied').length, 0);
    assert.equal(apply2.operations.filter((o) => o.type === 'add' && o.status === 'applied').length, 0);
    assert.ok(apply2.noops.length >= createdCount);
    const still = await Service.countDocuments({ catalogKey: { $exists: true, $ne: null } });
    assert.equal(still, createdCount);
    const ranks = await Service.find({ shortcutRank: { $exists: true } }).lean();
    const rankValues = ranks.map((s) => s.shortcutRank).sort((a, b) => a - b);
    assert.deepEqual(rankValues, [1, 2, 3, 4, 5, 6]);
  });

  it('entrée équivalente sans catalogKey : pas de duplicata', async () => {
    const seeded = await seedBase();
    const jardinage = await Categorie.create({
      nomcategorie: 'Jardinage & Espaces verts',
      groupe: seeded.g._id,
    });
    await Service.create({
      nomservice: 'Élagueur',
      categorie: jardinage._id,
    });
    const result = await runMetiersCatalogMigration({
      apply: true, Groupe, Categorie, Service,
    });
    const elagueurs = await Service.find({ nomservice: 'Élagueur' });
    assert.equal(elagueurs.length, 1);
    assert.equal(elagueurs[0].catalogKey, undefined);
    assert.ok(result.skipped.some((s) => s.reason === 'equivalent-sans-catalogKey'));
  });

  it('correspondance ambiguë laissée intacte', async () => {
    const seeded = await seedBase();
    await Service.create({
      nomservice: 'Électricien',
      categorie: seeded.catBat._id,
      aliases: ['Electricien'],
    });
    const result = await runMetiersCatalogMigration({
      apply: true, Groupe, Categorie, Service,
    });
    assert.ok(result.skipped.some((s) => s.type === 'rename' && s.current === 'Electricien' && s.reason === 'ambigu'));
    const orig = await Service.findById(seeded.elec._id);
    assert.equal(orig.nomservice, 'Electricien');
    const twin = await Service.find({ nomservice: 'Électricien' });
    assert.equal(twin.length, 1);
  });

  it('échec journalisé sans masquer le reste', async () => {
    const seeded = await seedBase();
    await Service.create({
      nomservice: 'Autre rang',
      categorie: seeded.catBat._id,
      shortcutRank: 1,
    });
    const result = await runMetiersCatalogMigration({
      apply: true, Groupe, Categorie, Service,
    });
    assert.ok(result.failed.some((f) => f.type === 'shortcut'));
    const renamed = await Service.findById(seeded.elec._id);
    assert.equal(renamed.nomservice, 'Électricien');
  });

  it('journal dry-run n’écrase pas un apply précédent', () => {
    let journal = { version: 2, applied: [], dryRuns: [] };
    journal = mergeJournal(journal, { apply: true, runId: 'a1', counts: { applied: 3 } });
    journal = mergeJournal(journal, { apply: false, runId: 'd1', counts: { planned: 0 } });
    assert.equal(journal.applied.length, 1);
    assert.equal(journal.applied[0].runId, 'a1');
    assert.equal(journal.dryRuns.length, 1);
    journal = mergeJournal(journal, { apply: true, runId: 'a1', counts: { applied: 4 } });
    assert.equal(journal.applied.length, 1);
    assert.equal(journal.applied[0].counts.applied, 4);
  });

  it('retour arrière partiel restaure champs et conserve créations ; conflit si modifié après', async () => {
    await seedBase();
    const apply1 = await runMetiersCatalogMigration({
      apply: true, Groupe, Categorie, Service,
    });
    const createdSvc = apply1.operations.find((o) => o.type === 'add' && o.status === 'applied')?.id;
    assert.ok(createdSvc);
    const elec = await Service.findOne({ nomservice: 'Électricien' });
    elec.nomservice = 'Électricien modifié après coup';
    await elec.save();

    const rb = await rollbackPartial({
      lastRun: apply1,
      Service,
      Categorie,
      apply: true,
    });
    assert.equal(rb.kind, 'retour_arriere_partiel');
    assert.ok(rb.keptCreations.includes(createdSvc));
    assert.ok(await Service.findById(createdSvc));
    assert.ok(rb.conflicts.some((c) => c.reason === 'valeur_courante_differente_de_appliquee'));
    const menage = await Service.findOne({ aliases: 'Servante ménagère' });
    if (menage) {
      assert.equal(menage.nomservice, 'Servante ménagère');
    }
  });

  it('matching après renommage : vocab et raccourcis sur nom proposé', async () => {
    await seedBase();
    await runMetiersCatalogMigration({ apply: true, Groupe, Categorie, Service });
    const apply2 = await runMetiersCatalogMigration({ apply: true, Groupe, Categorie, Service });
    const shortcutOps = apply2.operations.filter((o) => o.type === 'shortcut' && o.status === 'applied');
    assert.equal(shortcutOps.length, 0);
    const elec = await Service.findOne({ nomservice: 'Électricien' });
    assert.equal(elec.shortcutRank, 2);
    assert.ok((elec.needs || []).includes('panne de courant'));
  });

  it('propositions A_REVOIR / AUTRE_UNIVERS ne créent pas', () => {
    const skipped = PROPOSALS.filter((p) => !proposalShouldCreate(p)).map((p) => p.n);
    assert.ok(skipped.includes(28));
    assert.ok(skipped.includes(31));
    assert.ok(skipped.includes(32));
    assert.ok(skipped.includes(46));
    assert.ok(skipped.includes(47));
    assert.ok(skipped.includes(48));
    assert.equal(PROPOSALS.filter(proposalShouldCreate).length, 44);
  });

  it('dry-run et apply produisent les mêmes opérations métier (hors IDs générés)', async () => {
    await seedBase();

    const dry = await runMetiersCatalogMigration({
      apply: false, Groupe, Categorie, Service,
    });
    const applyResult = await runMetiersCatalogMigration({
      apply: true, Groupe, Categorie, Service,
    });

    // Même total d'opérations
    assert.equal(
      dry.operations.length,
      applyResult.operations.length,
      `opérations: dry=${dry.operations.length}, apply=${applyResult.operations.length}`,
    );

    // planned == applied
    assert.equal(
      dry.counts.planned,
      applyResult.counts.applied,
      `planned(${dry.counts.planned}) != applied(${applyResult.counts.applied})`,
    );

    // Même nombre de skips
    assert.equal(dry.skipped.length, applyResult.skipped.length);

    // Mêmes opérations métier par type + clé stable, indépendamment des IDs
    function stableKey(op) {
      if (op.type === 'add') return `add:${op.catalogKey}`;
      if (op.type === 'category-add') return `category-add:${op.after?.nomcategorie}`;
      if (op.type === 'category-trim') return `category-trim:${op.id}`;
      // rename, vocab, shortcut : id = ObjectId du document existant (stable)
      return `${op.type}:${op.id}`;
    }
    const dryKeys = dry.operations.map(stableKey).sort();
    const applyKeys = applyResult.operations.map(stableKey).sort();
    assert.deepEqual(dryKeys, applyKeys, 'types et clés stables doivent coïncider');

    // Les services dépendant de catégories nouvelles sont bien dans le dry-run
    const dependentPlanned = dry.operations.filter(
      (o) => o.type === 'add' && o.dependsOnPlannedCategory,
    );
    assert.ok(
      dependentPlanned.length >= 5,
      `attendu ≥5 adds dépendants de catégories planifiées, obtenu ${dependentPlanned.length}`,
    );
    const plannedCatNames = [...new Set(dependentPlanned.map((o) => o.dependsOnPlannedCategory))];
    assert.ok(plannedCatNames.some((n) => /jardinage/i.test(n)));
    assert.ok(plannedCatNames.some((n) => /v.nementiel/i.test(n)));
  });
});
