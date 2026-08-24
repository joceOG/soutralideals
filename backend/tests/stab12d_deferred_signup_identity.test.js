/**
 * STAB-12D complément — inscription classique deferred + identité téléphone.
 */
import { describe, it, before, beforeEach, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Utilisateur from '../models/utilisateurModel.js';
import {
  resolveDeferredSignupPhone,
  findVerifiedPhoneOwner,
  clearStalePendingPhone,
} from '../services/phoneIdentityService.js';
import {
  signUp,
  signIn,
  verifyAuthenticatedUserPhone,
} from '../controller/utilisateurController.js';

const SECRET = 'stab12d-identity-jwt-secret-min-32!!';
const PHONE_A = '+21620113786';
const PHONE_B = '+21698765432';
const EMAIL_A = 'alice@example.com';
const EMAIL_B = 'bob@example.com';
const PASSWORD = 'Secret123!';

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

function makeUser(overrides = {}) {
  const base = {
    _id: overrides._id ?? '507f1f77bcf86cd799439011',
    email: EMAIL_A,
    password: bcrypt.hashSync(PASSWORD, 4),
    telephone: undefined,
    pendingTelephone: undefined,
    telephoneVerified: false,
    role: 'Client',
    isActive: true,
    save: async function save() {
      return this;
    },
    generateAuthToken: async () => 'tok',
    generateRefreshToken: async () => 'ref',
    toJSON() {
      return {
        _id: this._id,
        email: this.email,
        telephone: this.telephone,
        pendingTelephone: this.pendingTelephone,
        telephoneVerified: this.telephoneVerified,
      };
    },
    ...overrides,
  };
  base.save = overrides.save ?? base.save;
  return base;
}

describe('STAB-12D phoneIdentityService', () => {
  it('deferred sans OTP → pendingTelephone, pas telephone', () => {
    const r = resolveDeferredSignupPhone({
      normalizedPhone: PHONE_A,
      phoneVerificationToken: null,
      usePendingStorage: true,
    });
    assert.equal(r.pendingTelephone, PHONE_A);
    assert.equal(r.telephone, undefined);
    assert.equal(r.telephoneVerified, false);
  });

  it('avec OTP → telephone vérifié', () => {
    const r = resolveDeferredSignupPhone({
      normalizedPhone: PHONE_A,
      phoneVerificationToken: 'tok',
      usePendingStorage: true,
    });
    assert.equal(r.telephone, PHONE_A);
    assert.equal(r.telephoneVerified, true);
    assert.equal(r.pendingTelephone, undefined);
  });
});

describe('STAB-12D inscription classique deferred', () => {
  before(() => {
    process.env.JWT_SECRET = SECRET;
    process.env.PHONE_VERIFICATION_MODE = 'deferred';
  });

  beforeEach(() => {
    mock.restoreAll();
  });

  after(() => {
    delete process.env.PHONE_VERIFICATION_MODE;
  });

  it('avec email → succès', async () => {
    const saved = [];
    mock.method(Utilisateur, 'findOne', async () => null);
    mock.method(Utilisateur.prototype, 'save', async function save() {
      saved.push(this);
      return this;
    });
    mock.method(Utilisateur.prototype, 'generateAuthToken', async () => 'reg-tok');
    mock.method(Utilisateur.prototype, 'generateRefreshToken', async () => 'reg-ref');
    mock.method(Utilisateur.prototype, 'toJSON', function toJSON() {
      return {
        _id: 'u-reg',
        email: this.email,
        pendingTelephone: this.pendingTelephone,
        telephone: this.telephone,
        telephoneVerified: this.telephoneVerified,
      };
    });

    const res = mockRes();
    await signUp(
      {
        body: {
          nom: 'Dupont',
          prenom: 'Alice',
          email: EMAIL_A,
          password: PASSWORD,
          role: 'client',
        },
        file: undefined,
      },
      res,
    );

    assert.equal(res.statusCode, 201);
    assert.equal(saved[0].telephoneVerified, false);
    assert.equal(saved[0].telephone, undefined);
  });

  it('sans email → refusé', async () => {
    const res = mockRes();
    await signUp(
      {
        body: {
          nom: 'Dupont',
          prenom: 'Alice',
          password: PASSWORD,
          role: 'client',
        },
        file: undefined,
      },
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /Email requis/);
  });

  it('téléphone facultatif → succès sans pending', async () => {
    const saved = [];
    mock.method(Utilisateur, 'findOne', async () => null);
    mock.method(Utilisateur.prototype, 'save', async function save() {
      saved.push(this);
      return this;
    });
    mock.method(Utilisateur.prototype, 'generateAuthToken', async () => 't');
    mock.method(Utilisateur.prototype, 'generateRefreshToken', async () => 'r');
    mock.method(Utilisateur.prototype, 'toJSON', function toJSON() {
      return { _id: 'u', telephoneVerified: false };
    });

    const res = mockRes();
    await signUp(
      {
        body: {
          nom: 'Martin',
          prenom: 'Bob',
          email: EMAIL_B,
          password: PASSWORD,
          role: 'client',
        },
        file: undefined,
      },
      res,
    );
    assert.equal(res.statusCode, 201);
    assert.equal(saved[0].pendingTelephone, undefined);
    assert.equal(saved[0].telephone, undefined);
  });

  it('téléphone fourni → pendingTelephone, pas telephone', async () => {
    const saved = [];
    mock.method(Utilisateur, 'findOne', async () => null);
    mock.method(Utilisateur.prototype, 'save', async function save() {
      saved.push(this);
      return this;
    });
    mock.method(Utilisateur.prototype, 'generateAuthToken', async () => 't');
    mock.method(Utilisateur.prototype, 'generateRefreshToken', async () => 'r');
    mock.method(Utilisateur.prototype, 'toJSON', function toJSON() {
      return {
        pendingTelephone: this.pendingTelephone,
        telephone: this.telephone,
        telephoneVerified: this.telephoneVerified,
      };
    });

    const res = mockRes();
    await signUp(
      {
        body: {
          nom: 'Dupont',
          prenom: 'Alice',
          email: EMAIL_A,
          password: PASSWORD,
          telephone: PHONE_A,
          phoneCountry: 'TN',
          role: 'client',
        },
        file: undefined,
      },
      res,
    );

    assert.equal(res.statusCode, 201);
    assert.equal(saved[0].pendingTelephone, PHONE_A);
    assert.equal(saved[0].telephone, undefined);
    assert.equal(saved[0].telephoneVerified, false);
    assert.equal(res.body.utilisateur.telephoneVerified, false);
  });
});

describe('STAB-12D login classique deferred', () => {
  before(() => {
    process.env.JWT_SECRET = SECRET;
    process.env.PHONE_VERIFICATION_MODE = 'deferred';
  });

  beforeEach(() => {
    mock.restoreAll();
  });

  after(() => {
    delete process.env.PHONE_VERIFICATION_MODE;
  });

  it('login email → succès', async () => {
    const user = makeUser({
      email: EMAIL_A,
      pendingTelephone: PHONE_A,
      telephoneVerified: false,
    });
    mock.method(Utilisateur, 'findByCredentials', async () => user);

    const res = mockRes();
    await signIn(
      { body: { identifiant: EMAIL_A, password: PASSWORD } },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.token);
  });

  it('login téléphone non vérifié → refus (findByCredentials)', async () => {
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.telephone === PHONE_A && query.telephoneVerified === true) {
        return null;
      }
      return null;
    });

    await assert.rejects(
      () => Utilisateur.findByCredentials(PHONE_A, PASSWORD),
      /Identifiants incorrects/,
    );
  });

  it('login téléphone vérifié → succès', async () => {
    const user = makeUser({
      telephone: PHONE_A,
      telephoneVerified: true,
    });
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (
        query.telephone === PHONE_A &&
        query.telephoneVerified === true
      ) {
        return user;
      }
      return null;
    });

    const found = await Utilisateur.findByCredentials(PHONE_A, PASSWORD);
    assert.equal(found.telephoneVerified, true);
  });
});

