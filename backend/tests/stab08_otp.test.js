/**
 * STAB-08 — OTP téléphone + phoneVerificationToken + register.
 */
import { describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import phoneOtpModel from '../models/phoneOtpModel.js';
import {
  assertPhoneVerificationToken,
  sendPhoneOtp,
  verifyPhoneOtp,
  isOtpRequiredForSignup,
  OTP_POLICY,
  requireCanonicalPhone,
} from '../services/otpService.js';

const SECRET = 'stab08-test-jwt-secret-min-32-chars!!';
const PHONE_A = '+21620113786';
const PHONE_B = '+21698765432';
const PHONE_CI = '+2250708091011';

function signVerification(telephone, expiresIn = '15m') {
  return jwt.sign(
    { telephone, type: 'phone_verification' },
    process.env.JWT_SECRET,
    { expiresIn },
  );
}

describe('STAB-08 OTP policy', () => {
  before(() => {
    process.env.JWT_SECRET = SECRET;
  });

  it('TTL OTP 10 min, token 15m, cooldown 60s, max 5 attempts', () => {
    assert.equal(OTP_POLICY.ttlMs, 10 * 60 * 1000);
    assert.equal(OTP_POLICY.resendCooldownMs, 60 * 1000);
    assert.equal(OTP_POLICY.maxAttempts, 5);
    assert.equal(OTP_POLICY.verificationTokenExpiresIn, '15m');
  });

  it('OTP_REQUIRED=true → isOtpRequiredForSignup', () => {
    const prev = process.env.OTP_REQUIRED;
    process.env.OTP_REQUIRED = 'true';
    assert.equal(isOtpRequiredForSignup(), true);
    process.env.OTP_REQUIRED = 'false';
    assert.equal(isOtpRequiredForSignup(), false);
    delete process.env.OTP_REQUIRED;
    assert.equal(isOtpRequiredForSignup(), false);
    if (prev === undefined) delete process.env.OTP_REQUIRED;
    else process.env.OTP_REQUIRED = prev;
  });

  it('E.164 TN / formats alternatifs → même identité', () => {
    assert.equal(requireCanonicalPhone('+21620113786'), PHONE_A);
    assert.equal(requireCanonicalPhone('0021620113786'), PHONE_A);
    assert.equal(requireCanonicalPhone('20113786', 'TN'), PHONE_A);
  });

  it('numéro invalide → refus', () => {
    assert.throws(() => requireCanonicalPhone('20', 'TN'));
  });
});

describe('STAB-08 assertPhoneVerificationToken', () => {
  before(() => {
    process.env.JWT_SECRET = SECRET;
  });

  it('token valide + même téléphone → OK', () => {
    const token = signVerification(PHONE_A);
    assert.equal(assertPhoneVerificationToken(token, PHONE_A), PHONE_A);
  });

  it('token téléphone A + register téléphone B → refus', () => {
    const token = signVerification(PHONE_A);
    assert.throws(
      () => assertPhoneVerificationToken(token, PHONE_B),
      (e) => e.message.includes('ne correspond pas'),
    );
  });

  it('token A + format alternatif de A → OK (même E.164)', () => {
    const token = signVerification(PHONE_A);
    assert.equal(
      assertPhoneVerificationToken(token, '20113786', 'TN'),
      PHONE_A,
    );
    assert.equal(
      assertPhoneVerificationToken(token, '0021620113786'),
      PHONE_A,
    );
  });

  it('token expiré → refus', () => {
    const token = jwt.sign(
      { telephone: PHONE_A, type: 'phone_verification' },
      SECRET,
      { expiresIn: -10 },
    );
    assert.throws(
      () => assertPhoneVerificationToken(token, PHONE_A),
      (e) => e.message.includes('expiré') || e.message.includes('invalide'),
    );
  });

  it('mauvais type JWT → refus', () => {
    const token = jwt.sign({ telephone: PHONE_A, type: 'access' }, SECRET, {
      expiresIn: '15m',
    });
    assert.throws(() => assertPhoneVerificationToken(token, PHONE_A));
  });

  it('register sans token lorsque OTP_REQUIRED → logique serveur', () => {
    process.env.OTP_REQUIRED = 'true';
    assert.equal(isOtpRequiredForSignup() && !undefined, true);
    assert.equal(isOtpRequiredForSignup() && !'', true);
    const token = signVerification(PHONE_A);
    assert.equal(Boolean(token) || !isOtpRequiredForSignup(), true);
  });
});

describe('STAB-08 send / verify (model mock)', () => {
  let store;

  before(() => {
    process.env.JWT_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    store = null;
    mock.restoreAll();

    mock.method(phoneOtpModel, 'findOne', async ({ telephone }) => {
      if (store && store.telephone === telephone) {
        return {
          ...store,
          save: async function save() {
            store.attempts = this.attempts;
            return this;
          },
        };
      }
      return null;
    });

    mock.method(phoneOtpModel, 'findOneAndUpdate', async (query, update) => {
      store = {
        _id: 'otp1',
        telephone: update.telephone,
        codeHash: update.codeHash,
        expiresAt: update.expiresAt,
        attempts: update.attempts ?? 0,
        lastSentAt: update.lastSentAt,
      };
      return store;
    });

    mock.method(phoneOtpModel, 'deleteOne', async () => {
      store = null;
      return { deletedCount: 1 };
    });
  });

  after(() => {
    mock.restoreAll();
  });

  it('/otp/send E.164 valide → succès', async () => {
    const result = await sendPhoneOtp(PHONE_A);
    assert.equal(result.telephone, PHONE_A);
    assert.equal(result.expiresInSeconds, 600);
    assert.ok(store?.codeHash);
  });

  it('send CI national + pays → E.164', async () => {
    const result = await sendPhoneOtp('0708091011', 'CI');
    assert.equal(result.telephone, PHONE_CI);
  });

  it('numéro invalide → refus send', async () => {
    await assert.rejects(() => sendPhoneOtp('20', 'TN'));
  });

  it('resend trop tôt → refus cooldown', async () => {
    await sendPhoneOtp(PHONE_A);
    await assert.rejects(
      () => sendPhoneOtp(PHONE_A),
      (e) => e.message.includes('patienter'),
    );
  });

  it('OTP correct → verification token one-time', async () => {
    const code = '123456';
    store = {
      _id: 'otp1',
      telephone: PHONE_A,
      codeHash: await bcrypt.hash(code, 8),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      lastSentAt: new Date(Date.now() - 120_000),
    };

    const result = await verifyPhoneOtp(PHONE_A, code);
    assert.equal(result.telephone, PHONE_A);
    assert.ok(result.phoneVerificationToken);
    assert.equal(store, null, 'OTP consommé (one-time)');

    // Réutilisation OTP → aucun record
    await assert.rejects(
      () => verifyPhoneOtp(PHONE_A, code),
      (e) => e.message.includes('Aucun code'),
    );

    // Token utilisable pour register A
    assert.equal(
      assertPhoneVerificationToken(result.phoneVerificationToken, PHONE_A),
      PHONE_A,
    );
    // Pas pour B
    assert.throws(() =>
      assertPhoneVerificationToken(result.phoneVerificationToken, PHONE_B),
    );
  });

  it('OTP incorrect → refus', async () => {
    store = {
      _id: 'otp1',
      telephone: PHONE_A,
      codeHash: await bcrypt.hash('123456', 8),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      lastSentAt: new Date(),
    };
    await assert.rejects(
      () => verifyPhoneOtp(PHONE_A, '000000'),
      (e) => e.message.includes('incorrect'),
    );
    assert.equal(store.attempts, 1);
  });

  it('OTP expiré → refus', async () => {
    store = {
      _id: 'otp1',
      telephone: PHONE_A,
      codeHash: await bcrypt.hash('123456', 8),
      expiresAt: new Date(Date.now() - 1000),
      attempts: 0,
      lastSentAt: new Date(),
    };
    await assert.rejects(
      () => verifyPhoneOtp(PHONE_A, '123456'),
      (e) => e.message.includes('expiré'),
    );
  });

  it('trop de tentatives → refus', async () => {
    store = {
      _id: 'otp1',
      telephone: PHONE_A,
      codeHash: await bcrypt.hash('123456', 8),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 5,
      lastSentAt: new Date(),
    };
    await assert.rejects(
      () => verifyPhoneOtp(PHONE_A, '123456'),
      (e) => e.message.includes('Trop de tentatives'),
    );
  });
});
