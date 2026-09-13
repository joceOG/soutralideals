/**
 * R0-07 — Tests dry-run inventaire KYC (fixtures locales, pas de Mongo/prod).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertDryRunStartup,
  inventoryDocuments,
  INVENTORY_FIELDS,
  redactMongoTarget,
  hashId,
} from '../scripts/audit-legacy-kyc-refs.js';
import { classifyKycStoredValue, countKycRefClasses } from '../utils/kycAccess.js';

describe('R0-07 — classify + inventory fixtures', () => {
  it('classifie les types de refs', () => {
    assert.equal(classifyKycStoredValue('cld:auth:folder/doc'), 'authenticated_ref');
    assert.equal(classifyKycStoredValue('https://res.cloudinary.com/x/image/upload/y.jpg'), 'legacy_http_url');
    assert.equal(classifyKycStoredValue(''), 'missing');
    assert.equal(classifyKycStoredValue(null), 'missing');
    assert.equal(classifyKycStoredValue(42), 'malformed');
    assert.equal(classifyKycStoredValue('not-a-ref'), 'malformed');
  });

  it('inventoryDocuments compte sans exposer les valeurs', () => {
    const docs = [
      { cni1: 'cld:auth:a', cni2: 'https://legacy.example/cni.jpg', selfie: null, attestationAssurance: '' },
      { cni1: 'weird', cni2: undefined, selfie: 'cld:auth:b', attestationAssurance: 'http://x' },
    ];
    const report = inventoryDocuments(docs, INVENTORY_FIELDS.Prestataire);
    assert.equal(report['Prestataire.cni1'].authenticated_ref, 1);
    assert.equal(report['Prestataire.cni1'].malformed, 1);
    assert.equal(report['Prestataire.cni2'].legacy_http_url, 1);
    assert.equal(report['Prestataire.cni2'].missing, 1);
    const serialized = JSON.stringify(report);
    assert.ok(!serialized.includes('https://'));
    assert.ok(!serialized.includes('cld:auth:'));
  });

  it('countKycRefClasses agrège une liste', () => {
    const c = countKycRefClasses(['cld:auth:x', 'http://y', null, 'z']);
    assert.deepEqual(c, {
      authenticated_ref: 1,
      legacy_http_url: 1,
      missing: 1,
      malformed: 1,
    });
  });

  it('hashId tronqué ; redactMongoTarget masque credentials', () => {
    assert.equal(hashId('507f1f77bcf86cd799439601').length, 10);
    const masked = redactMongoTarget('mongodb://user:secret@cluster.example:27017/soutrali');
    assert.ok(!masked.includes('secret'));
    assert.ok(!masked.includes('user'));
    assert.match(masked, /cluster\.example/);
  });
});

describe('R0-07 — démarrage sécurisé script', () => {
  it('refuse sans AUDIT_KYC_CONFIRM', () => {
    assert.throws(
      () => assertDryRunStartup({ env: { MONGO_URL: 'mongodb://localhost/test' }, argv: ['node', 'script'] }),
      /AUDIT_KYC_CONFIRM/,
    );
  });

  it('refuse --apply même avec confirm', () => {
    assert.throws(
      () =>
        assertDryRunStartup({
          env: { MONGO_URL: 'mongodb://localhost/test', AUDIT_KYC_CONFIRM: 'I_UNDERSTAND_READONLY' },
          argv: ['node', 'script', '--apply'],
        }),
      /écriture interdit|Dry-run/i,
    );
  });

  it('accepte dry-run avec confirm + MONGO_URL', () => {
    const s = assertDryRunStartup({
      env: { MONGO_URL: 'mongodb://localhost:27017/testdb', AUDIT_KYC_CONFIRM: 'I_UNDERSTAND_READONLY' },
      argv: ['node', 'script'],
    });
    assert.equal(s.dryRun, true);
    assert.match(s.target, /testdb/);
  });
});