describe('STAB-12D unicité téléphone vérifié', () => {
  before(() => {
    process.env.JWT_SECRET = SECRET;
    process.env.PHONE_VERIFICATION_MODE = 'deferred';
  });

  beforeEach(() => {
    mock.restoreAll();
  });

  it('A pending ne bloque pas B verify OTP', async () => {
    const token = jwt.sign(
      { telephone: PHONE_A, type: 'phone_verification' },
      SECRET,
      { expiresIn: '15m' },
    );

    const userB = makeUser({
      _id: '507f1f77bcf86cd799439012',
      email: EMAIL_B,
      pendingTelephone: undefined,
    });

    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.telephone === PHONE_A && query.telephoneVerified === true) {
        return null;
      }
      return null;
    });
    mock.method(Utilisateur, 'updateMany', async () => ({ modifiedCount: 1 }));

    const res = mockRes();
    await verifyAuthenticatedUserPhone(
      {
        body: {
          telephone: PHONE_A,
          phoneCountry: 'TN',
          phoneVerificationToken: token,
        },
        utilisateur: userB,
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(userB.telephone, PHONE_A);
    assert.equal(userB.telephoneVerified, true);
    assert.equal(userB.pendingTelephone, undefined);
  });

  it('inscription deferred avec numéro déjà vérifié ailleurs → refus', async () => {
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.telephone === PHONE_A && query.telephoneVerified === true) {
        return makeUser({ _id: 'owner', telephone: PHONE_A, telephoneVerified: true });
      }
      if (query.email === EMAIL_A) return null;
      return null;
    });

    const res = mockRes();
    await signUp(
      {
        body: {
          nom: 'X',
          prenom: 'Y',
          email: EMAIL_A,
          password: PASSWORD,
          telephone: PHONE_A,
          phoneCountry: 'TN',
          role: 'client',
        },
        file: undefined,
      },
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /déjà utilisé/);
  });
});

describe('STAB-12D mode required inchangé', () => {
  before(() => {
    process.env.JWT_SECRET = SECRET;
    process.env.PHONE_VERIFICATION_MODE = 'required';
  });

  after(() => {
    delete process.env.PHONE_VERIFICATION_MODE;
  });

  it('register sans OTP → refus', async () => {
    const res = mockRes();
    await signUp(
      {
        body: {
          nom: 'Dupont',
          prenom: 'Alice',
          email: EMAIL_A,
          password: PASSWORD,
          telephone: PHONE_A,
          phoneCountry: 'TN',
          role: 'client',
        },
        file: undefined,
      },
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /OTP/);
  });
});
