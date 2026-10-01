import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROPOSALS,
  RENAMES,
  A_REVOIR,
  ORPHAN_POLICY,
  CATEGORY_ADD,
  proposalShouldCreate,
} from '../catalog/metiersCatalogPlan.js';

describe('plan éditorial Métiers', () => {
  it('évalue exactement 50 propositions', () => {
    assert.equal(PROPOSALS.length, 50);
    const nums = PROPOSALS.map((p) => p.n).sort((a, b) => a - b);
    assert.deepEqual(nums, Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it('ne fusionne pas par défaut et ne rattache pas les orphelins', () => {
    assert.equal(ORPHAN_POLICY.doNotDelete, true);
    assert.equal(ORPHAN_POLICY.doNotAttachToMetiers, true);
    assert.equal(ORPHAN_POLICY.doNotRenameVulgarisateur, true);
    assert.ok(A_REVOIR.includes('Ferrailleur'));
    assert.ok(A_REVOIR.includes('Decorateur'));
    assert.ok(!RENAMES.some((r) => r.current === 'Decorateur'));
    assert.ok(!RENAMES.some((r) => /vulgarisateur/i.test(r.current)));
  });

  it('propositions 46 et 47 restent A_REVOIR hors Freelance automatique', () => {
    const p46 = PROPOSALS.find((p) => p.n === 46);
    const p47 = PROPOSALS.find((p) => p.n === 47);
    assert.equal(p46.action, 'A_REVOIR');
    assert.equal(p47.action, 'A_REVOIR');
    assert.equal(p46.create, false);
    assert.equal(p47.create, false);
    assert.equal(proposalShouldCreate(p46), false);
    assert.equal(proposalShouldCreate(p47), false);
  });

  it('Élagueur et événementiel ne sont pas dumpés dans Bâtiment / Artisanat', () => {
    const elag = PROPOSALS.find((p) => p.n === 10);
    assert.equal(elag.category, 'Jardinage & Espaces verts');
    assert.ok(CATEGORY_ADD.some((c) => c.nomcategorie === 'Jardinage & Espaces verts'));
    for (const n of [33, 34, 35, 36]) {
      const p = PROPOSALS.find((row) => row.n === n);
      assert.equal(p.category, 'Événementiel & Animation');
    }
    const nage = PROPOSALS.find((p) => p.n === 48);
    assert.equal(nage.action, 'A_REVOIR');
    assert.notEqual(nage.category, 'Services à Domicile & de Sécurité');
  });

  it('compte des créations automatiques après recoupement', () => {
    assert.equal(PROPOSALS.filter(proposalShouldCreate).length, 44);
  });
});
