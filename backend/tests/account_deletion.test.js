/**
 * Phase 10B — Suppression de compte (MongoMemoryServer uniquement).
 * Aucune donnée réelle / Atlas.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import Utilisateur from '../models/utilisateurModel.js';
import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import {
  requestAccountDeletionForActor,
  publicDeletionRequest,
  processAccountDeletion,
} from '../services/accountDeletionService.js';

describe('Phase10B account deletion', () => {
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

  async function seedUser(overrides = {}) {
    const password = await bcrypt.hash('SynthTest!234', 10);
    return Utilisateur.create({
      nom: 'Synth',
      prenom: 'User',
      email: overrides.email || 'synth.delete@example.test',
      telephone: overrides.telephone || '+2250700000099',
      password,
      role: 'Client',
      tokens: [{ token: 'access-synth' }],
      refreshTokens: [{ token: 'refresh-synth', expiresAt: new Date(Date.now() + 86400000) }],
      fcmTokens: [{ token: 'fcm-synth', platform: 'android' }],
      isActive: true,
      ...overrides,
    });
  }

  it('anonymise PII, révoque tokens, refuse reconnexion logique', async () => {
    const user = await seedUser();

    const result = await requestAccountDeletionForActor(user);
    assert.equal(result.status, 'completed');
    assert.ok(result.requestId);

    const reloaded = await Utilisateur.findById(user._id);
    assert.equal(reloaded.deletionStatus, 'completed');
    assert.equal(reloaded.isActive, false);
    assert.ok(!reloaded.telephone);
    assert.match(reloaded.email, /^deleted\+/);
    assert.equal(reloaded.nom, 'Compte');
    assert.equal((reloaded.tokens || []).length, 0);
    assert.equal((reloaded.refreshTokens || []).length, 0);
    assert.equal((reloaded.fcmTokens || []).length, 0);
  });

  it('double demande idempotente', async () => {
    const user = await seedUser({ email: 'synth.idem@example.test' });
    const first = await requestAccountDeletionForActor(user);
    const second = await requestAccountDeletionForActor(user);
    assert.equal(first.status, 'completed');
    assert.equal(second.status, 'completed');
    assert.equal(second.alreadyApplied, true);
    assert.equal(first.requestId, second.requestId);
  });

  it('publicDeletionRequest ne révèle pas l’existence', async () => {
    const missing = await publicDeletionRequest({
      email: 'missing.nobody@example.test',
      confirmation: 'SUPPRIMER',
    });
    assert.equal(missing.accepted, true);
    assert.match(missing.message, /Si un compte correspond/i);

    await seedUser({ email: 'synth.public@example.test' });
    const existing = await publicDeletionRequest({
      email: 'synth.public@example.test',
      confirmation: 'SUPPRIMER',
    });
    assert.equal(existing.accepted, true);
    assert.equal(existing.message, missing.message);

    const reloaded = await Utilisateur.findOne({
      email: /^deleted\+/,
    });
    assert.ok(reloaded);
    assert.equal(reloaded.deletionStatus, 'completed');
  });

  it('ne traite pas un autre utilisateur via actor isolé', async () => {
    const a = await seedUser({ email: 'synth.a@example.test' });
    const b = await seedUser({
      email: 'synth.b@example.test',
      telephone: '+2250700000098',
    });
    await processAccountDeletion(a, { requestId: 'req-a', channel: 'app' });
    const bReloaded = await Utilisateur.findById(b._id);
    assert.notEqual(bReloaded.deletionStatus, 'completed');
    assert.equal(bReloaded.isActive, true);
    assert.equal(bReloaded.email, 'synth.b@example.test');
  });
});
