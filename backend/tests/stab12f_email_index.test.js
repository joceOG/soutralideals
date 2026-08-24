/**
 * STAB-12F — Index email partiel + normalisation (legacy null autorisés).
 */
import { describe, it, before, beforeEach, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import Utilisateur from '../models/utilisateurModel.js';
import {
  normalizeEmail,
  isNonemptyEmail,
  findLegacyEmailIndex,
  EMAIL_UNIQUE_INDEX_NAME,
  EMAIL_UNIQUE_PARTIAL_FILTER,
} from '../utils/emailIdentity.js';
import {
  resolveGoogleIdentity,
  GOOGLE_IDENTITY_STATUS,
} from '../services/googleIdentityService.js';
import { signUp } from '../controller/utilisateurController.js';

function mockRes() {
  return {
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
}

describe('STAB-12F normalizeEmail', () => {
  it('trim + lowercase', () => {
    assert.equal(normalizeEmail('  Alice@Example.COM  '), 'alice@example.com');
  });

  it('null / undefined / vide / espaces → undefined', () => {
    assert.equal(normalizeEmail(null), undefined);
    assert.equal(normalizeEmail(undefined), undefined);
    assert.equal(normalizeEmail(''), undefined);
    assert.equal(normalizeEmail('   '), undefined);
  });

  it('ne convertit pas null en chaîne "null"', () => {
    assert.equal(normalizeEmail('null'), undefined);
    assert.equal(normalizeEmail('undefined'), undefined);
  });

  it('isNonemptyEmail', () => {
    assert.equal(isNonemptyEmail('a@b.c'), true);
    assert.equal(isNonemptyEmail(null), false);
  });
});

describe('STAB-12F index policy', () => {
  it('détecte email_1 legacy', () => {
    const legacy = findLegacyEmailIndex([
      { name: 'email_1', key: { email: 1 }, unique: true },
    ]);
    assert.equal(legacy?.name, 'email_1');
  });

  it('ignore email_unique_nonempty cible', () => {
    const legacy = findLegacyEmailIndex([
      {
        name: EMAIL_UNIQUE_INDEX_NAME,
        key: { email: 1 },
        unique: true,
        partialFilterExpression: EMAIL_UNIQUE_PARTIAL_FILTER,
      },
    ]);
    assert.equal(legacy, null);
  });

  it('schéma Mongoose définit index partiel email + telephone_verified_unique', () => {
    const defs = Utilisateur.schema.indexes();
    const emailIdx = defs.find(([, opts]) => opts?.name === EMAIL_UNIQUE_INDEX_NAME);
    assert.ok(emailIdx, 'email_unique_nonempty manquant');
    assert.equal(emailIdx[1].unique, true);
    assert.deepEqual(emailIdx[1].partialFilterExpression, EMAIL_UNIQUE_PARTIAL_FILTER);

    const telIdx = defs.find(([, opts]) => opts?.name === 'telephone_verified_unique');
    assert.ok(telIdx, 'telephone_verified_unique manquant');
  });

  it('champ email sans unique: true au niveau schema path', () => {
    const emailPath = Utilisateur.schema.path('email');
    assert.equal(emailPath.options.unique, undefined);
  });
});

describe('STAB-12F legacy null coexistence (mock)', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  after(() => {
    mock.restoreAll();
  });

  it('deux utilisateurs email=null — lookup Google ne matche pas par email null', async () => {
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.googleId) return null;
      if (query.email) return null;
      return null;
    });
    const r = await resolveGoogleIdentity({
      googleId: 'g-new',
      email: 'new@example.com',
    });
    assert.equal(r.status, GOOGLE_IDENTITY_STATUS.NEW);
  });

  it('compte local avec email réel → STAB-12E ACCOUNT_LINK_REQUIRED inchangé', async () => {
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.googleId === 'g-x') return null;
      if (query.email === 'local@example.com') {
        return {
          _id: 'local',
          email: 'local@example.com',
          googleId: null,
        };
      }
      return null;
    });
    const r = await resolveGoogleIdentity({
      googleId: 'g-x',
      email: '  Local@Example.com  ',
    });
    assert.equal(r.status, GOOGLE_IDENTITY_STATUS.ACCOUNT_LINK_REQUIRED);
  });
});

describe('STAB-12F inscription deferred email', () => {
  before(() => {
    process.env.JWT_SECRET = 'stab12f-test-jwt-secret-min-32-chars!!';
    process.env.PHONE_VERIFICATION_MODE = 'deferred';
  });

  beforeEach(() => {
    mock.restoreAll();
  });

  after(() => {
    delete process.env.PHONE_VERIFICATION_MODE;
    mock.restoreAll();
  });

  it('inscription avec email normalisé → OK', async () => {
    mock.method(Utilisateur, 'findOne', async () => null);
    const saved = [];
    mock.method(Utilisateur.prototype, 'save', async function save() {
      saved.push(this);
      return this;
    });
    mock.method(Utilisateur.prototype, 'generateAuthToken', async () => 'tok');
    mock.method(Utilisateur.prototype, 'generateRefreshToken', async () => 'ref');
    mock.method(Utilisateur.prototype, 'toJSON', function toJSON() {
      return { email: this.email };
    });

    const res = mockRes();
    await signUp(
      {
        body: {
          nom: 'Test',
          prenom: 'User',
          email: '  Alice@Example.com  ',
          password: 'Secret123!',
          role: 'client',
        },
      },
      res,
    );

    assert.equal(res.statusCode, 201);
    assert.equal(saved[0].email, 'alice@example.com');
  });

  it('email déjà utilisé → refus', async () => {
    mock.method(Utilisateur, 'findOne', async () => ({
      email: 'alice@example.com',
    }));

    const res = mockRes();
    await signUp(
      {
        body: {
          nom: 'Dup',
          prenom: 'User',
          email: 'Alice@Example.com',
          password: 'Secret123!',
          role: 'client',
        },
      },
      res,
    );

    assert.equal(res.statusCode, 400);
    assert.match(String(res.body.error), /Email déjà utilisé/i);
  });
});
