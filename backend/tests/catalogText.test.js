import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  levenshtein,
  normalizeCatalogText,
  rankCatalogServices,
  scoreCatalogService,
  tokenFuzzyEquals,
} from '../utils/catalogText.js';

describe('catalogText', () => {
  it('normalise casse, accents et apostrophes', () => {
    assert.equal(normalizeCatalogText('Électricien'), 'electricien');
    assert.equal(normalizeCatalogText('fuite d’eau'), 'fuite d eau');
  });

  it('distance de Levenshtein', () => {
    assert.equal(levenshtein('chaise', 'chaiose'), 1);
    assert.equal(levenshtein('chaussure', 'chaussurre'), 1);
  });

  it('plombier / electricien / électricien matchent le nom', () => {
    const plombier = { nomservice: 'Plombier', aliases: ['plomberie'], needs: ['robinet', 'fuite d’eau'] };
    const elec = { nomservice: 'Électricien', aliases: ['electricien'], needs: [] };
    assert.equal(scoreCatalogService('plombier', plombier).kind, 'exact-name');
    assert.ok(scoreCatalogService('electricien', elec));
    assert.ok(scoreCatalogService('électricien', elec));
  });

  it('robinet et fuite d’eau matchent les besoins plombier, pas une grande catégorie', () => {
    const plombier = { nomservice: 'Plombier', aliases: [], needs: ['robinet', 'fuite d’eau'] };
    const macons = { nomservice: 'Maçon', aliases: [], needs: ['parpaing'] };
    assert.ok(scoreCatalogService('robinet', plombier).score >= 70);
    assert.ok(scoreCatalogService('fuite d’eau', plombier));
    assert.equal(scoreCatalogService('robinet', macons), null);
  });

  it('chaiose / chaussurre : typo bornée vers besoins catalogue', () => {
    assert.equal(tokenFuzzyEquals('chaiose', 'chaise'), true);
    assert.equal(tokenFuzzyEquals('chaussurre', 'chaussure'), true);
    const menuisier = {
      nomservice: 'Menuisier',
      aliases: [],
      needs: ['chaise cassee', 'reparer une chaise'],
    };
    const cordonnier = {
      nomservice: 'Cordonnier',
      aliases: ['cordonnerie'],
      needs: ['chaussure a reparer', 'semelle'],
    };
    assert.ok(scoreCatalogService('chaiose', menuisier));
    assert.ok(scoreCatalogService('chaussurre', cordonnier));
  });

  it('réparer une chaise vs acheter une chaise', () => {
    const menuisier = {
      nomservice: 'Menuisier',
      aliases: [],
      needs: ['reparer une chaise', 'chaise cassee'],
    };
    assert.ok(scoreCatalogService('réparer une chaise', menuisier));
    assert.equal(scoreCatalogService('acheter une chaise', menuisier), null);
  });

  it('alias sans doublon de résultat', () => {
    const ranked = rankCatalogServices('plomberie', [
      { _id: '1', nomservice: 'Plombier', aliases: ['plomberie'], needs: [] },
    ]);
    assert.equal(ranked.length, 1);
  });
});
