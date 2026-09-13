/**
 * R0-05 — Tests comportementaux pipelines KYC (CREATE vs UPDATE).
 * Mock Cloudinary uniquement ; contrôleurs / helpers réels.
 * IMPORTANT : exécuter AVANT le correctif R0-06 pour constater les échecs UPDATE.
 */
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cloudinary from 'cloudinary';

import {
  uploadKycToCloudinary,
  CLD_AUTH_PREFIX,
  isCloudinaryAuthRef,
  redactKycFromPlain,
  canAccessKyc,
  signKycCloudinaryRef,
  KYC_FIELD_NAMES,
} from '../utils/kycAccess.js';

import { updatePrestataire } from '../controller/prestataireController.js';
import { updateFreelance } from '../controller/freelanceController.js';
import { updateVendeur } from '../controller/vendeurController.js';
import prestataireModel from '../models/prestataireModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';

const ID_P = '507f1f77bcf86cd799439601';
const ID_F = '507f1f77bcf86cd799439602';
const ID_V = '507f1f77bcf86cd799439603';
const OWNER = '507f1f77bcf86cd799439611';

/** @type {Array<object>} */
let uploadCalls = [];

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
    },
  };
}

function makeTempFile(name = 'kyc-fictif.jpg') {
  const p = path.join(os.tmpdir(), `r0-kyc-${Date.now()}-${name}`);
  fs.writeFileSync(p, Buffer.from([0xff, 0xd8, 0xff, 0xd9])); // mini JPEG
  return p;
}

function chainDoc(doc) {
  const api = {
    populate() {
      return api;
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve(doc).then(onFulfilled, onRejected);
    },
  };
  return api;
}

