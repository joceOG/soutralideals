/**
 * STAB-11b — Permission recensement + KYC access (unitaires).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertRecensementAgent,
  userCanCreateRecensement,
  isRecensementRequest,
  buildRecensementCreateFields,
} from '../utils/recensementPolicy.js';
import {
  canAccessKyc,
  redactKycFromPlain,
  isSensitiveUploadPath,
  isCloudinaryAuthRef,
  CLD_AUTH_PREFIX,
} from '../utils/kycAccess.js';
import { requireSelfOrAdmin } from '../middleware/entityAccess.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
}

describe('STAB-11b recensement permission', () => {
  it('CLIENT sans flag + source forgée → 403', () => {
    const req = {
      body: { source: 'sdealsidentification', status: 'active' },
      utilisateur: { _id: 'u1', role: 'Client', canCreateRecensement: false },
    };
    const denied = assertRecensementAgent(req);
    assert.equal(denied.status, 403);
  });

  it('anonyme recensement → 401', () => {
    const denied = assertRecensementAgent({
      body: { source: 'sdealsidentification' },
    });
    assert.equal(denied.status, 401);
  });

  it('agent autorisé → OK + pending + recenseur JWT', () => {
    const req = {
      body: {
        source: 'sdealsidentification',
        status: 'active',
        recenseur: 'ffffffffffffffffffff9999',
      },
      utilisateur: {
        _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        role: 'Client',
        canCreateRecensement: true,
      },
    };
    assert.equal(assertRecensementAgent(req), null);
    const fields = buildRecensementCreateFields(req);
    assert.equal(fields.status, 'pending');
    assert.equal(String(fields.recenseur), 'aaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('agent révoqué → 403', () => {
    const req = {
      body: { source: 'sdealsidentification' },
      utilisateur: {
        _id: 'a',
        role: 'Prestataire',
        canCreateRecensement: false,
      },
    };
    assert.equal(assertRecensementAgent(req)?.status, 403);
    assert.equal(userCanCreateRecensement(req.utilisateur), false);
  });

  it('Admin sans flag → autorisé', () => {
    assert.equal(
      userCanCreateRecensement({ role: 'Admin', canCreateRecensement: false }),
      true,
    );
  });

  it('middleware requireSelfOrAdmin : forge source sans permission → 403', () => {
    const mw = requireSelfOrAdmin('utilisateur');
    const req = {
      body: {
        source: 'sdealsidentification',
        utilisateur: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      },
      utilisateur: {
        _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        role: 'Client',
        canCreateRecensement: false,
      },
    };
    const res = mockRes();
    let next = false;
    mw(req, res, () => {
      next = true;
    });
    assert.equal(next, false);
    assert.equal(res.statusCode, 403);
  });

  it('middleware : agent avec permission → next', () => {
    const mw = requireSelfOrAdmin('utilisateur');
    const req = {
      body: {
        source: 'sdealsidentification',
        utilisateur: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      },
      utilisateur: {
        _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        role: 'Client',
        canCreateRecensement: true,
      },
    };
    const res = mockRes();
    let next = false;
    mw(req, res, () => {
      next = true;
    });
    assert.equal(next, true);
  });

  it('source seule n’est pas une autorisation', () => {
    assert.equal(
      isRecensementRequest({ body: { source: 'sdealsidentification' } }),
      true,
    );
    assert.equal(
      userCanCreateRecensement({
        role: 'Client',
        canCreateRecensement: false,
      }),
      false,
    );
  });
});

describe('STAB-11b KYC access', () => {
  it('anonyme → refus', () => {
    assert.equal(
      canAccessKyc({ req: {}, ownerUserId: 'o1', recenseurId: null }),
      false,
    );
  });

  it('JWT sans relation → refus', () => {
    assert.equal(
      canAccessKyc({
        req: { utilisateur: { _id: 'x', role: 'Client' } },
        ownerUserId: 'owner',
        recenseurId: 'agent',
      }),
      false,
    );
  });

  it('propriétaire → allow', () => {
    assert.equal(
      canAccessKyc({
        req: { utilisateur: { _id: 'owner', role: 'Client' } },
        ownerUserId: 'owner',
      }),
      true,
    );
  });

  it('admin → allow', () => {
    assert.equal(
      canAccessKyc({
        req: { utilisateur: { _id: 'a', role: 'Admin' } },
        ownerUserId: 'owner',
      }),
      true,
    );
  });

  it('agent recenseur → allow', () => {
    assert.equal(
      canAccessKyc({
        req: { utilisateur: { _id: 'agent', role: 'Client' } },
        ownerUserId: 'owner',
        recenseurId: 'agent',
      }),
      true,
    );
  });

  it('redact masque les URLs KYC', () => {
    const r = redactKycFromPlain({
      cni1: 'https://res.cloudinary.com/x/image/upload/cni.jpg',
      nom: 'Test',
    });
    assert.equal(r.cni1, true);
    assert.equal(r.nom, 'Test');
  });

  it('chemins locaux documents = sensibles', () => {
    assert.equal(
      isSensitiveUploadPath('/prestataires/documents/uuid_cni.png'),
      true,
    );
    assert.equal(isSensitiveUploadPath('/misc/logo.png'), false);
  });

  it('ref Cloudinary auth détectée', () => {
    assert.equal(
      isCloudinaryAuthRef(`${CLD_AUTH_PREFIX}prestataires/cni/abc`),
      true,
    );
  });
});
