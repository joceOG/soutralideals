/**
 * STAB-12D — PHONE_VERIFICATION_MODE required|deferred
 */
import { describe, it, before, beforeEach, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  getPhoneVerificationMode,
  isPhoneVerificationRequiredForSignup,
  isPhoneVerificationRequiredForGoogle,
  requiresVerifiedPhone,
  getPublicPhoneVerificationConfig,
} from '../services/phoneVerificationPolicy.js';
import { isOtpRequiredForSignup } from '../services/otpService.js';
import {
  __setVerifyGoogleIdTokenForTests,
} from '../services/googleAuthService.js';
import Utilisateur from '../models/utilisateurModel.js';
import {
  signInWithGoogle,
  signUp,
  verifyAuthenticatedUserPhone,
} from '../controller/utilisateurController.js';

const SECRET = 'stab12d-test-jwt-secret-min-32-chars!!';
const PHONE_A = '+21620113786';

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

function saveEnv(keys) {
  const snapshot = {};
  for (const k of keys) snapshot[k] = process.env[k];
  return snapshot;
}

function restoreEnv(snapshot) {
  for (const [k, v] of Object.entries(snapshot)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe('STAB-12D phone verification policy', () => {
  const envKeys = ['PHONE_VERIFICATION_MODE', 'OTP_REQUIRED'];
  let envSnap;

  beforeEach(() => {
    envSnap = saveEnv(envKeys);
    delete process.env.PHONE_VERIFICATION_MODE;
    delete process.env.OTP_REQUIRED;
  });

  after(() => {
    restoreEnv(envSnap);
  });

  it('required mode → signup + Google bloquants', () => {
    process.env.PHONE_VERIFICATION_MODE = 'required';
    assert.equal(getPhoneVerificationMode(), 'required');
    assert.equal(isPhoneVerificationRequiredForSignup(), true);
    assert.equal(isPhoneVerificationRequiredForGoogle(), true);
    assert.equal(isOtpRequiredForSignup(), true);
  });

  it('deferred mode → signup + Google non bloquants', () => {
    process.env.PHONE_VERIFICATION_MODE = 'deferred';
    assert.equal(isPhoneVerificationRequiredForSignup(), false);
    assert.equal(isPhoneVerificationRequiredForGoogle(), false);
    assert.equal(isOtpRequiredForSignup(), false);
  });

  it('legacy : OTP_REQUIRED=true → signup requis, Google requis', () => {
    process.env.OTP_REQUIRED = 'true';
    assert.equal(isPhoneVerificationRequiredForSignup(), true);
    assert.equal(isPhoneVerificationRequiredForGoogle(), true);
  });

  it('legacy : OTP_REQUIRED=false → signup libre, Google requis (STAB-09)', () => {
    process.env.OTP_REQUIRED = 'false';
    assert.equal(isPhoneVerificationRequiredForSignup(), false);
    assert.equal(isPhoneVerificationRequiredForGoogle(), true);
  });

  it('requiresVerifiedPhone — bêta ne bloque pas navigation', () => {
    assert.equal(requiresVerifiedPhone('catalogue'), false);
    assert.equal(requiresVerifiedPhone('cart_checkout'), false);
    assert.equal(requiresVerifiedPhone('wallet_withdraw'), true);
  });

  it('config publique expose le mode', () => {
    process.env.PHONE_VERIFICATION_MODE = 'deferred';
    const cfg = getPublicPhoneVerificationConfig();
    assert.equal(cfg.mode, 'deferred');
    assert.equal(cfg.signupRequiresOtp, false);
    assert.equal(cfg.googleRequiresPhone, false);
  });
});

describe('STAB-12D Google deferred', () => {
  before(() => {
    process.env.JWT_SECRET = SECRET;
    process.env.PHONE_VERIFICATION_MODE = 'deferred';
  });

  beforeEach(() => {
    __setVerifyGoogleIdTokenForTests(null);
    mock.restoreAll();
  });

  after(() => {
    __setVerifyGoogleIdTokenForTests(null);
    mock.restoreAll();
    delete process.env.PHONE_VERIFICATION_MODE;
  });

  it('nouveau Google → compte créé telephoneVerified=false + session', async () => {
    __setVerifyGoogleIdTokenForTests(async () => ({
      googleId: 'g-deferred-new',
      email: 'deferred-new@example.com',
      prenom: 'Beta',
      nom: 'Tester',
      photoProfil: '',
    }));

    const saved = [];
    mock.method(Utilisateur, 'findOne', async () => null);
    mock.method(Utilisateur.prototype, 'save', async function save() {
      saved.push(this);
      return this;
    });
    mock.method(Utilisateur.prototype, 'generateAuthToken', async () => 'access-deferred');
    mock.method(Utilisateur.prototype, 'generateRefreshToken', async () => 'refresh-deferred');
    mock.method(Utilisateur.prototype, 'toJSON', function toJSON() {
      return {
        _id: 'u-deferred',
        email: this.email,
        telephoneVerified: this.telephoneVerified,
        role: this.role,
      };
    });

    const res = mockRes();
    await signInWithGoogle(
      { body: { idToken: 'tok', role: 'client' } },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.token, 'access-deferred');
    assert.equal(res.body.phoneVerificationMode, 'deferred');
    assert.equal(res.body.phoneVerificationSuggested, true);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].telephoneVerified, false);
    assert.notEqual(saved[0].telephoneVerified, true);
  });

  it('compte déjà telephoneVerified=true → inchangé', async () => {
    __setVerifyGoogleIdTokenForTests(async () => ({
      googleId: 'g-verified',
      email: 'verified@example.com',
      prenom: 'Ok',
      nom: 'User',
    }));

    const user = {
      _id: 'u1',
      googleId: 'g-verified',
      email: 'verified@example.com',
      telephone: PHONE_A,
      telephoneVerified: true,
      authProvider: 'google',
      isActive: true,
      save: async () => user,
      generateAuthToken: async () => 'tok-v',
      generateRefreshToken: async () => 'ref-v',
      toJSON: () => ({
        _id: 'u1',
        telephone: PHONE_A,
        telephoneVerified: true,
      }),
    };

    mock.method(Utilisateur, 'findOne', async () => user);
    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.utilisateur.telephoneVerified, true);
    assert.equal(res.body.phoneVerificationSuggested, false);
  });
});

