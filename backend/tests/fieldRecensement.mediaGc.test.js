/**
 * R1-12 — GC médias Field Recensement V1 (mock Cloudinary uniquement).
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
  loadFieldRecensementMediaGcConfig,
  injectFieldRecensementMediaGcConfig,
  resetFieldRecensementMediaGcConfig,
  resolveMediaGcExecutionMode,
  MEDIA_GC_CONFIRM_TOKEN,
  MEDIA_GC_MIN_ORPHAN_TTL_HOURS,
} from '../config/fieldRecensementMediaGcConfig.js';
import {
  classifyFieldMediaAsset,
  FIELD_MEDIA_CLASS,
  FIELD_MEDIA_TAGS,
  buildFieldMediaCloudinaryOptions,
} from '../utils/fieldRecensementMediaClassification.js';
import { runFieldRecensementMediaGc } from '../services/fieldRecensementMediaGcService.js';
import FieldRecensementMediaGcCandidate from '../models/fieldRecensementMediaGcCandidateModel.js';
import FieldRecensement from '../models/fieldRecensementModel.js';
import {
  acquireFieldRecensementJobLock,
  MEDIA_GC_JOB_NAME,
} from '../models/fieldRecensementJobLockModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function managedPrivateAsset(publicId, createdAt) {
  return {
    public_id: publicId,
    type: 'authenticated',
    resource_type: 'image',
    tags: [...FIELD_MEDIA_TAGS],
    context: {
      custom: {
        schemaVersion: '1',
        mediaKind: 'profile_pending_private',
        fieldRecensementId: '507f1f77bcf86cd799439011',
      },
    },
    created_at: createdAt.toISOString(),
  };
}

function makeLister(pages) {
  let i = 0;
  return async ({ type }) => {
    const page = pages[type]?.[i] || { resources: [], next_cursor: undefined };
    // advance only for authenticated to simulate multi-page when both called
    if (type === 'authenticated') i += 1;
    return page;
  };
}

describe('R1-12 — gaps pré-impl (pas de GC automatique)', () => {
  it('aucun job/script GC historique ne nettoie les orphelins', () => {
    const scriptsDir = path.join(__dirname, '..', 'scripts');
    const names = fs.readdirSync(scriptsDir);
    // Le script R1-12 existe désormais ; avant R1-12 seul audit KYC dry-run existait
    assert.ok(names.includes('audit-legacy-kyc-refs.js'));
    assert.ok(
      names.includes('field-recensement-media-gc.js'),
      'script GC R1-12 doit exister',
    );
  });

  it('scheduleDestroy correction est noop en test (ancien média peut rester)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'fieldRecensementCorrectionService.js'),
      'utf8',
    );
    assert.match(src, /NODE_ENV === 'test'/);
    assert.match(src, /scheduleDestroy/);
  });
});

describe('R1-12 — configuration fail-closed', () => {
  after(() => resetFieldRecensementMediaGcConfig());

  it('flag absent → enabled false ; dry-run absent → true', () => {
    const cfg = loadFieldRecensementMediaGcConfig({});
    assert.equal(cfg.enabled, false);
    assert.equal(cfg.dryRun, true);
    assert.equal(cfg.allowExecute, false);
  });

  it('Boolean("false") ne doit pas activer', () => {
    const cfg = loadFieldRecensementMediaGcConfig({
      FIELD_RECENSEMENT_MEDIA_GC_ENABLED: 'false',
      FIELD_RECENSEMENT_MEDIA_GC_DRY_RUN: 'false',
    });
    assert.equal(cfg.enabled, false);
  });

  it('TTL trop court → configError / pas execute', () => {
    const cfg = loadFieldRecensementMediaGcConfig({
      FIELD_RECENSEMENT_MEDIA_GC_ENABLED: 'true',
      FIELD_RECENSEMENT_MEDIA_GC_DRY_RUN: 'false',
      FIELD_RECENSEMENT_MEDIA_GC_ORPHAN_TTL_HOURS: String(MEDIA_GC_MIN_ORPHAN_TTL_HOURS - 1),
      FIELD_RECENSEMENT_MEDIA_GC_QUARANTINE_HOURS: '24',
      FIELD_RECENSEMENT_MEDIA_GC_BATCH_SIZE: '100',
    });
    assert.ok(cfg.configError);
    assert.equal(cfg.allowExecute, false);
  });

  it('execute sans confirmation → dry-run', () => {
    injectFieldRecensementMediaGcConfig({
      enabled: true,
      dryRun: false,
      orphanTtlHours: 72,
      quarantineHours: 24,
      batchSize: 100,
      allowExecute: true,
    });
    const m = resolveMediaGcExecutionMode({ execute: true });
    assert.equal(m.canDestroy, false);
    assert.equal(m.reason, 'CONFIRM_REQUIRED');
  });

  it('toutes conditions valides → execute', () => {
    injectFieldRecensementMediaGcConfig({
      enabled: true,
      dryRun: false,
      orphanTtlHours: 72,
      quarantineHours: 24,
      batchSize: 100,
      allowExecute: true,
    });
    const m = resolveMediaGcExecutionMode({
      execute: true,
      confirm: MEDIA_GC_CONFIRM_TOKEN,
    });
    assert.equal(m.mode, 'execute');
    assert.equal(m.canDestroy, true);
  });
});

describe('R1-12 — classification', () => {
  it('privé V1 géré', () => {
    const r = classifyFieldMediaAsset({
      publicId: 'field/abc123',
      deliveryType: 'authenticated',
      tags: FIELD_MEDIA_TAGS,
      context: 'schemaVersion=1|mediaKind=profile_pending_private',
    });
    assert.equal(r.class, FIELD_MEDIA_CLASS.MANAGED_FIELD_PRIVATE);
  });

  it('public V1 géré', () => {
    const id = 'profiles/prestataire/507f1f77bcf86cd799439011/main';
    const r = classifyFieldMediaAsset({
      publicId: id,
      deliveryType: 'upload',
      tags: FIELD_MEDIA_TAGS,
      context: { schemaVersion: '1', mediaKind: 'profile_public' },
    });
    assert.equal(r.class, FIELD_MEDIA_CLASS.MANAGED_FIELD_PUBLIC);
  });

  it('KYC protégé', () => {
    const r = classifyFieldMediaAsset({
      publicId: 'prestataires/cni/xyz',
      deliveryType: 'authenticated',
      tags: FIELD_MEDIA_TAGS,
      context: 'schemaVersion=1|mediaKind=profile_pending_private',
    });
    assert.equal(r.class, FIELD_MEDIA_CLASS.KYC_PROTECTED);
  });

  it('préfixe field sans tags → legacy_protected', () => {
    const r = classifyFieldMediaAsset({
      publicId: 'field/olduntagged',
      deliveryType: 'authenticated',
      tags: [],
    });
    assert.equal(r.class, FIELD_MEDIA_CLASS.LEGACY_PROTECTED);
  });

  it('inconnu → unknown_protected', () => {
    const r = classifyFieldMediaAsset({
      publicId: 'users/avatar',
      deliveryType: 'upload',
    });
    assert.equal(r.class, FIELD_MEDIA_CLASS.UNKNOWN_PROTECTED);
  });

  it('options upload Field sans PII', () => {
    const opts = buildFieldMediaCloudinaryOptions({
      publicId: 'field/x',
      mediaKind: 'profile_pending_private',
      fieldRecensementId: '507f1f77bcf86cd799439011',
      uploadSessionId: 'sess',
    });
    assert.deepEqual(opts.tags, [...FIELD_MEDIA_TAGS]);
    assert.ok(!/telephone|email|nom|gps/i.test(opts.context));
  });
});

describe('R1-12 — GC mock intégration', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_CLOUDINARY_MOCK = '1';
    await startIsolatedMongo();
  });

  after(async () => {
    await stopIsolatedMongo();
    resetFieldRecensementMediaGcConfig();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    injectFieldRecensementMediaGcConfig({
      enabled: true,
      dryRun: true,
      orphanTtlHours: 72,
      quarantineHours: 24,
      batchSize: 100,
      allowExecute: false,
      configError: null,
    });
  });

  it('dry-run : candidat quarantaine, 0 destroy, 0 dossier/profil', async () => {
    const old = new Date(Date.now() - 100 * 3600_000);
    const destroyCalls = [];
    const listByTag = async ({ type }) => {
      if (type !== 'authenticated') return { resources: [] };
      return {
        resources: [managedPrivateAsset('field/orphan1', old)],
        next_cursor: undefined,
      };
    };
    const report = await runFieldRecensementMediaGc({
      listByTag,
      destroyAsset: async (a) => {
        destroyCalls.push(a);
        return { result: 'ok' };
      },
      cli: {},
    });
    assert.equal(report.destroyCalls, 0);
    assert.equal(destroyCalls.length, 0);
    assert.ok(report.quarantined >= 1);
    assert.equal(await FieldRecensement.countDocuments(), 0);
    const c = await FieldRecensementMediaGcCandidate.findOne({ publicId: 'field/orphan1' });
    assert.equal(c.status, 'quarantined');
  });

  it('deuxième scan trop tôt → pas eligible', async () => {
    const old = new Date(Date.now() - 100 * 3600_000);
    const listByTag = async ({ type }) =>
      type === 'authenticated'
        ? { resources: [managedPrivateAsset('field/orphan2', old)] }
        : { resources: [] };
    await runFieldRecensementMediaGc({ listByTag, destroyAsset: async () => ({ result: 'ok' }) });
    const r2 = await runFieldRecensementMediaGc({
      listByTag,
      destroyAsset: async () => ({ result: 'ok' }),
      now: new Date(Date.now() + 1000),
    });
    assert.equal(r2.wouldDelete, 0);
    assert.equal(r2.deleted, 0);
    const c = await FieldRecensementMediaGcCandidate.findOne({ publicId: 'field/orphan2' });
    assert.equal(c.status, 'quarantined');
  });

  it('après quarantaine + dry-run → wouldDelete, pas destroy', async () => {
    const old = new Date(Date.now() - 200 * 3600_000);
    const listByTag = async ({ type }) =>
      type === 'authenticated'
        ? { resources: [managedPrivateAsset('field/orphan3', old)] }
        : { resources: [] };
    const destroyCalls = [];
    await runFieldRecensementMediaGc({ listByTag, destroyAsset: async () => ({ result: 'ok' }) });
    const c = await FieldRecensementMediaGcCandidate.findOne({ publicId: 'field/orphan3' });
    c.eligibleAfter = new Date(Date.now() - 1000);
    await c.save();
    const r2 = await runFieldRecensementMediaGc({
      listByTag,
      destroyAsset: async (a) => {
        destroyCalls.push(a);
        return { result: 'ok' };
      },
      cli: {},
    });
    assert.ok(r2.wouldDelete >= 1);
    assert.equal(destroyCalls.length, 0);
  });

  it('référence Mongo apparue → retained', async () => {
    const old = new Date(Date.now() - 200 * 3600_000);
    const publicId = 'field/active1';
    await FieldRecensement.create({
      schemaVersion: 1,
      clientMutationId: '550e8400-e29b-41d4-a716-446655440099',
      revision: 1,
      recenseur: new mongoose.Types.ObjectId(),
      professionalType: 'prestataire',
      reviewStatus: 'pending_review',
      publicationStatus: 'not_started',
      ingestionStatus: 'completed',
      person: { nom: 'Ko', telephone: '+2250700111222' },
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
      timing: { recordedAt: new Date(), serverReceivedAt: new Date() },
      media: {
        profilePhoto: {
          ref: `cld:auth:${publicId}`,
          publicId,
          kind: 'profile_pending_private',
        },
      },
    });
    await FieldRecensement.collection.updateOne(
      { 'media.profilePhoto.publicId': publicId },
      { $set: { requestHash: 'a'.repeat(64) } },
    );

    const listByTag = async ({ type }) =>
      type === 'authenticated'
        ? { resources: [managedPrivateAsset(publicId, old)] }
        : { resources: [] };
    const r = await runFieldRecensementMediaGc({
      listByTag,
      destroyAsset: async () => ({ result: 'ok' }),
    });
    assert.ok(r.protected >= 1);
    assert.equal(await FieldRecensement.countDocuments(), 1);
  });

  it('execute mock : destroy authenticated + not found idempotent', async () => {
    injectFieldRecensementMediaGcConfig({
      enabled: true,
      dryRun: false,
      orphanTtlHours: 72,
      quarantineHours: 24,
      batchSize: 50,
      allowExecute: true,
    });
    const old = new Date(Date.now() - 200 * 3600_000);
    const listByTag = async ({ type }) =>
      type === 'authenticated'
        ? { resources: [managedPrivateAsset('field/del1', old)] }
        : { resources: [] };
    await runFieldRecensementMediaGc({ listByTag, destroyAsset: async () => ({ result: 'ok' }) });
    const c = await FieldRecensementMediaGcCandidate.findOne({ publicId: 'field/del1' });
    c.eligibleAfter = new Date(Date.now() - 1000);
    await c.save();

    const calls = [];
    const r = await runFieldRecensementMediaGc({
      listByTag,
      destroyAsset: async (a) => {
        calls.push(a);
        return { result: 'not found' };
      },
      cli: { execute: true, confirm: MEDIA_GC_CONFIRM_TOKEN },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].type, 'authenticated');
    assert.equal(calls[0].publicId, 'field/del1');
    assert.equal(r.deleted, 1);
    assert.equal(r.destroyCalls, 1);
    const c2 = await FieldRecensementMediaGcCandidate.findOne({ publicId: 'field/del1' });
    assert.equal(c2.status, 'deleted');
  });

  it('deux workers : un seul lock', async () => {
    const lock1 = await acquireFieldRecensementJobLock({
      jobName: MEDIA_GC_JOB_NAME,
      ownerId: 'w1',
    });
    assert.equal(lock1.acquired, true);
    const lock2 = await acquireFieldRecensementJobLock({
      jobName: MEDIA_GC_JOB_NAME,
      ownerId: 'w2',
    });
    assert.equal(lock2.acquired, false);
  });

  it('pagination Cloudinary multi-pages', async () => {
    const old = new Date(Date.now() - 200 * 3600_000);
    let page = 0;
    const listByTag = async ({ type }) => {
      if (type !== 'authenticated') return { resources: [] };
      page += 1;
      if (page === 1) {
        return {
          resources: [managedPrivateAsset('field/p1', old)],
          next_cursor: 'cursor-2',
        };
      }
      return {
        resources: [managedPrivateAsset('field/p2', old)],
        next_cursor: undefined,
      };
    };
    const r = await runFieldRecensementMediaGc({
      listByTag,
      destroyAsset: async () => ({ result: 'ok' }),
    });
    assert.ok(r.scanned >= 2);
  });

  it('asset sans tags non détruit même en execute', async () => {
    injectFieldRecensementMediaGcConfig({
      enabled: true,
      dryRun: false,
      orphanTtlHours: 72,
      quarantineHours: 1,
      batchSize: 50,
      allowExecute: true,
    });
    const old = new Date(Date.now() - 200 * 3600_000);
    const destroyCalls = [];
    const listByTag = async ({ type }) =>
      type === 'authenticated'
        ? {
            resources: [
              {
                public_id: 'field/untagged',
                type: 'authenticated',
                resource_type: 'image',
                tags: [],
                created_at: old.toISOString(),
              },
            ],
          }
        : { resources: [] };
    await runFieldRecensementMediaGc({
      listByTag,
      destroyAsset: async (a) => {
        destroyCalls.push(a);
        return { result: 'ok' };
      },
      cli: { execute: true, confirm: MEDIA_GC_CONFIRM_TOKEN },
    });
    assert.equal(destroyCalls.length, 0);
  });
});
