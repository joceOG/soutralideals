/**
 * R0-08 — Tests sécurité + smoke du harness Mongo isolé.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  assertSafeTestMongoUri,
  assertDestructiveOpsAllowed,
  startIsolatedMongo,
  clearIsolatedMongo,
  stopIsolatedMongo,
} from './helpers/mongoTestHarness.js';

describe('R0-08 — garde-fous URI (sans connexion)', () => {
  it('refuse URI Atlas mongodb.net', () => {
    assert.throws(
      () =>
        assertSafeTestMongoUri('mongodb+srv://u:p@cluster0.abc.mongodb.net/soutrali', {
          nodeEnv: 'test',
        }),
      /Atlas|mongodb\.net/i,
    );
  });

  it('refuse hôte distant', () => {
    assert.throws(
      () => assertSafeTestMongoUri('mongodb://db.example.com:27017/sdeals_test_x', { nodeEnv: 'test' }),
      /distant|refusé/i,
    );
  });

  it('refuse base sans préfixe sdeals_test_', () => {
    assert.throws(
      () => assertSafeTestMongoUri('mongodb://127.0.0.1:27017/soutralideals', { nodeEnv: 'test' }),
      /sdeals_test_/,
    );
  });

  it('refuse URI vide (pas de fallback prod)', () => {
    assert.throws(() => assertSafeTestMongoUri('', { nodeEnv: 'test' }), /URI vide|fallback/i);
    assert.throws(() => assertSafeTestMongoUri(null, { nodeEnv: 'test' }), /URI vide|fallback/i);
  });

  it('refuse si NODE_ENV n’est pas test', () => {
    assert.throws(
      () => assertSafeTestMongoUri('mongodb://127.0.0.1:27017/sdeals_test_ok', { nodeEnv: 'production' }),
      /NODE_ENV/,
    );
  });

  it('accepte URI locale sdeals_test_*', () => {
    const r = assertSafeTestMongoUri('mongodb://127.0.0.1:27017/sdeals_test_ephemeral', {
      nodeEnv: 'test',
    });
    assert.equal(r.dbName, 'sdeals_test_ephemeral');
  });
});

describe('R0-08 — smoke harness isolé', () => {
  before(async () => {
    await startIsolatedMongo();
  });

  after(async () => {
    await stopIsolatedMongo();
  });

  it('insert / read / clear / disparition', async () => {
    const col = mongoose.connection.collection('harness_smoke_only');
    await col.insertOne({ marker: 'r0-08', n: 1 });
    const found = await col.findOne({ marker: 'r0-08' });
    assert.ok(found);
    assert.equal(found.n, 1);

    await clearIsolatedMongo();
    const after = await col.findOne({ marker: 'r0-08' });
    assert.equal(after, null);
  });

  it('assertDestructiveOpsAllowed OK sur base isolée', () => {
    assert.equal(assertDestructiveOpsAllowed(mongoose.connection), true);
  });
});
