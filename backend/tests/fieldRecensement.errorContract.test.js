/**
 * R1-11 — Contrat uniforme des erreurs Field Recensement V1.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {
  FIELD_RECENSEMENT_API_CODES,
  FIELD_RECENSEMENT_CODE_ALIASES,
  listFieldRecensementApiCodes,
  getFieldRecensementApiCodeDef,
} from '../constants/fieldRecensementApiCodes.js';
import { FieldRecensementApiError, apiError } from '../utils/FieldRecensementApiError.js';
import fieldRecensementV1Router from '../routes/fieldRecensementV1Routes.js';
import {
  enableFieldRecensementV1ForTests,
  disableFieldRecensementV1ForTests,
  restoreFieldRecensementV1ConfigFromEnv,
  TEST_FIELD_APP_BUILD,
} from './helpers/fieldRecensementV1TestEnv.js';
import {
  startIsolatedMongo,
  stopIsolatedMongo,
  clearIsolatedMongo,
} from './helpers/mongoTestHarness.js';
import Utilisateur from '../models/utilisateurModel.js';

const SECRET = 'r111-contract-secret';
const SNAPSHOT_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  'fixtures',
  'fieldRecensementErrorSnapshots',
);

const CANONICAL_KEYS = new Set(['success', 'code', 'message', 'retryable', 'details']);

function assertCanonicalError(body, { code, httpStatus, retryable }) {
  assert.equal(typeof body, 'object');
  assert.equal(body.success, false);
  assert.equal(body.code, code);
  assert.equal(typeof body.message, 'string');
  assert.ok(body.message.length > 0);
  assert.equal(typeof body.retryable, 'boolean');
  assert.equal(body.retryable, retryable);
  assert.equal(body.error, undefined);
  assert.equal(body.stack, undefined);
  assert.equal(body.errors, undefined);
  for (const k of Object.keys(body)) {
    assert.ok(CANONICAL_KEYS.has(k), `clé inattendue: ${k}`);
  }
  if (body.details !== undefined) {
    assert.equal(typeof body.details, 'object');
    assert.ok(!Array.isArray(body.details));
    assert.ok(!JSON.stringify(body.details).includes('stack'));
  }
  const def = getFieldRecensementApiCodeDef(code);
  assert.equal(def.httpStatus, httpStatus);
  assert.equal(def.retryable, retryable);
}

async function parseRes(res) {
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _raw: text };
  }
  return { status: res.status, body, headers: res.headers, text };
}

describe('R1-11 — invariants registre', () => {
  it('aucun code dupliqué ; HTTP/retryable/message valides', () => {
    const codes = listFieldRecensementApiCodes();
    assert.equal(new Set(codes).size, codes.length);
    for (const code of codes) {
      const def = FIELD_RECENSEMENT_API_CODES[code];
      assert.ok(Number.isInteger(def.httpStatus) && def.httpStatus >= 200 && def.httpStatus < 600);
      assert.equal(typeof def.retryable, 'boolean');
      assert.equal(typeof def.defaultMessage, 'string');
      assert.ok(def.defaultMessage.length > 0);
      assert.ok(def.category);
    }
  });

  it('aliases pointent vers des codes enregistrés', () => {
    for (const [from, to] of Object.entries(FIELD_RECENSEMENT_CODE_ALIASES)) {
      assert.ok(FIELD_RECENSEMENT_API_CODES[to], `${from} → ${to}`);
      assert.equal(FIELD_RECENSEMENT_API_CODES[from], undefined);
    }
  });

  it('FieldRecensementApiError refuse un code inventé', () => {
    assert.throws(
      () => new FieldRecensementApiError('CODE_INVENTE_XYZ'),
      (e) => e.code === 'UNKNOWN_FIELD_RECENSEMENT_API_CODE',
    );
  });

  it('apiError résout les alias et dérive HTTP/retryable du registre', () => {
    const err = apiError(999, 'FIELD_DATA_EDIT_FORBIDDEN', 'x');
    assert.equal(err.code, 'RECENSEMENT_FORBIDDEN');
    assert.equal(err.status, 403);
    assert.equal(err.retryable, false);
  });

  it('aucun littéral code inventé dans fichiers V1 (échantillon)', () => {
    const roots = [
      path.join(process.cwd(), 'controller/fieldRecensementV1Controller.js'),
      path.join(process.cwd(), 'routes/fieldRecensementV1Routes.js'),
      path.join(process.cwd(), 'middleware/authFieldRecensementV1.js'),
      path.join(process.cwd(), 'middleware/requireFieldRecensementV1Enabled.js'),
      path.join(process.cwd(), 'middleware/requireFieldAppBuild.js'),
      path.join(process.cwd(), 'middleware/requireFieldRecenseur.js'),
      path.join(process.cwd(), 'middleware/requireFieldAdmin.js'),
    ];
    const known = new Set([
      ...listFieldRecensementApiCodes(),
      ...Object.keys(FIELD_RECENSEMENT_CODE_ALIASES),
    ]);
    const re = /code:\s*'([A-Z][A-Z0-9_]+)'/g;
    for (const file of roots) {
      const src = fs.readFileSync(file, 'utf8');
      let m;
      while ((m = re.exec(src))) {
        assert.ok(known.has(m[1]), `${file} code inconnu ${m[1]}`);
      }
    }
  });
});

describe('R1-11 — contrat HTTP erreurs', () => {
  let server;
  let baseUrl;
  let tokenAgent;
  let agent;

  function issueToken(id, role = 'Client', expSec = 3600) {
    return jwt.sign({ _id: String(id), role }, SECRET, { expiresIn: expSec });
  }

  before(async () => {
    process.env.JWT_SECRET = SECRET;
    process.env.NODE_ENV = 'test';
    process.env.TEST_CLOUDINARY_MOCK = '1';
    await startIsolatedMongo();

    const app = express();
    app.use(express.json());
    app.use('/api/v1', fieldRecensementV1Router);
    // Handler global legacy — ne doit PAS capter les erreurs déjà gérées V1
    app.use((err, _req, res, _next) => {
      res.status(500).json({ error: 'LEAKED_TO_GLOBAL', message: err.message });
    });
    server = http.createServer(app);
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;

    if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  });

  after(async () => {
    if (server) await new Promise((r) => server.close(r));
    await stopIsolatedMongo();
    restoreFieldRecensementV1ConfigFromEnv();
  });

  beforeEach(async () => {
    await clearIsolatedMongo();
    enableFieldRecensementV1ForTests({ minBuild: 12 });
    agent = await Utilisateur.create({
      nom: 'Agent',
      prenom: 'C',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: true,
      telephone: '+2250700111001',
      telephoneVerified: true,
    });
    tokenAgent = issueToken(agent._id);
    agent.tokens = [{ token: tokenAgent }];
    await agent.save();
  });

  function snap(name, body) {
    const stable = JSON.parse(JSON.stringify(body));
    const file = path.join(SNAPSHOT_DIR, `${name}.json`);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, `${JSON.stringify(stable, null, 2)}\n`);
    }
    const expected = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(stable, expected);
  }

  it('auth absente → AUTH_REQUIRED canonique', async () => {
    const r = await parseRes(await fetch(`${baseUrl}/field-recensements/mine`));
    assert.equal(r.status, 401);
    assertCanonicalError(r.body, { code: 'AUTH_REQUIRED', httpStatus: 401, retryable: false });
    assert.equal(r.headers.get('cache-control'), 'no-store');
    snap('auth_required', r.body);
  });

  it('token expiré → AUTH_TOKEN_EXPIRED', async () => {
    const exp = jwt.sign({ _id: String(agent._id), role: 'Client' }, SECRET, { expiresIn: -5 });
    const r = await parseRes(
      await fetch(`${baseUrl}/field-recensements/mine`, {
        headers: { Authorization: `Bearer ${exp}` },
      }),
    );
    assert.equal(r.status, 401);
    assertCanonicalError(r.body, { code: 'AUTH_TOKEN_EXPIRED', httpStatus: 401, retryable: false });
    snap('auth_token_expired', r.body);
  });

  it('permission révoquée → RECENSEUR_PERMISSION_REVOKED', async () => {
    const u = await Utilisateur.create({
      nom: 'No',
      prenom: 'Perm',
      password: 'Secret1a!!',
      role: 'Client',
      canCreateRecensement: false,
      telephone: '+2250700111002',
      telephoneVerified: true,
    });
    const tok = issueToken(u._id);
    u.tokens = [{ token: tok }];
    await u.save();
    const r = await parseRes(
      await fetch(`${baseUrl}/field-recensements/mine`, {
        headers: {
          Authorization: `Bearer ${tok}`,
          'X-App-Build': String(TEST_FIELD_APP_BUILD),
        },
      }),
    );
    assert.equal(r.status, 403);
    assertCanonicalError(r.body, {
      code: 'RECENSEUR_PERMISSION_REVOKED',
      httpStatus: 403,
      retryable: false,
    });
    snap('permission_revoked', r.body);
  });

  it('Admin requis → ADMIN_REQUIRED', async () => {
    const r = await parseRes(
      await fetch(`${baseUrl}/field-recensements/${new mongoose.Types.ObjectId()}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenAgent}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationMutationId: '550e8400-e29b-41d4-a716-446655440001',
          expectedRevision: 1,
          reasonCode: 'OTHER',
        }),
      }),
    );
    assert.equal(r.status, 403);
    assertCanonicalError(r.body, { code: 'ADMIN_REQUIRED', httpStatus: 403, retryable: false });
    snap('admin_required', r.body);
  });

  it('flag désactivé → FIELD_RECENSEMENT_V1_DISABLED + Retry-After', async () => {
    disableFieldRecensementV1ForTests();
    const r = await parseRes(
      await fetch(`${baseUrl}/field-recensements/mine`, {
        headers: {
          Authorization: `Bearer ${tokenAgent}`,
          'X-App-Build': '12',
        },
      }),
    );
    assert.equal(r.status, 503);
    assertCanonicalError(r.body, {
      code: 'FIELD_RECENSEMENT_V1_DISABLED',
      httpStatus: 503,
      retryable: true,
    });
    assert.ok(r.headers.get('retry-after'));
    snap('flag_disabled', r.body);
  });

  it('build absente → APP_VERSION_BLOCKED', async () => {
    const r = await parseRes(
      await fetch(`${baseUrl}/field-recensements/mine`, {
        headers: { Authorization: `Bearer ${tokenAgent}` },
      }),
    );
    assert.equal(r.status, 426);
    assertCanonicalError(r.body, {
      code: 'APP_VERSION_BLOCKED',
      httpStatus: 426,
      retryable: false,
    });
    assert.equal(r.body.details.reason, 'BUILD_HEADER_REQUIRED');
    snap('build_header_required', r.body);
  });

  it('build ancienne → APP_VERSION_BLOCKED', async () => {
    const r = await parseRes(
      await fetch(`${baseUrl}/field-recensements/mine`, {
        headers: {
          Authorization: `Bearer ${tokenAgent}`,
          'X-App-Build': '8',
        },
      }),
    );
    assert.equal(r.status, 426);
    assertCanonicalError(r.body, {
      code: 'APP_VERSION_BLOCKED',
      httpStatus: 426,
      retryable: false,
    });
    assert.equal(r.body.details.currentBuildNumber, 8);
    assert.equal(r.body.details.minimumBuildNumber, 12);
    snap('build_too_old', r.body);
  });

  it('dossier absent → RECENSEMENT_NOT_FOUND', async () => {
    const id = new mongoose.Types.ObjectId();
    const r = await parseRes(
      await fetch(`${baseUrl}/field-recensements/${id}`, {
        headers: {
          Authorization: `Bearer ${tokenAgent}`,
          'X-App-Build': '12',
        },
      }),
    );
    assert.equal(r.status, 404);
    assertCanonicalError(r.body, {
      code: 'RECENSEMENT_NOT_FOUND',
      httpStatus: 404,
      retryable: false,
    });
    snap('not_found', r.body);
  });

  it('route V1 inconnue → RECENSEMENT_ROUTE_NOT_FOUND JSON (pas HTML)', async () => {
    const r = await parseRes(
      await fetch(`${baseUrl}/field-recensements/${new mongoose.Types.ObjectId()}/foobar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenAgent}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }),
    );
    assert.equal(r.status, 404);
    assert.ok(!String(r.text).includes('<!DOCTYPE'));
    assertCanonicalError(r.body, {
      code: 'RECENSEMENT_ROUTE_NOT_FOUND',
      httpStatus: 404,
      retryable: false,
    });
    snap('route_not_found', r.body);
  });

  it('erreur interne inattendue → SERVER_TEMPORARY_ERROR sans stack', async () => {
    const err = new Error('boom secret path /tmp/x');
    const body = FieldRecensementApiError.fromCode('SERVER_TEMPORARY_ERROR', {
      cause: err,
    }).toJSON();
    assertCanonicalError(body, {
      code: 'SERVER_TEMPORARY_ERROR',
      httpStatus: 503,
      retryable: true,
    });
    assert.ok(!JSON.stringify(body).includes('boom'));
    assert.ok(!JSON.stringify(body).includes('/tmp'));
    snap('server_temporary_error', body);
  });

  it('Multer MIME interdit → RECENSEMENT_PHOTO_INVALID canonique (pas {error})', async () => {
    const form = new FormData();
    form.append('payload', JSON.stringify({ schemaVersion: 1 }));
    const tmp = path.join(os.tmpdir(), `r111-${Date.now()}.txt`);
    fs.writeFileSync(tmp, 'not-an-image');
    const buf = fs.readFileSync(tmp);
    form.append('profilePhoto', new Blob([buf], { type: 'text/plain' }), 'x.txt');
    const r = await parseRes(
      await fetch(`${baseUrl}/field-recensements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenAgent}`,
          'X-App-Build': '12',
        },
        body: form,
      }),
    );
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    assert.equal(r.status, 400);
    assertCanonicalError(r.body, {
      code: 'RECENSEMENT_PHOTO_INVALID',
      httpStatus: 400,
      retryable: false,
    });
    assert.equal(r.body.error, undefined);
    snap('photo_invalid', r.body);
  });
});
