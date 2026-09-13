/**
 * R1-01 — Tests comportementaux modèle FieldRecensement (Mongo isolé).
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import FieldRecensement, {
  FIELD_RECENSEMENT_SCHEMA_VERSION,
  DECISION_HISTORY_MAX,
} from '../models/fieldRecensementModel.js';

const RECENSEUR_A = new mongoose.Types.ObjectId();
const RECENSEUR_B = new mongoose.Types.ObjectId();
const SERVICE_ID = new mongoose.Types.ObjectId();

function baseDoc(overrides = {}) {
  return {
    clientMutationId: overrides.clientMutationId || '550e8400-e29b-41d4-a716-446655440000',
    recenseur: overrides.recenseur || RECENSEUR_A,
    professionalType: overrides.professionalType || 'prestataire',
    person: {
      nom: 'Kouassi',
      prenoms: 'Awa',
      telephone: '+2250700000099',
      ...(overrides.person || {}),
    },
    business: overrides.business || {
      serviceId: SERVICE_ID,
      description: 'Plomberie',
      devise: 'XOF',
    },
    location: overrides.location || {
      adresse: 'Rue des Jardins',
      commune: 'Cocody',
      latitude: 5.3599,
      longitude: -3.9961,
      accuracyMeters: 12.5,
    },
    consent: overrides.consent || {
      recensementAccepted: true,
      acceptedAt: new Date('2026-09-01T09:59:00.000Z'),
      textVersion: 'ci-fr-2026-09',
      language: 'fr',
    },
    app: overrides.app || {
      version: '1.0.0',
      buildNumber: 12,
      installationId: 'inst-uuid',
    },
    timing: overrides.timing || {
      recordedAt: new Date('2026-09-01T10:00:00.000Z'),
    },
    ...overrides.rest,
  };
}

describe('R1-01 — FieldRecensement model', () => {
  before(async () => {
    await startIsolatedMongo();
    await FieldRecensement.syncIndexes();
  });

  after(async () => {
    await stopIsolatedMongo();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
  });

  it('création prestataire valide + defaults', async () => {
    const doc = await FieldRecensement.create(baseDoc());
    assert.equal(doc.schemaVersion, FIELD_RECENSEMENT_SCHEMA_VERSION);
    assert.equal(doc.revision, 1);
    assert.equal(doc.reviewStatus, 'pending_review');
    assert.equal(doc.publicationStatus, 'not_started');
    assert.ok(doc.timing.serverReceivedAt instanceof Date);
    assert.equal(doc.timing.clockSkewDetected, false);
    assert.equal(doc.matchedUtilisateurId ?? null, null);
    assert.equal(doc.linkedProfile ?? null, null);
  });

  it('création freelance valide', async () => {
    const categoryId = new mongoose.Types.ObjectId();
    const doc = await FieldRecensement.create(
      baseDoc({
        clientMutationId: 'freelance-mut-1',
        professionalType: 'freelance',
        business: {
          displayName: 'Awa Design',
          jobTitle: 'Graphiste',
          categoryId,
          categoryLabel: 'Design',
          skills: ['Photoshop'],
          hourlyRate: 5000,
          devise: 'XOF',
          bio: 'Identité visuelle',
        },
      }),
    );
    assert.equal(doc.professionalType, 'freelance');
    assert.equal(doc.business.displayName, 'Awa Design');
    assert.equal(String(doc.business.categoryId), String(categoryId));
  });

  it('création vendeur valide', async () => {
    const doc = await FieldRecensement.create(
      baseDoc({
        clientMutationId: 'vendeur-mut-1',
        professionalType: 'vendeur',
        business: {
          shopName: 'Boutique Espoir',
          shopDescription: 'Prêt-à-porter',
          businessType: 'Particulier',
          productTypeLabels: ['Robes'],
        },
      }),
    );
    assert.equal(doc.professionalType, 'vendeur');
    assert.equal(doc.business.shopName, 'Boutique Espoir');
  });

  it('type professionnel invalide', async () => {
    await assert.rejects(
      () => FieldRecensement.create(baseDoc({ professionalType: 'inconnu', clientMutationId: 'bad-type' })),
      /professionalType|enum|validation/i,
    );
  });

  it('statut invalide', async () => {
    await assert.rejects(
      () =>
        FieldRecensement.create(
          baseDoc({
            clientMutationId: 'bad-status',
            rest: { reviewStatus: 'hacked' },
          }),
        ),
      /reviewStatus|enum|validation/i,
    );
  });

  it('latitude / longitude / accuracy invalides', async () => {
    await assert.rejects(
      () =>
        FieldRecensement.create(
          baseDoc({
            clientMutationId: 'bad-lat',
            location: { latitude: 99, longitude: 0, commune: 'X' },
          }),
        ),
      /latitude|validation|Path/i,
    );
    await assert.rejects(
      () =>
        FieldRecensement.create(
          baseDoc({
            clientMutationId: 'bad-lng',
            location: { latitude: 0, longitude: -200, commune: 'X' },
          }),
        ),
      /longitude|validation|Path/i,
    );
    await assert.rejects(
      () =>
        FieldRecensement.create(
          baseDoc({
            clientMutationId: 'bad-acc',
            location: { latitude: 0, longitude: 0, accuracyMeters: -1, commune: 'X' },
          }),
        ),
      /accuracyMeters|validation|Path|min/i,
    );
  });

  it('consentement absent ou faux structure', async () => {
    await assert.rejects(
      () =>
        FieldRecensement.create(
          baseDoc({
            clientMutationId: 'no-consent',
            consent: undefined,
            rest: { consent: undefined },
          }),
        ),
      /consent|required|validation/i,
    );
  });

  it('mot de passe interdit dans person', async () => {
    await assert.rejects(
      () =>
        FieldRecensement.create(
          baseDoc({
            clientMutationId: 'pwd',
            person: { password: 'secret' },
          }),
        ),
      /strict|password|not in schema|Path/i,
    );
  });

  it('email @temp.com interdit', async () => {
    await assert.rejects(
      () =>
        FieldRecensement.create(
          baseDoc({
            clientMutationId: 'temp-mail',
            person: { email: 'user@temp.com' },
          }),
        ),
      /temp\.com|validation/i,
    );
  });

  it('champ details refusé', async () => {
    await assert.rejects(
      () =>
        FieldRecensement.create({
          ...baseDoc({ clientMutationId: 'details-ban' }),
          details: { foo: 1 },
        }),
      /strict|details|not in schema/i,
    );
  });

  it('clé arbitraire dans business refusée', async () => {
    await assert.rejects(
      () =>
        FieldRecensement.create(
          baseDoc({
            clientMutationId: 'biz-extra',
            business: { serviceId: SERVICE_ID, evilKey: 'nope' },
          }),
        ),
      /strict|evilKey|not in schema/i,
    );
  });

  it('URL publique KYC refusée ; cld:auth: acceptée', async () => {
    await assert.rejects(
      () =>
        FieldRecensement.create(
          baseDoc({
            clientMutationId: 'kyc-http',
            rest: {
              kyc: {
                status: 'submitted',
                documents: [{ kind: 'cni_recto', ref: 'https://res.cloudinary.com/x/upload/cni.jpg' }],
              },
            },
          }),
        ),
      /cld:auth|invalide|validation/i,
    );

    await assert.rejects(
      () =>
        FieldRecensement.create(
          baseDoc({
            clientMutationId: 'kyc-signed',
            rest: {
              kyc: {
                status: 'submitted',
                documents: [
                  {
                    kind: 'selfie',
                    ref: 'https://res.cloudinary.com/x/image/authenticated/s--sig--/v1/folder/doc',
                  },
                ],
              },
            },
          }),
        ),
      /cld:auth|invalide|validation/i,
    );

    const ok = await FieldRecensement.create(
      baseDoc({
        clientMutationId: 'kyc-ok',
        rest: {
          kyc: {
            status: 'submitted',
            documents: [{ kind: 'cni_recto', ref: 'cld:auth:field/recenseur/kyc/cni' }],
          },
        },
      }),
    );
    const loaded = await FieldRecensement.findById(ok._id).select('+kyc.documents.ref');
    assert.ok(loaded);
    // select nested may vary — reload lean with projection
    const lean = await FieldRecensement.findById(ok._id).select('+kyc.documents.ref').lean();
    assert.equal(lean.kyc.documents[0].ref, 'cld:auth:field/recenseur/kyc/cni');
  });

  it('sérialisation JSON masque internals et refs KYC', async () => {
    const doc = await FieldRecensement.create(
      baseDoc({
        clientMutationId: 'ser-1',
        rest: {
          requestHash: 'abc123hash',
          matchedUtilisateurId: new mongoose.Types.ObjectId(),
          kyc: {
            status: 'submitted',
            documents: [{ kind: 'selfie', ref: 'cld:auth:secret/selfie' }],
          },
          media: {
            profilePhoto: {
              ref: 'cld:auth:secret/photo',
              kind: 'profile_pending_private',
            },
          },
        },
      }),
    );
    const json = doc.toJSON();
    assert.equal(json.requestHash, undefined);
    assert.equal(json.matchedUtilisateurId, undefined);
    assert.equal(json.linkedProfile, undefined);
    assert.ok(!JSON.stringify(json).includes('cld:auth:'));
    assert.equal(json.kyc.documents[0].present, true);
    assert.equal(json.kyc.documents[0].ref, undefined);
  });

  it('même mutation pour deux recenseurs différents OK', async () => {
    const mut = 'shared-mutation-id';
    await FieldRecensement.create(baseDoc({ clientMutationId: mut, recenseur: RECENSEUR_A }));
    await FieldRecensement.create(baseDoc({ clientMutationId: mut, recenseur: RECENSEUR_B }));
    const n = await FieldRecensement.countDocuments({ clientMutationId: mut });
    assert.equal(n, 2);
  });

  it('10 insertions concurrentes → 1 doc + 9 duplicate key', async () => {
    const mut = 'concurrent-mutation-10';
    const payload = baseDoc({ clientMutationId: mut, recenseur: RECENSEUR_A });
    const jobs = Array.from({ length: 10 }, () => FieldRecensement.create({ ...payload, business: { ...payload.business } }));
    const results = await Promise.allSettled(jobs);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    assert.equal(fulfilled.length, 1, `succès=${fulfilled.length}`);
    assert.equal(rejected.length, 9, `rejets=${rejected.length}`);
    for (const r of rejected) {
      const code = r.reason?.code || r.reason?.codeName;
      assert.ok(
        code === 11000 || String(r.reason?.message || '').includes('duplicate'),
        `attendu duplicate key, reçu: ${r.reason}`,
      );
    }
    const count = await FieldRecensement.countDocuments({
      recenseur: RECENSEUR_A,
      clientMutationId: mut,
    });
    assert.equal(count, 1);
  });

  it('index uniques réellement créés', async () => {
    const indexes = await FieldRecensement.collection.indexes();
    const names = indexes.map((i) => i.name);
    assert.ok(names.includes('uniq_recenseur_clientMutationId'));
    assert.ok(names.includes('idx_review_type_created'));
    assert.ok(names.includes('idx_phone_type_review'));
    assert.ok(names.includes('idx_matched_utilisateur'));
    assert.ok(names.includes('idx_linked_profile'));
  });

  it('decisionHistory plafonné sans panne', async () => {
    const entries = Array.from({ length: DECISION_HISTORY_MAX + 5 }, (_, i) => ({
      action: `a${i}`,
      at: new Date(),
    }));
    const doc = await FieldRecensement.create(
      baseDoc({
        clientMutationId: 'hist-cap',
        rest: { decisionHistory: entries },
      }),
    );
    assert.ok(doc.decisionHistory.length <= DECISION_HISTORY_MAX);
  });
});
