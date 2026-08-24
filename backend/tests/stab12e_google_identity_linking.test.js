/**
 * STAB-12E — Google / local identity linking (sans fusion silencieuse par email).
 */
import { describe, it, before, beforeEach, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {
  __setVerifyGoogleIdTokenForTests,
} from '../services/googleAuthService.js';
import {
  resolveGoogleIdentity,
  GOOGLE_IDENTITY_STATUS,
} from '../services/googleIdentityService.js';
import { assertPhoneVerificationToken } from '../services/otpService.js';
import Utilisateur from '../models/utilisateurModel.js';
import {
  signInWithGoogle,
  completeGoogleSignIn,
} from '../controller/utilisateurController.js';

const SECRET = 'stab12e-test-jwt-secret-min-32-chars!!';
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

function googleProfile(overrides = {}) {
  return {
    googleId: 'g-sub-1',
    email: 'user@example.com',
    prenom: 'Test',
    nom: 'User',
    photoProfil: '',
    ...overrides,
  };
}

describe('STAB-12E resolveGoogleIdentity', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  after(() => {
    mock.restoreAll();
  });

  it('googleId connu → KNOWN_GOOGLE', async () => {
    const user = { _id: 'u1', googleId: 'g-sub-1', email: 'a@b.c' };
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.googleId === 'g-sub-1') return user;
      return null;
    });
    const result = await resolveGoogleIdentity(googleProfile());
    assert.equal(result.status, GOOGLE_IDENTITY_STATUS.KNOWN_GOOGLE);
    assert.equal(result.user, user);
  });

  it('email libre → NEW', async () => {
    mock.method(Utilisateur, 'findOne', async () => null);
    const result = await resolveGoogleIdentity(
      googleProfile({ googleId: 'g-new', email: 'free@example.com' }),
    );
    assert.equal(result.status, GOOGLE_IDENTITY_STATUS.NEW);
    assert.equal(result.user, null);
  });

  it('email local sans googleId → ACCOUNT_LINK_REQUIRED', async () => {
    const local = {
      _id: 'local-1',
      email: 'local@example.com',
      googleId: null,
      authProvider: 'local',
    };
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.googleId) return null;
      if (query.email === 'local@example.com') return local;
      return null;
    });
    const result = await resolveGoogleIdentity(
      googleProfile({ googleId: 'g-other', email: 'local@example.com' }),
    );
    assert.equal(result.status, GOOGLE_IDENTITY_STATUS.ACCOUNT_LINK_REQUIRED);
    assert.equal(result.user, local);
  });

  it('email avec googleId différent → GOOGLE_ID_MISMATCH', async () => {
    const existing = {
      _id: 'u2',
      email: 'shared@example.com',
      googleId: 'g-existing',
    };
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.googleId === 'g-new-sub') return null;
      if (query.email === 'shared@example.com') return existing;
      return null;
    });
    const result = await resolveGoogleIdentity(
      googleProfile({ googleId: 'g-new-sub', email: 'shared@example.com' }),
    );
    assert.equal(result.status, GOOGLE_IDENTITY_STATUS.GOOGLE_ID_MISMATCH);
  });
});

