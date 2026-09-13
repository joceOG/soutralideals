/**
 * Contrat adaptateur Cloudinary FieldRecensement (pas d’appel réseau réel).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeterministicProfilePublicId,
  buildPromoteUploadOptions,
  buildRevokeDestroyOptions,
  promoteAuthenticatedToPublic,
  revokePublicDerivative,
  stripAuthPrefix,
} from '../utils/fieldRecensementMediaAdapter.js';

describe('R1-09/R1-08B — fieldRecensementMediaAdapter contrat', () => {
  it('public_id déterministe + strip cld:auth:', () => {
    assert.equal(
      buildDeterministicProfilePublicId('freelance', 'abc'),
      'profiles/freelance/abc/main',
    );
    assert.equal(stripAuthPrefix('cld:auth:field/x'), 'field/x');
  });

  it('options promote : type upload, overwrite, invalidate + tags V1', () => {
    const opts = buildPromoteUploadOptions('profiles/vendeur/507f1f77bcf86cd799439011/main');
    assert.equal(opts.public_id, 'profiles/vendeur/507f1f77bcf86cd799439011/main');
    assert.equal(opts.type, 'upload');
    assert.equal(opts.overwrite, true);
    assert.equal(opts.invalidate, true);
    assert.equal(opts.resource_type, 'image');
    assert.ok(Array.isArray(opts.tags));
  });

  it('options revoke : type upload + invalidate', () => {
    const opts = buildRevokeDestroyOptions();
    assert.equal(opts.type, 'upload');
    assert.equal(opts.invalidate, true);
  });

  it('mock promote : pas d’uploader ; URL test déterministe', async () => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_CLOUDINARY_MOCK = '1';
    delete process.env.TEST_CLOUDINARY_FAIL;
    const r = await promoteAuthenticatedToPublic({
      sourcePublicId: 'cld:auth:field/x',
      targetPublicId: 'profiles/prestataire/p1/main',
      uploader: {
        upload() {
          throw new Error('ne doit pas être appelé');
        },
      },
    });
    assert.equal(r.mocked, true);
    assert.equal(r.secureUrl, 'https://res.cloudinary.com/test/image/upload/profiles/prestataire/p1/main');
  });

  it('production path : upload(signedUrl, opts) — jamais URL demo fictive', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete process.env.TEST_CLOUDINARY_MOCK;
    let capturedUrl;
    let capturedOpts;
    const r = await promoteAuthenticatedToPublic({
      sourcePublicId: 'field/private/x',
      targetPublicId: 'profiles/freelance/f1/main',
      urlBuilder: () => 'https://signed.example/auth-asset',
      uploader: {
        async upload(url, opts) {
          capturedUrl = url;
          capturedOpts = opts;
          return {
            secure_url: 'https://res.cloudinary.com/real/image/upload/profiles/freelance/f1/main',
            public_id: 'profiles/freelance/f1/main',
          };
        },
      },
    });
    assert.equal(capturedUrl, 'https://signed.example/auth-asset');
    assert.equal(capturedOpts.type, 'upload');
    assert.equal(capturedOpts.public_id, 'profiles/freelance/f1/main');
    assert.equal(r.mocked, false);
    assert.ok(!String(r.secureUrl).includes('/demo/'));
    process.env.NODE_ENV = prev;
    process.env.TEST_CLOUDINARY_MOCK = '1';
  });

  it('production sans secure_url → erreur retryable (pas de fallback fictif)', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete process.env.TEST_CLOUDINARY_MOCK;
    await assert.rejects(
      () =>
        promoteAuthenticatedToPublic({
          sourcePublicId: 'field/x',
          targetPublicId: 'profiles/vendeur/v1/main',
          urlBuilder: () => 'https://signed.example/x',
          uploader: { async upload() { return {}; } },
        }),
      (e) => e.retryable === true && e.code === 'RECENSEMENT_PUBLICATION_TEMPORARY_FAILURE',
    );
    process.env.NODE_ENV = prev;
    process.env.TEST_CLOUDINARY_MOCK = '1';
  });

  it('revoke mock OK ; skip refs auth', async () => {
    process.env.NODE_ENV = 'test';
    const skip = await revokePublicDerivative({ publicId: 'cld:auth:field/x' });
    assert.equal(skip.skipped, true);
    const ok = await revokePublicDerivative({ publicId: 'profiles/freelance/f1/main' });
    assert.equal(ok.revoked, true);
  });
});