describe('STAB-12D Google required (STAB-09 préservé)', () => {
  before(() => {
    process.env.JWT_SECRET = SECRET;
    process.env.PHONE_VERIFICATION_MODE = 'required';
  });

  after(() => {
    delete process.env.PHONE_VERIFICATION_MODE;
  });

  beforeEach(() => {
    __setVerifyGoogleIdTokenForTests(null);
    mock.restoreAll();
  });

  it('nouveau Google sans téléphone → PHONE_VERIFICATION_REQUIRED', async () => {
    __setVerifyGoogleIdTokenForTests(async () => ({
      googleId: 'g-req',
      email: 'req@example.com',
      prenom: 'Req',
      nom: 'User',
    }));
    mock.method(Utilisateur, 'findOne', async () => null);
    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok' } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'PHONE_VERIFICATION_REQUIRED');
    assert.equal(res.body.token, undefined);
  });
});

describe('STAB-12D register deferred', () => {
  const envKeys = ['PHONE_VERIFICATION_MODE', 'OTP_REQUIRED', 'JWT_SECRET'];

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

  it('inscription sans OTP → pendingTelephone, telephoneVerified=false', async () => {
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
          email: 'alice@example.com',
          password: 'Secret123!',
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

describe('STAB-12D verifyAuthenticatedUserPhone', () => {
  before(() => {
    process.env.JWT_SECRET = SECRET;
  });

  it('OTP valide → telephoneVerified=true', async () => {
    const token = jwt.sign(
      { telephone: PHONE_A, type: 'phone_verification' },
      SECRET,
      { expiresIn: '15m' },
    );

    const user = {
      _id: '507f1f77bcf86cd799439011',
      telephone: null,
      pendingTelephone: undefined,
      telephoneVerified: false,
      save: async function save() {
        return this;
      },
      toJSON() {
        return {
          _id: this._id,
          telephone: this.telephone,
          telephoneVerified: this.telephoneVerified,
        };
      },
    };

    mock.method(Utilisateur, 'findOne', async () => null);
    mock.method(Utilisateur, 'updateMany', async () => ({ modifiedCount: 0 }));

    const res = mockRes();
    await verifyAuthenticatedUserPhone(
      {
        body: {
          telephone: PHONE_A,
          phoneCountry: 'TN',
          phoneVerificationToken: token,
        },
        utilisateur: user,
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(user.telephoneVerified, true);
    assert.equal(user.telephone, PHONE_A);
  });
});