describe('STAB-12E signInWithGoogle', () => {
  before(() => {
    process.env.JWT_SECRET = SECRET;
  });

  beforeEach(() => {
    __setVerifyGoogleIdTokenForTests(null);
    mock.restoreAll();
    delete process.env.PHONE_VERIFICATION_MODE;
    delete process.env.OTP_REQUIRED;
  });

  after(() => {
    __setVerifyGoogleIdTokenForTests(null);
    mock.restoreAll();
    delete process.env.PHONE_VERIFICATION_MODE;
    delete process.env.OTP_REQUIRED;
  });

  it('nouveau Google + email libre (deferred) → compte créé + session', async () => {
    process.env.PHONE_VERIFICATION_MODE = 'deferred';
    __setVerifyGoogleIdTokenForTests(async () =>
      googleProfile({ googleId: 'g-new', email: 'new@example.com' }),
    );
    mock.method(Utilisateur, 'findOne', async () => null);
    const saved = [];
    mock.method(Utilisateur.prototype, 'save', async function save() {
      saved.push(this);
      return this;
    });
    mock.method(Utilisateur.prototype, 'generateAuthToken', async () => 'jwt-new');
    mock.method(Utilisateur.prototype, 'generateRefreshToken', async () => 'ref-new');
    mock.method(Utilisateur.prototype, 'toJSON', function toJSON() {
      return { email: this.email, googleId: this.googleId };
    });

    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok', role: 'client' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.token, 'jwt-new');
    assert.equal(saved.length, 1);
    assert.equal(saved[0].googleId, 'g-new');
    assert.equal(saved[0].authProvider, 'google');
  });

  it('même googleId → login sans modification authProvider', async () => {
    process.env.PHONE_VERIFICATION_MODE = 'deferred';
    __setVerifyGoogleIdTokenForTests(async () =>
      googleProfile({ googleId: 'g1', email: 'ok@example.com' }),
    );
    let saveCalls = 0;
    const user = {
      googleId: 'g1',
      email: 'ok@example.com',
      authProvider: 'google',
      telephoneVerified: false,
      isActive: true,
      save: async () => {
        saveCalls++;
        return user;
      },
      generateAuthToken: async () => 'access',
      generateRefreshToken: async () => 'refresh',
      toJSON: () => ({ email: 'ok@example.com', authProvider: 'google' }),
    };
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.googleId === 'g1') return user;
      return null;
    });

    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.token, 'access');
    assert.equal(saveCalls, 0);
  });

  it('email local existant → ACCOUNT_LINK_REQUIRED, aucun JWT', async () => {
    process.env.PHONE_VERIFICATION_MODE = 'deferred';
    __setVerifyGoogleIdTokenForTests(async () =>
      googleProfile({ googleId: 'g-google', email: 'local@example.com' }),
    );
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.googleId === 'g-google') return null;
      if (query.email === 'local@example.com') {
        return {
          _id: 'local',
          email: 'local@example.com',
          googleId: null,
          authProvider: 'local',
          telephoneVerified: false,
        };
      }
      return null;
    });

    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok' } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, 'ACCOUNT_LINK_REQUIRED');
    assert.equal(res.body.token, undefined);
    assert.match(String(res.body.message), /Connectez-vous avec votre email/i);
  });

  it('même email + googleId différent → GOOGLE_ID_MISMATCH', async () => {
    __setVerifyGoogleIdTokenForTests(async () =>
      googleProfile({ googleId: 'g-new', email: 'shared@example.com' }),
    );
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.googleId === 'g-new') return null;
      if (query.email === 'shared@example.com') {
        return {
          _id: 'u-old',
          email: 'shared@example.com',
          googleId: 'g-old',
          authProvider: 'google',
        };
      }
      return null;
    });

    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok' } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, 'GOOGLE_ID_MISMATCH');
    assert.equal(res.body.token, undefined);
  });

  it('Google email_verified=false → 401', async () => {
    __setVerifyGoogleIdTokenForTests(async () => {
      throw new Error('Email Google non vérifié');
    });
    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok' } }, res);
    assert.equal(res.statusCode, 401);
  });

  it('compte Google vérifié → login normal (required mode)', async () => {
    process.env.PHONE_VERIFICATION_MODE = 'required';
    __setVerifyGoogleIdTokenForTests(async () =>
      googleProfile({ googleId: 'g-verified', email: 'v@example.com' }),
    );
    const user = {
      googleId: 'g-verified',
      email: 'v@example.com',
      telephone: PHONE_A,
      telephoneVerified: true,
      authProvider: 'google',
      isActive: true,
      save: async () => user,
      generateAuthToken: async () => 'tok-v',
      generateRefreshToken: async () => 'ref-v',
      toJSON: () => ({ telephoneVerified: true }),
    };
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.googleId === 'g-verified') return user;
      return null;
    });

    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.token, 'tok-v');
  });

  it('mode required — nouveau Google → PHONE_VERIFICATION_REQUIRED (STAB-09)', async () => {
    process.env.PHONE_VERIFICATION_MODE = 'required';
    __setVerifyGoogleIdTokenForTests(async () =>
      googleProfile({ googleId: 'g-req', email: 'req@example.com' }),
    );
    mock.method(Utilisateur, 'findOne', async () => null);
    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok' } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'PHONE_VERIFICATION_REQUIRED');
    assert.equal(res.body.token, undefined);
  });

  it('local + email identique en required avec tel vérifié → ACCOUNT_LINK_REQUIRED (pas de session)', async () => {
    process.env.PHONE_VERIFICATION_MODE = 'required';
    __setVerifyGoogleIdTokenForTests(async () =>
      googleProfile({ googleId: 'g-try', email: 'local@example.com' }),
    );
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.googleId === 'g-try') return null;
      if (query.email === 'local@example.com') {
        return {
          _id: 'local',
          email: 'local@example.com',
          googleId: null,
          authProvider: 'local',
          telephone: PHONE_A,
          telephoneVerified: true,
          isActive: true,
        };
      }
      return null;
    });

    const res = mockRes();
    await signInWithGoogle({ body: { idToken: 'tok' } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, 'ACCOUNT_LINK_REQUIRED');
    assert.equal(res.body.token, undefined);
  });
});

describe('STAB-12E completeGoogleSignIn', () => {
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

  it('compte local même email → ACCOUNT_LINK_REQUIRED même avec OTP valide', async () => {
    __setVerifyGoogleIdTokenForTests(async () =>
      googleProfile({ googleId: 'g-complete', email: 'local@example.com' }),
    );
    const tokenA = jwt.sign(
      { telephone: PHONE_A, type: 'phone_verification' },
      SECRET,
      { expiresIn: '15m' },
    );
    mock.method(Utilisateur, 'findOne', async (query) => {
      if (query.googleId === 'g-complete') return null;
      if (query.email === 'local@example.com') {
        return {
          _id: 'local',
          email: 'local@example.com',
          googleId: null,
          authProvider: 'local',
        };
      }
      if (query.telephone === PHONE_A) return null;
      return null;
    });

    const res = mockRes();
    await completeGoogleSignIn(
      {
        body: {
          idToken: 'tok',
          telephone: PHONE_A,
          phoneVerificationToken: tokenA,
        },
      },
      res,
    );
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, 'ACCOUNT_LINK_REQUIRED');
    assert.equal(res.body.token, undefined);
  });

  it('token OTP + formats alternatifs → même E.164 (non-régression)', () => {
    const token = jwt.sign(
      { telephone: PHONE_A, type: 'phone_verification' },
      SECRET,
      { expiresIn: '15m' },
    );
    assert.equal(assertPhoneVerificationToken(token, '20113786', 'TN'), PHONE_A);
    assert.equal(assertPhoneVerificationToken(token, '0021620113786'), PHONE_A);
  });
});
