/**
 * R1-02 — Tests service correspondance utilisateur (lecture seule).
 * Exécuter AVANT l’implémentation pour constater les échecs d’import.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import Utilisateur from '../models/utilisateurModel.js';
import {
  matchFieldRecensementUser,
  toAgentSafeMatchResult,
} from '../services/fieldRecensementUserMatcher.js';

const SELECT_SAFE = '_id telephone telephoneVerified email isActive deactivatedAt updatedAt role';

async function createUser(fields) {
  return Utilisateur.create({
    nom: fields.nom || 'Test',
    prenom: fields.prenom || 'User',
    password: fields.password || 'Secret1a',
    role: fields.role || 'Client',
    ...fields,
  });
}

async function snapshotUser(id) {
  return Utilisateur.findById(id).select(SELECT_SAFE).lean();
}

describe('R1-02 — fieldRecensementUserMatcher', () => {
  before(async () => {
    await startIsolatedMongo();
    await Utilisateur.syncIndexes();
  });

  after(async () => {
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
  });

  it('S1 — aucun utilisateur → none', async () => {
    const r = await matchFieldRecensementUser({
      telephone: '+2250700000099',
      email: 'inconnu@example.com',
    });
    assert.equal(r.status, 'none');
    assert.equal(r.matchedUtilisateurId, null);
  });

  it('S2 — téléphone vérifié unique → verified_match', async () => {
    const u = await createUser({
      telephone: '+2250700000099',
      telephoneVerified: true,
      email: 'awa@example.com',
    });
    const r = await matchFieldRecensementUser({ telephone: '+2250700000099' });
    assert.equal(r.status, 'verified_match');
    assert.equal(String(r.matchedUtilisateurId), String(u._id));
    assert.equal(r.confidence, 'verified_phone');
  });

  it('S3 — téléphone présent non vérifié → pas de lien', async () => {
    await createUser({
      telephone: '+2250700000099',
      telephoneVerified: false,
    });
    const r = await matchFieldRecensementUser({ telephone: '+2250700000099' });
    assert.equal(r.matchedUtilisateurId, null);
    assert.ok(r.status === 'none' || r.status === 'unverified_signal');
  });

  it('S4 — formats ivoiriens équivalents via normalisation', async () => {
    const u = await createUser({
      telephone: '+2250700000099',
      telephoneVerified: true,
    });
    const variants = [
      '+2250700000099',
      '002250700000099',
      '+225 07 00 00 00 99',
      '0700000099', // national + defaultCountry CI
    ];
    for (const telephone of variants) {
      const r = await matchFieldRecensementUser({
        telephone,
        defaultCountry: 'CI',
      });
      assert.equal(r.status, 'verified_match', `fail pour ${telephone}`);
      assert.equal(String(r.matchedUtilisateurId), String(u._id));
    }
  });

  it('S5 — mêmes derniers chiffres, préfixes différents → aucun faux match', async () => {
    await createUser({
      telephone: '+2250700000099',
      telephoneVerified: true,
    });
    // Autre pays / autre préfixe, mêmes 8 derniers chiffres
    const r = await matchFieldRecensementUser({
      telephone: '+33170000099',
      defaultCountry: 'FR',
    });
    assert.equal(r.matchedUtilisateurId, null);
    assert.notEqual(r.status, 'verified_match');
  });

  it('S6 — email seul : sans indicateur emailVerified → pas de verified_match', async () => {
    await createUser({
      email: 'awa@example.com',
      telephone: '+2250700112233',
      telephoneVerified: true,
    });
    const r = await matchFieldRecensementUser({ email: 'awa@example.com' });
    assert.equal(r.matchedUtilisateurId, null);
    assert.notEqual(r.status, 'verified_match');
  });

  it('S7 — email non vérifié (modèle sans preuve) → null', async () => {
    await createUser({ email: 'seul@example.com' });
    const r = await matchFieldRecensementUser({ email: 'seul@example.com' });
    assert.equal(r.matchedUtilisateurId, null);
  });

  it('S8 — email @temp.com ignoré', async () => {
    await createUser({
      email: 'x@temp.com',
      telephone: '+2250700000011',
      telephoneVerified: true,
    });
    const r = await matchFieldRecensementUser({
      telephone: '+2250700000099',
      email: 'x@temp.com',
    });
    assert.equal(r.matchedUtilisateurId, null);
    assert.ok(!r.reasonCodes?.includes('EMAIL_VERIFIED_MATCH'));
  });

  it('S9 — email casse normalisée (signal non liant, pas de match email)', async () => {
    await createUser({ email: 'awa@example.com' });
    const r = await matchFieldRecensementUser({ email: 'AWA@EXAMPLE.COM' });
    assert.equal(r.matchedUtilisateurId, null);
    assert.ok(
      r.reasonCodes?.includes('EMAIL_CANDIDATE_UNVERIFIED') ||
        r.status === 'none' ||
        r.status === 'unverified_signal',
    );
  });

  it('S10 — téléphone+email même user → verified_phone (email non prouvable)', async () => {
    const u = await createUser({
      telephone: '+2250700000099',
      telephoneVerified: true,
      email: 'awa@example.com',
    });
    const r = await matchFieldRecensementUser({
      telephone: '+2250700000099',
      email: 'awa@example.com',
    });
    assert.equal(r.status, 'verified_match');
    assert.equal(String(r.matchedUtilisateurId), String(u._id));
    // Pas d’emailVerified dans le modèle → pas verified_phone_and_email
    assert.equal(r.confidence, 'verified_phone');
  });

  it('S11 — téléphone et email → deux users différents → conflict', async () => {
    await createUser({
      nom: 'A',
      telephone: '+2250700000099',
      telephoneVerified: true,
      email: 'a@example.com',
    });
    await createUser({
      nom: 'B',
      telephone: '+2250700000088',
      telephoneVerified: true,
      email: 'b@example.com',
    });
    const r = await matchFieldRecensementUser({
      telephone: '+2250700000099',
      email: 'b@example.com',
    });
    assert.equal(r.status, 'conflict');
    assert.equal(r.matchedUtilisateurId, null);
  });

  it('S12 — plusieurs correspondances téléphone vérifié → ambiguous', async () => {
    // Simule legacy : drop temporaire de l’index unique partiel
    try {
      await Utilisateur.collection.dropIndex('telephone_verified_unique');
    } catch {
      /* index absent */
    }
    const col = mongoose.connection.collection('utilisateurs');
    await col.insertMany([
      {
        nom: 'Dup1',
        password: 'x',
        role: 'Client',
        telephone: '+2250700000077',
        telephoneVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nom: 'Dup2',
        password: 'y',
        role: 'Client',
        telephone: '+2250700000077',
        telephoneVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const r = await matchFieldRecensementUser({ telephone: '+2250700000077' });
    assert.equal(r.status, 'ambiguous');
    assert.equal(r.matchedUtilisateurId, null);
    // Nettoyer les doublons legacy avant de recréer l’index unique
    await col.deleteMany({ telephone: '+2250700000077' });
    await Utilisateur.syncIndexes();
  });

  it('S13 — compte isActive=false → blocked_candidate', async () => {
    await createUser({
      telephone: '+2250700000099',
      telephoneVerified: true,
      isActive: false,
      deactivatedAt: new Date(),
    });
    const r = await matchFieldRecensementUser({ telephone: '+2250700000099' });
    assert.equal(r.status, 'blocked_candidate');
    assert.equal(r.matchedUtilisateurId, null);
  });

  it('S14 — compte inactif sans désactivation explicite → blocked_candidate', async () => {
    // Décision : isActive=false (ex. futur pending_claim) → pas de lien auto
    await createUser({
      telephone: '+2250700000099',
      telephoneVerified: true,
      isActive: false,
    });
    const r = await matchFieldRecensementUser({ telephone: '+2250700000099' });
    assert.equal(r.status, 'blocked_candidate');
    assert.equal(r.matchedUtilisateurId, null);
  });

  it('S15 — téléphone invalide → validation_error ou none, pas de throw', async () => {
    const r = await matchFieldRecensementUser({ telephone: 'abc' });
    assert.equal(r.matchedUtilisateurId, null);
    assert.ok(r.status === 'validation_error' || r.status === 'none');
    assert.ok(Array.isArray(r.reasonCodes));
  });

  it('S16 — email invalide → validation_error ou none', async () => {
    const r = await matchFieldRecensementUser({ email: 'pas-un-email' });
    assert.equal(r.matchedUtilisateurId, null);
    assert.ok(r.status === 'validation_error' || r.status === 'none');
  });

  it('S17 — téléphone seul OK ; email seul OK ; les deux absents → validation_error', async () => {
    const t = await matchFieldRecensementUser({ telephone: '+2250700000099' });
    assert.equal(t.status, 'none');
    const e = await matchFieldRecensementUser({ email: 'x@example.com' });
    assert.notEqual(e.status, 'verified_match');
    const both = await matchFieldRecensementUser({});
    assert.equal(both.status, 'validation_error');
    assert.ok(both.reasonCodes.includes('MISSING_CONTACT'));
  });

  it('S18 — lecture seule : snapshot utilisateur inchangé', async () => {
    const u = await createUser({
      telephone: '+2250700000099',
      telephoneVerified: true,
      email: 'ro@example.com',
    });
    const before = await snapshotUser(u._id);
    const countBefore = await Utilisateur.countDocuments();
    await matchFieldRecensementUser({
      telephone: '+2250700000099',
      email: 'ro@example.com',
    });
    const after = await snapshotUser(u._id);
    const countAfter = await Utilisateur.countDocuments();
    assert.equal(countAfter, countBefore);
    assert.deepEqual(after, before);
  });

  it('projection agent : jamais d’id ni PII', async () => {
    const u = await createUser({
      telephone: '+2250700000099',
      telephoneVerified: true,
      email: 'secret@example.com',
    });
    const internal = await matchFieldRecensementUser({ telephone: '+2250700000099' });
    const pub = toAgentSafeMatchResult(internal);
    assert.equal(pub.matchStatus, 'no_public_information');
    const s = JSON.stringify(pub);
    assert.ok(!s.includes(String(u._id)));
    assert.ok(!s.includes('secret@example.com'));
    assert.ok(!s.includes('+225'));
    assert.equal(pub.matchedUtilisateurId, undefined);
    assert.equal(pub.confidence, undefined);
    assert.equal(pub.status, undefined);
  });
});
