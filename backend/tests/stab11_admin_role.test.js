/**
 * STAB-11 — Matrice ADMIN middleware (authRole) sans serveur HTTP.
 * Couvre : rôle insuffisant, casse, absence utilisateur.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authRole } from '../middleware/authMiddleware.js';

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('STAB-11 authRole middleware', () => {
  it('CLIENT → 403 sur route Admin', async () => {
    const mw = authRole(['Admin', 'ADMIN']);
    const req = { utilisateur: { role: 'Client' } };
    const res = mockRes();
    let nextCalled = false;
    await new Promise((resolve) => {
      mw(req, res, () => {
        nextCalled = true;
        resolve();
      });
      // sync middleware
      setImmediate(resolve);
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });

  it('PRESTATAIRE → 403', () => {
    const mw = authRole(['Admin']);
    const req = { utilisateur: { role: 'Prestataire' } };
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });

  it('Admin (casse mixte) → next', () => {
    const mw = authRole(['ADMIN']);
    const req = { utilisateur: { role: 'Admin' } };
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });

  it('admin minuscule → next', () => {
    const mw = authRole(['Admin', 'ADMIN']);
    const req = { utilisateur: { role: 'admin' } };
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });

  it('sans utilisateur → 403', () => {
    const mw = authRole(['Admin']);
    const req = {};
    const res = mockRes();
    mw(req, res, () => {});
    assert.equal(res.statusCode, 403);
  });
});
