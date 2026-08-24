/**
 * STAB-08b SMS prod + STAB-09 Google téléphone.
 */
import { describe, it, before, beforeEach, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import * as smsService from '../services/smsService.js';
import {
  __setVerifyGoogleIdTokenForTests,
} from '../services/googleAuthService.js';
import { assertPhoneVerificationToken } from '../services/otpService.js';
import Utilisateur from '../models/utilisateurModel.js';
import {
  signInWithGoogle,
  completeGoogleSignIn,
} from '../controller/utilisateurController.js';

const SECRET = 'stab09-test-jwt-secret-min-32-chars!!';
const PHONE_A = '+21620113786';
const PHONE_B = '+21698765432';

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

describe('STAB-08b SMS production gate', () => {
  const prevNodeEnv = process.env.NODE_ENV;

  after(() => {
    process.env.NODE_ENV = prevNodeEnv;
  });

  it('production sans provider → erreur réelle', async () => {
    process.env.NODE_ENV = 'production';
    const prev = {
      INFOBIP_API_KEY: process.env.INFOBIP_API_KEY,
      INFOBIP_NUMBER: process.env.INFOBIP_NUMBER,
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_NUMBER: process.env.TWILIO_NUMBER,
    };
    delete process.env.INFOBIP_API_KEY;
    delete process.env.INFOBIP_NUMBER;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_NUMBER;

    try {
      await assert.rejects(
        () => smsService.sendSms(PHONE_A, 'code 123456'),
        (e) => /SMS temporairement indisponible/.test(e.message),
      );
    } finally {
      Object.assign(process.env, Object.fromEntries(
        Object.entries(prev).filter(([, v]) => v !== undefined),
      ));
    }
  });

  it('hors production → fallback dev ok', async () => {
    process.env.NODE_ENV = 'development';
    const result = await smsService.sendSms(PHONE_A, 'code 999999');
    assert.equal(result.provider, 'dev');
    assert.equal(result.dev, true);
  });
});

describe('STAB-09 Google + téléphone', () => {
  before(() => {
    process.env.JWT_SECRET = SECRET;
  });

  beforeEach(() => {
    __setVerifyGoogleIdTokenForTests(null);
    mock.restoreAll();
  });

  after(() => {
    __setVerifyGoogleIdTokenForTests(null);
    mock.restoreAll();
  });

  it('idToken invalide → 401', async () => {
    __setVerifyGoogleIdTokenForTests(async () => {
      throw new Error('Token Google invalide');
    });
    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'bad' } }, res);
    assert.equal(res.statusCode, 401);
  });

  it('nouveau Google → PHONE_VERIFICATION_REQUIRED sans session', async () => {
    __setVerifyGoogleIdTokenForTests(async () => ({
      googleId: 'g-new',
      email: 'new@example.com',
      prenom: 'New',
      nom: 'User',
      photoProfil: '',
    }));
    mock.method(Utilisateur, 'findOne', async () => null);
    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok', role: 'CLIENT' } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'PHONE_VERIFICATION_REQUIRED');
    assert.equal(res.body.token, undefined);
  });

  it('compte vérifié → login JWT', async () => {
    __setVerifyGoogleIdTokenForTests(async () => ({
      googleId: 'g1',
      email: 'ok@example.com',
      prenom: 'Ok',
      nom: 'User',
      photoProfil: '',
    }));
    mock.method(Utilisateur, 'findOne', async () => ({
      googleId: 'g1',
      email: 'ok@example.com',
      telephone: PHONE_A,
      telephoneVerified: true,
      isActive: true,
      authProvider: 'google',
      photoProfil: '',
      save: async () => {},
      generateAuthToken: async () => 'access',
      generateRefreshToken: async () => 'refresh',
      toJSON: () => ({ email: 'ok@example.com', telephoneVerified: true }),
    }));
    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.token, 'access');
  });

  it('compte existant non vérifié → OTP exigé', async () => {
    __setVerifyGoogleIdTokenForTests(async () => ({
      googleId: 'g2',
      email: 'nv@example.com',
      prenom: 'N',
      nom: 'V',
      photoProfil: '',
    }));
    mock.method(Utilisateur, 'findOne', async () => ({
      googleId: 'g2',
      email: 'nv@example.com',
      telephoneVerified: false,
      isActive: true,
    }));
    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok' } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'PHONE_VERIFICATION_REQUIRED');
  });

  it('complete : token OTP A + téléphone B → refus', async () => {
    __setVerifyGoogleIdTokenForTests(async () => ({
      googleId: 'g3',
      email: 'c@example.com',
      prenom: 'C',
      nom: 'C',
      photoProfil: '',
    }));
    const tokenA = jwt.sign(
      { telephone: PHONE_A, type: 'phone_verification' },
      SECRET,
      { expiresIn: '15m' },
    );
    const res = mockRes();
    await completeGoogleSignIn(
      {
        body: {
          idToken: 'tok',
          telephone: PHONE_B,
          phoneVerificationToken: tokenA,
        },
      },
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.match(String(res.body.error), /ne correspond pas|invalide/i);
  });

  it('complete sans OTP → PHONE_VERIFICATION_REQUIRED', async () => {
    const res = mockRes();
    await completeGoogleSignIn(
      { body: { idToken: 'tok', telephone: PHONE_A } },
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'PHONE_VERIFICATION_REQUIRED');
  });

  it('token OTP + formats alternatifs → même E.164', () => {
    const token = jwt.sign(
      { telephone: PHONE_A, type: 'phone_verification' },
      SECRET,
      { expiresIn: '15m' },
    );
    assert.equal(assertPhoneVerificationToken(token, '20113786', 'TN'), PHONE_A);
    assert.equal(assertPhoneVerificationToken(token, '0021620113786'), PHONE_A);
  });

  it('mauvaise audience → refus', async () => {
    __setVerifyGoogleIdTokenForTests(async () => {
      throw new Error('Wrong recipient, payload audience != required');
    });
    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok' } }, res);
    assert.equal(res.statusCode, 401);
  });
});