describe('R0-05 — helper uploadKycToCloudinary', () => {
  beforeEach(() => {
    uploadCalls = [];
    mock.method(cloudinary.v2.uploader, 'upload', async (filePath, opts) => {
      uploadCalls.push({ filePath, opts });
      return { public_id: 'folder/doc_fictif', secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/public.jpg' };
    });
  });

  afterEach(() => mock.restoreAll());

  it('passe type authenticated et retourne ref cld:auth:', async () => {
    const tmp = makeTempFile();
    try {
      const { ref } = await uploadKycToCloudinary(tmp, 'test/kyc');
      assert.equal(uploadCalls.length, 1);
      assert.equal(uploadCalls[0].opts.type, 'authenticated');
      assert.equal(uploadCalls[0].opts.resource_type, 'image');
      assert.ok(ref.startsWith(CLD_AUTH_PREFIX));
      assert.equal(isCloudinaryAuthRef(ref), true);
      assert.ok(!ref.startsWith('http'));
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it('signKyc refuse de légitimer une URL http permanente', () => {
    assert.equal(signKycCloudinaryRef('https://res.cloudinary.com/x/image/upload/y.jpg'), null);
  });
});

describe('R0-05 — redaction & permissions', () => {
  it('liste publique : KYC réduit à booléen, jamais URL', () => {
    const r = redactKycFromPlain({
      cni1: 'cld:auth:secret',
      selfie: 'https://res.cloudinary.com/demo/image/upload/cni.jpg',
      verificationDocuments: { cni1: 'cld:auth:x', isVerified: false },
      nom: 'Fictif',
    });
    assert.equal(r.cni1, true);
    assert.equal(r.selfie, true);
    assert.equal(r.verificationDocuments.cni1, true);
    assert.equal(JSON.stringify(r).includes('cld:auth:'), false);
    assert.equal(JSON.stringify(r).includes('https://'), false);
  });

  it('permissions canAccessKyc matrice acteurs', () => {
    assert.equal(canAccessKyc({ req: {}, ownerUserId: OWNER }), false);
    assert.equal(
      canAccessKyc({
        req: { utilisateur: { _id: '507f1f77bcf86cd799439699', role: 'Client' } },
        ownerUserId: OWNER,
      }),
      false,
    );
    assert.equal(
      canAccessKyc({
        req: { utilisateur: { _id: OWNER, role: 'Client' } },
        ownerUserId: OWNER,
      }),
      true,
    );
    assert.equal(
      canAccessKyc({
        req: { utilisateur: { _id: '507f1f77bcf86cd799439698', role: 'Admin' } },
        ownerUserId: OWNER,
      }),
      true,
    );
  });
});

describe('R0-05/R0-06 — UPDATE prestataire KYC doit être authentifié', () => {
  beforeEach(() => {
    uploadCalls = [];
    mock.method(cloudinary.v2.uploader, 'upload', async (filePath, opts = {}) => {
      uploadCalls.push({ filePath, opts, via: 'cloudinary.uploader' });
      return {
        public_id: 'prestataires/cni1/doc',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/prestataires/cni1/doc.jpg',
      };
    });
  });

  afterEach(() => mock.restoreAll());

  it('UPDATE cni1 → options type authenticated + valeur cld:auth: (échoue avant R0-06)', async () => {
    const tmp = makeTempFile('cni1.jpg');
    let savedUpdate = null;
    mock.method(prestataireModel, 'findByIdAndUpdate', (id, updates) => {
      savedUpdate = updates;
      const doc = {
        _id: id,
        ...updates,
        utilisateur: { _id: OWNER },
        syncFinalizationFromDocuments() {},
        save: async () => doc,
      };
      return chainDoc(doc);
    });

    const req = {
      params: { id: ID_P },
      body: {},
      files: { cni1: [{ path: tmp, originalname: 'cni1.jpg', mimetype: 'image/jpeg' }] },
      utilisateur: { _id: OWNER, role: 'Client' },
    };
    const res = mockRes();
    try {
      await updatePrestataire(req, res);
    } finally {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }

    assert.equal(res.statusCode, 200, `status=${res.statusCode} body=${JSON.stringify(res.body)}`);
    assert.ok(uploadCalls.length >= 1, 'upload Cloudinary attendu');
    const opts = uploadCalls[0].opts || {};
    assert.equal(
      opts.type,
      'authenticated',
      `UPDATE prestataire KYC doit uploader en authenticated, reçu opts=${JSON.stringify(opts)}`,
    );
    assert.ok(
      typeof savedUpdate?.cni1 === 'string' && savedUpdate.cni1.startsWith(CLD_AUTH_PREFIX),
      `valeur stockée doit être cld:auth:, reçu=${savedUpdate?.cni1}`,
    );
    assert.ok(!String(savedUpdate?.cni1 || '').startsWith('http'));
  });
});

describe('R0-05/R0-06 — UPDATE freelance KYC doit être authentifié', () => {
  beforeEach(() => {
    uploadCalls = [];
    mock.method(cloudinary.v2.uploader, 'upload', async (filePath, opts = {}) => {
      uploadCalls.push({ filePath, opts, via: 'cloudinary.uploader' });
      return {
        public_id: 'freelances/verification/cni1',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/freelances/verification/cni1.jpg',
      };
    });
  });

  afterEach(() => mock.restoreAll());

  it('UPDATE cni1 → authenticated + cld:auth: (échoue avant R0-06)', async () => {
    const tmp = makeTempFile('cni1.jpg');
    let savedUpdate = null;
    mock.method(freelanceModel, 'findByIdAndUpdate', (id, updates) => {
      savedUpdate = updates;
      return chainDoc({ _id: id, ...updates, utilisateur: { _id: OWNER } });
    });

    const req = {
      params: { id: ID_F },
      body: {},
      files: { cni1: [{ path: tmp, originalname: 'cni1.jpg', mimetype: 'image/jpeg' }] },
      utilisateur: { _id: OWNER, role: 'Client' },
    };
    const res = mockRes();
    try {
      await updateFreelance(req, res);
    } finally {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }

    assert.equal(res.statusCode, 200);
    assert.ok(uploadCalls.length >= 1);
    assert.equal(
      uploadCalls[0].opts?.type,
      'authenticated',
      `UPDATE freelance utilise encore upload public: ${JSON.stringify(uploadCalls[0].opts)}`,
    );
    const stored = savedUpdate?.['verificationDocuments.cni1'];
    assert.ok(
      typeof stored === 'string' && stored.startsWith(CLD_AUTH_PREFIX),
      `stocké=${stored}`,
    );
  });

  it('UPDATE profileImage reste pipeline public (secure_url OK)', async () => {
    const tmp = makeTempFile('profile.jpg');
    let savedUpdate = null;
    mock.method(freelanceModel, 'findByIdAndUpdate', (id, updates) => {
      savedUpdate = updates;
      return chainDoc({ _id: id, ...updates });
    });
    const req = {
      params: { id: ID_F },
      body: {},
      files: { profileImage: [{ path: tmp, originalname: 'p.jpg', mimetype: 'image/jpeg' }] },
      utilisateur: { _id: OWNER, role: 'Client' },
    };
    const res = mockRes();
    try {
      await updateFreelance(req, res);
    } finally {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
    assert.equal(res.statusCode, 200);
    assert.ok(String(savedUpdate?.imagePath || '').startsWith('http'));
    assert.notEqual(uploadCalls[0]?.opts?.type, 'authenticated');
  });
});

describe('R0-05/R0-06 — UPDATE vendeur KYC doit être authentifié', () => {
  beforeEach(() => {
    uploadCalls = [];
    mock.method(cloudinary.v2.uploader, 'upload', async (filePath, opts = {}) => {
      uploadCalls.push({ filePath, opts });
      return {
        public_id: 'vendeurs/verification/cni1',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/vendeurs/verification/cni1.jpg',
      };
    });
  });

  afterEach(() => mock.restoreAll());

  it('UPDATE cni1 → authenticated + cld:auth: (échoue avant R0-06)', async () => {
    const tmp = makeTempFile('cni1.jpg');
    let savedUpdate = null;
    mock.method(vendeurModel, 'findByIdAndUpdate', (id, updates) => {
      savedUpdate = updates;
      return chainDoc({ _id: id, ...updates, utilisateur: { _id: OWNER } });
    });

    const req = {
      params: { id: ID_V },
      body: {},
      files: { cni1: [{ path: tmp, originalname: 'cni1.jpg', mimetype: 'image/jpeg' }] },
      utilisateur: { _id: OWNER, role: 'Client' },
    };
    const res = mockRes();
    try {
      await updateVendeur(req, res);
    } finally {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }

    assert.equal(res.statusCode, 200);
    assert.ok(uploadCalls.length >= 1);
    assert.equal(
      uploadCalls[0].opts?.type,
      'authenticated',
      `UPDATE vendeur KYC public: ${JSON.stringify(uploadCalls[0].opts)}`,
    );
    const stored = savedUpdate?.['verificationDocuments.cni1'];
    assert.ok(typeof stored === 'string' && stored.startsWith(CLD_AUTH_PREFIX), `stocké=${stored}`);
  });

  it('UPDATE shopLogo reste public', async () => {
    const tmp = makeTempFile('logo.jpg');
    let savedUpdate = null;
    mock.method(vendeurModel, 'findByIdAndUpdate', (id, updates) => {
      savedUpdate = updates;
      return chainDoc({ _id: id, ...updates });
    });
    const req = {
      params: { id: ID_V },
      body: {},
      files: { shopLogo: [{ path: tmp, originalname: 'l.jpg', mimetype: 'image/jpeg' }] },
      utilisateur: { _id: OWNER, role: 'Client' },
    };
    const res = mockRes();
    try {
      await updateVendeur(req, res);
    } finally {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
    assert.equal(res.statusCode, 200);
    assert.ok(String(savedUpdate?.shopLogo || '').startsWith('http'));
  });
});

describe('R0-05 — injection URL KYC via body', () => {
  it('KYC_FIELD_NAMES listés pour redaction', () => {
    assert.ok(KYC_FIELD_NAMES.includes('cni1'));
    assert.ok(KYC_FIELD_NAMES.includes('selfie'));
  });

  it('stripInjectedKycFromBody retire URL / cld:auth du body', async () => {
    const { stripInjectedKycFromBody, isInjectedKycValue } = await import('../utils/kycAccess.js');
    assert.equal(isInjectedKycValue('https://evil.example/cni.jpg'), true);
    assert.equal(isInjectedKycValue('cld:auth:other/user'), true);
    const cleaned = stripInjectedKycFromBody({
      name: 'ok',
      cni1: 'https://evil.example/cni.jpg',
      verificationDocuments: { cni1: 'cld:auth:stolen', selfie: 'http://x' },
    });
    assert.equal(cleaned.name, 'ok');
    assert.equal(cleaned.cni1, undefined);
    assert.equal(cleaned.verificationDocuments.cni1, undefined);
    assert.equal(cleaned.verificationDocuments.selfie, undefined);
  });

  it('UPDATE freelance ignore injection body cni1 URL', async () => {
    uploadCalls = [];
    mock.method(cloudinary.v2.uploader, 'upload', async (filePath, opts = {}) => {
      uploadCalls.push({ opts });
      return { public_id: 'x', secure_url: 'https://res.cloudinary.com/demo/image/upload/x.jpg' };
    });
    let savedUpdate = null;
    mock.method(freelanceModel, 'findByIdAndUpdate', (id, updates) => {
      savedUpdate = updates;
      return chainDoc({ _id: id, ...updates });
    });
    const req = {
      params: { id: ID_F },
      body: {
        name: 'Safe',
        cni1: 'https://evil.example/injected.jpg',
        'verificationDocuments.cni1': 'cld:auth:other',
      },
      files: {},
      utilisateur: { _id: OWNER, role: 'Client' },
    };
    const res = mockRes();
    await updateFreelance(req, res);
    mock.restoreAll();
    assert.equal(res.statusCode, 200);
    assert.equal(savedUpdate?.['verificationDocuments.cni1'], undefined);
    assert.equal(savedUpdate?.cni1, undefined);
    assert.equal(uploadCalls.length, 0);
  });
});

describe('R0-06 — prepareKycReplacement (sans perte)', () => {
  afterEach(() => mock.restoreAll());

  it('upload OK → retourne ref cld:auth + destroyDeferred', async () => {
    const { prepareKycReplacement } = await import('../utils/kycAccess.js');
    mock.method(cloudinary.v2.uploader, 'upload', async (_p, opts) => {
      assert.equal(opts.type, 'authenticated');
      return { public_id: 'folder/new_doc', secure_url: 'https://should-not-persist.example/x.jpg' };
    });
    const out = await prepareKycReplacement('/tmp/fictif.jpg', 'folder', 'cld:auth:old');
    assert.ok(out.ref.startsWith(CLD_AUTH_PREFIX));
    assert.equal(out.previousRef, 'cld:auth:old');
    assert.equal(out.destroyDeferred, true);
  });

  it('upload échoué → pas de ref à persister', async () => {
    const { prepareKycReplacement } = await import('../utils/kycAccess.js');
    mock.method(cloudinary.v2.uploader, 'upload', async () => {
      throw new Error('upload_failed');
    });
    await assert.rejects(() => prepareKycReplacement('/tmp/x.jpg', 'f'), /upload_failed/);
  });

  it('ancien document absent (null) accepté', async () => {
    const { prepareKycReplacement } = await import('../utils/kycAccess.js');
    mock.method(cloudinary.v2.uploader, 'upload', async () => ({
      public_id: 'n',
      secure_url: 'https://x',
    }));
    const out = await prepareKycReplacement('/tmp/x.jpg', 'f', null);
    assert.equal(out.previousRef, null);
    assert.ok(out.ref.startsWith(CLD_AUTH_PREFIX));
  });

  it('présentateur public ne révèle pas cld:auth', async () => {
    const { presentProDocForViewer } = await import('../utils/kycAccess.js');
    const out = presentProDocForViewer(
      { utilisateur: null },
      { cni1: 'cld:auth:secret', imagePath: 'https://cdn.example/p.jpg', utilisateur: OWNER },
    );
    assert.equal(out.cni1, true);
    assert.equal(out.imagePath, 'https://cdn.example/p.jpg');
  });
});
