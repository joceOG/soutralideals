/**
 * R1-15 — Job réconciliation publications Field Recensement V1.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

import {
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import {
  loadFieldRecensementReconciliationConfig,
  injectFieldRecensementReconciliationConfig,
  resetFieldRecensementReconciliationConfig,
  resolveReconciliationExecutionMode,
  RECONCILE_CONFIRM_TOKEN,
} from '../config/fieldRecensementReconciliationConfig.js';
import {
  classifyFieldRecensementForReconciliation,
  RECONCILE_CLASS,
} from '../utils/fieldRecensementReconciliationClassification.js';
import {
  runFieldRecensementReconciliation,
  containUnsafeV1Profile,
} from '../services/fieldRecensementReconciliationService.js';
import FieldRecensement from '../models/fieldRecensementModel.js';
import prestataireModel from '../models/prestataireModel.js';
import {
  acquireFieldRecensementJobLock,
  releaseFieldRecensementJobLock,
} from '../models/fieldRecensementJobLockModel.js';
import { RECONCILIATION_JOB_NAME } from '../config/fieldRecensementReconciliationConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedDossier(overrides = {}) {
  const id = new mongoose.Types.ObjectId();
  const recenseur = new mongoose.Types.ObjectId();
  const doc = {
    _id: id,
    schemaVersion: 1,
    clientMutationId: cryptoRandom(),
    revision: 1,
    recenseur,
    professionalType: 'prestataire',
    reviewStatus: 'approved',
    publicationStatus: 'linking_user',
    ingestionStatus: 'completed',
    person: { nom: 'Ko', telephone: '+2250700222001' },
    business: {
      serviceId: new mongoose.Types.ObjectId(),
      description: 'x'.repeat(20),
      tarifDeclareMin: 1,
      tarifDeclareMax: 2,
    },
    location: { commune: 'Cocody', latitude: 5, longitude: -4 },
    consent: {
      recensementAccepted: true,
      textVersion: 'ci-fr-2026-09',
      acceptedAt: new Date(),
    },
    app: { version: '1', buildNumber: 12, installationId: 'i' },
    timing: { recordedAt: new Date(), serverReceivedAt: new Date(Date.now() - 3600_000) },
    updatedAt: new Date(Date.now() - 3600_000),
    ...overrides,
  };
  await FieldRecensement.collection.insertOne({
    ...doc,
    requestHash: 'b'.repeat(64),
  });
  return FieldRecensement.findById(id)
    .select('+linkedProfile +publicationLock +publicationFenceEpoch +publicationError')
    .lean();
}

function cryptoRandom() {
  return '550e8400-e29b-41d4-a716-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0');
}

describe('R1-15 — gaps pré-impl', () => {
  it('aucun script reconcile historique avant R1-15', () => {
    const scripts = fs.readdirSync(path.join(__dirname, '..', 'scripts'));
    assert.ok(scripts.includes('field-recensement-reconcile.js'));
    assert.ok(scripts.includes('field-recensement-media-gc.js'));
  });

  it('publish service n’auto-répare pas les profils published incohérents', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'fieldRecensementPublishService.js'),
      'utf8',
    );
    assert.ok(!src.includes('runFieldRecensementReconciliation'));
  });
});

describe('R1-15 — configuration', () => {
  after(() => resetFieldRecensementReconciliationConfig());

  it('absent → disabled + dry-run', () => {
    const cfg = loadFieldRecensementReconciliationConfig({});
    assert.equal(cfg.enabled, false);
    assert.equal(cfg.dryRun, true);
    assert.equal(cfg.allowExecute, false);
  });

  it('false strict (pas Boolean)', () => {
    const cfg = loadFieldRecensementReconciliationConfig({
      FIELD_RECENSEMENT_RECONCILER_ENABLED: 'false',
      FIELD_RECENSEMENT_RECONCILER_DRY_RUN: 'false',
    });
    assert.equal(cfg.enabled, false);
  });

  it('stale invalide → pas execute', () => {
    const cfg = loadFieldRecensementReconciliationConfig({
      FIELD_RECENSEMENT_RECONCILER_ENABLED: 'true',
      FIELD_RECENSEMENT_RECONCILER_DRY_RUN: 'false',
      FIELD_RECENSEMENT_RECONCILER_STALE_AFTER_MINUTES: '0',
      FIELD_RECENSEMENT_RECONCILER_BATCH_SIZE: '100',
      FIELD_RECENSEMENT_RECONCILER_LEASE_MS: '120000',
      FIELD_RECENSEMENT_RECONCILER_MAX_ATTEMPTS: '8',
    });
    assert.ok(cfg.configError);
    assert.equal(cfg.allowExecute, false);
  });

  it('execute sans confirm → dry-run', () => {
    injectFieldRecensementReconciliationConfig({
      enabled: true,
      dryRun: false,
      staleAfterMinutes: 15,
      batchSize: 100,
      leaseMs: 120000,
      maxAttempts: 8,
      allowExecute: true,
    });
    const m = resolveReconciliationExecutionMode({ execute: true });
    assert.equal(m.canMutate, false);
  });

  it('gates OK → execute', () => {
    injectFieldRecensementReconciliationConfig({
      enabled: true,
      dryRun: false,
      staleAfterMinutes: 15,
      batchSize: 100,
      leaseMs: 120000,
      maxAttempts: 8,
      allowExecute: true,
    });
    const m = resolveReconciliationExecutionMode({
      execute: true,
      confirm: RECONCILE_CONFIRM_TOKEN,
    });
    assert.equal(m.mode, 'execute');
    assert.equal(m.canMutate, true);
  });
});

describe('R1-15 — classification', () => {
  const base = {
    _id: new mongoose.Types.ObjectId(),
    reviewStatus: 'approved',
    publicationStatus: 'published',
    professionalType: 'prestataire',
    linkedProfile: { type: 'prestataire', id: new mongoose.Types.ObjectId() },
    updatedAt: new Date(Date.now() - 3600_000),
  };

  it('consistent', () => {
    const r = classifyFieldRecensementForReconciliation({
      dossier: base,
      profile: {
        source: 'field_recensement_v1',
        sourceFieldRecensementId: base._id,
        fieldPublicationStatus: 'published',
      },
    });
    assert.equal(r.class, RECONCILE_CLASS.CONSISTENT);
  });

  it('too_recent', () => {
    const r = classifyFieldRecensementForReconciliation({
      dossier: {
        ...base,
        publicationStatus: 'linking_user',
        updatedAt: new Date(),
        timing: { serverReceivedAt: new Date() },
      },
      staleAfterMinutes: 15,
    });
    assert.equal(r.class, RECONCILE_CLASS.TOO_RECENT);
  });

  it('active_operation', () => {
    const r = classifyFieldRecensementForReconciliation({
      dossier: {
        ...base,
        publicationStatus: 'linking_user',
        publicationLock: { expiresAt: new Date(Date.now() + 60_000) },
        updatedAt: new Date(Date.now() - 3600_000),
      },
    });
    assert.equal(r.class, RECONCILE_CLASS.ACTIVE_OPERATION);
  });

  it('recoverable_publish', () => {
    const r = classifyFieldRecensementForReconciliation({
      dossier: {
        ...base,
        publicationStatus: 'ready',
        updatedAt: new Date(Date.now() - 3600_000),
      },
      staleAfterMinutes: 1,
    });
    assert.equal(r.class, RECONCILE_CLASS.RECOVERABLE_PUBLISH);
  });

  it('unsafe_visible pending_review', () => {
    const r = classifyFieldRecensementForReconciliation({
      dossier: { ...base, reviewStatus: 'pending_review', publicationStatus: 'not_started' },
      profile: {
        source: 'field_recensement_v1',
        sourceFieldRecensementId: base._id,
        fieldPublicationStatus: 'published',
      },
    });
    assert.equal(r.class, RECONCILE_CLASS.UNSAFE_VISIBLE);
  });

  it('unsafe_visible suspended', () => {
    const r = classifyFieldRecensementForReconciliation({
      dossier: { ...base, reviewStatus: 'suspended', publicationStatus: 'suspended' },
      profile: {
        source: 'field_recensement_v1',
        sourceFieldRecensementId: base._id,
        fieldPublicationStatus: 'published',
      },
    });
    assert.equal(r.class, RECONCILE_CLASS.UNSAFE_VISIBLE);
  });

  it('manual_review linked type mismatch', () => {
    const r = classifyFieldRecensementForReconciliation({
      dossier: {
        ...base,
        linkedProfile: { type: 'vendeur', id: new mongoose.Types.ObjectId() },
      },
      profile: {
        source: 'field_recensement_v1',
        sourceFieldRecensementId: base._id,
        fieldPublicationStatus: 'ready',
      },
    });
    assert.equal(r.class, RECONCILE_CLASS.MANUAL_REVIEW_REQUIRED);
  });

  it('max_attempts_reached', () => {
    const r = classifyFieldRecensementForReconciliation({
      dossier: {
        ...base,
        publicationStatus: 'failed',
        publicationLock: { attempts: 99 },
        updatedAt: new Date(Date.now() - 3600_000),
      },
      maxAttempts: 8,
      staleAfterMinutes: 1,
    });
    assert.equal(r.class, RECONCILE_CLASS.MAX_ATTEMPTS_REACHED);
  });

  it('legacy profile → unknown_protected', () => {
    const r = classifyFieldRecensementForReconciliation({
      dossier: { ...base, reviewStatus: 'pending_review', publicationStatus: 'not_started' },
      profile: {
        source: 'sdealsmobile',
        fieldPublicationStatus: 'published',
      },
    });
    assert.equal(r.class, RECONCILE_CLASS.UNKNOWN_PROTECTED);
  });

  it('recoverable_suspension align', () => {
    const r = classifyFieldRecensementForReconciliation({
      dossier: { ...base, reviewStatus: 'suspended', publicationStatus: 'suspended' },
      profile: {
        source: 'field_recensement_v1',
        sourceFieldRecensementId: base._id,
        fieldPublicationStatus: 'ready',
      },
    });
    assert.equal(r.class, RECONCILE_CLASS.RECOVERABLE_SUSPENSION);
  });

  it('unknown default', () => {
    const r = classifyFieldRecensementForReconciliation({
      dossier: {
        _id: new mongoose.Types.ObjectId(),
        reviewStatus: 'approved',
        publicationStatus: 'published',
        professionalType: 'prestataire',
      },
    });
    assert.equal(r.class, RECONCILE_CLASS.MANUAL_REVIEW_REQUIRED);
  });
});

describe('R1-15 — intégration mock', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_CLOUDINARY_MOCK = '1';
    await startIsolatedMongo();
  });

  after(async () => {
    await stopIsolatedMongo();
    resetFieldRecensementReconciliationConfig();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    injectFieldRecensementReconciliationConfig({
      enabled: true,
      dryRun: true,
      staleAfterMinutes: 1,
      batchSize: 50,
      leaseMs: 120000,
      maxAttempts: 8,
      allowExecute: false,
    });
  });

  it('dry-run : unsafe visible détecté sans mutation', async () => {
    const dossier = await seedDossier({
      reviewStatus: 'suspended',
      publicationStatus: 'suspended',
    });
    const profileId = new mongoose.Types.ObjectId();
    await prestataireModel.collection.insertOne({
      _id: profileId,
      source: 'field_recensement_v1',
      sourceFieldRecensementId: dossier._id,
      fieldPublicationStatus: 'published',
      fieldPublicationEpoch: 0,
      status: 'active',
      nom: 'X',
      telephone: '+2250700222111',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await FieldRecensement.collection.updateOne(
      { _id: dossier._id },
      {
        $set: {
          linkedProfile: { type: 'prestataire', id: profileId },
        },
      },
    );

    let cacheCalls = 0;
    const report = await runFieldRecensementReconciliation({
      cli: {},
      invalidate: () => {
        cacheCalls += 1;
      },
      revoke: async () => {
        throw new Error('no cloudinary');
      },
    });
    assert.ok(report.unsafeVisible >= 1);
    assert.ok(report.wouldContain >= 1);
    assert.equal(report.contained, 0);
    assert.equal(cacheCalls, 0);
    assert.equal(report.cloudinaryMutations, 0);
    const p = await prestataireModel.collection.findOne({ _id: profileId });
    assert.equal(p.fieldPublicationStatus, 'published');
  });

  it('execute containment : masque profil dangereux', async () => {
    injectFieldRecensementReconciliationConfig({
      enabled: true,
      dryRun: false,
      staleAfterMinutes: 1,
      batchSize: 50,
      leaseMs: 120000,
      maxAttempts: 8,
      allowExecute: true,
    });
    const dossier = await seedDossier({
      reviewStatus: 'rejected',
      publicationStatus: 'not_started',
    });
    const profileId = new mongoose.Types.ObjectId();
    await prestataireModel.collection.insertOne({
      _id: profileId,
      source: 'field_recensement_v1',
      sourceFieldRecensementId: dossier._id,
      fieldPublicationStatus: 'published',
      fieldPublicationEpoch: 0,
      status: 'active',
      nom: 'Y',
      telephone: '+2250700222333',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await FieldRecensement.collection.updateOne(
      { _id: dossier._id },
      { $set: { linkedProfile: { type: 'prestataire', id: profileId } } },
    );

    let cacheCalls = 0;
    const report = await runFieldRecensementReconciliation({
      cli: { execute: true, confirm: RECONCILE_CONFIRM_TOKEN },
      invalidate: () => {
        cacheCalls += 1;
      },
    });
    assert.ok(report.contained >= 1);
    assert.ok(cacheCalls >= 1);
    const p = await prestataireModel.collection.findOne({ _id: profileId });
    assert.equal(p.fieldPublicationStatus, 'suspended');
  });

  it('deux jobs : un seul lock', async () => {
    const a = await acquireFieldRecensementJobLock({
      jobName: RECONCILIATION_JOB_NAME,
      ownerId: 'r1',
    });
    assert.equal(a.acquired, true);
    const b = await acquireFieldRecensementJobLock({
      jobName: RECONCILIATION_JOB_NAME,
      ownerId: 'r2',
    });
    assert.equal(b.acquired, false);
    await releaseFieldRecensementJobLock({
      jobName: RECONCILIATION_JOB_NAME,
      attemptId: a.attemptId,
    });
  });

  it('état trop récent ignoré', async () => {
    await seedDossier({
      reviewStatus: 'approved',
      publicationStatus: 'linking_user',
      updatedAt: new Date(),
      timing: { recordedAt: new Date(), serverReceivedAt: new Date() },
    });
    injectFieldRecensementReconciliationConfig({
      enabled: true,
      dryRun: true,
      staleAfterMinutes: 30,
      batchSize: 50,
      leaseMs: 120000,
      maxAttempts: 8,
      allowExecute: false,
    });
    const report = await runFieldRecensementReconciliation({ cli: {} });
    assert.ok(report.tooRecent >= 1);
    assert.equal(report.wouldResume, 0);
  });

  it('legacy profile non muté', async () => {
    injectFieldRecensementReconciliationConfig({
      enabled: true,
      dryRun: false,
      staleAfterMinutes: 1,
      batchSize: 50,
      leaseMs: 120000,
      maxAttempts: 8,
      allowExecute: true,
    });
    const dossier = await seedDossier({
      reviewStatus: 'pending_review',
      publicationStatus: 'not_started',
    });
    const profileId = new mongoose.Types.ObjectId();
    await prestataireModel.collection.insertOne({
      _id: profileId,
      source: 'sdealsmobile',
      fieldPublicationStatus: 'published',
      status: 'active',
      nom: 'Legacy',
      telephone: '+2250700222444',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await FieldRecensement.collection.updateOne(
      { _id: dossier._id },
      { $set: { linkedProfile: { type: 'prestataire', id: profileId } } },
    );
    await runFieldRecensementReconciliation({
      cli: { execute: true, confirm: RECONCILE_CONFIRM_TOKEN },
    });
    const p = await prestataireModel.collection.findOne({ _id: profileId });
    assert.equal(p.fieldPublicationStatus, 'published');
  });

  it('contain helper dry-run', async () => {
    const r = await containUnsafeV1Profile({
      dossier: {
        _id: new mongoose.Types.ObjectId(),
        reviewStatus: 'suspended',
        professionalType: 'prestataire',
        publicationFenceEpoch: 0,
      },
      profile: {
        _id: new mongoose.Types.ObjectId(),
        source: 'field_recensement_v1',
        fieldPublicationStatus: 'published',
      },
      canMutate: false,
    });
    assert.equal(r.wouldContain, true);
    assert.equal(r.applied, false);
  });

  it('batch maximum respecté', async () => {
    for (let i = 0; i < 5; i++) {
      await seedDossier({
        reviewStatus: 'approved',
        publicationStatus: 'linking_user',
        clientMutationId: cryptoRandom(),
        person: { nom: 'Ko', telephone: `+2250700222${100 + i}` },
      });
    }
    const report = await runFieldRecensementReconciliation({
      cli: {},
      maxDocs: 2,
    });
    assert.equal(report.scanned, 2);
  });
});
