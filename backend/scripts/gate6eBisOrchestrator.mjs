/**
 * Gate 6E-bis — orchestrateur PC (Admin API réel contre harness).
 * Prérequis : CREATE device déjà poussé (dossier présent dans MongoMemoryServer).
 *
 * Usage (depuis soutralideals/backend) :
 *   node scripts/gate6eBisOrchestrator.mjs
 */
import crypto from 'crypto';

const BASE = process.env.GATE_BASE || 'http://127.0.0.1:3000/api';
const ADMIN_TEL = '+2250700000009';
const AGENT_A_TEL = '+2250700000001';
const PASS = 'GateTest1a!!';
const BUILD = '12';

function uuid() {
  return crypto.randomUUID();
}

async function json(method, path, { token, body, build } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (build) headers['X-App-Build'] = String(build);
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  return { status: res.status, body: parsed };
}

async function login(identifiant) {
  const r = await json('POST', '/login', {
    body: { identifiant, password: PASS },
  });
  if (r.status !== 200) {
    throw new Error(`login failed ${identifiant}: ${r.status}`);
  }
  return {
    token: r.body.token || r.body.accessToken,
    user: r.body.utilisateur || r.body.user,
  };
}

function assertNoSecrets(obj) {
  const s = JSON.stringify(obj).toLowerCase();
  for (const bad of ['password', 'jwt', 'bearer ', 'sqlcipher', 'cld:auth', 'refresh_token']) {
    if (s.includes(bad) && !s.includes('passwordhint')) {
      throw new Error(`secret leak candidate: ${bad}`);
    }
  }
}

async function main() {
  const report = {
    event: 'gate6e_bis_orchestrator',
    gates: {},
  };

  const health = await json('GET', '/health/gate');
  if (health.status !== 200 || !health.body?.ok) {
    throw new Error('harness down');
  }
  report.env = {
    mongo: health.body.mongo,
    atlas: health.body.atlas,
    cloudinaryReal: health.body.cloudinaryReal,
  };

  const admin = await login(ADMIN_TEL);
  const agentA = await login(AGENT_A_TEL);

  const inspect0 = await json('GET', '/health/gate/recensements');
  if ((inspect0.body?.count ?? 0) < 1) {
    throw new Error('Aucun dossier — lancer d’abord le CREATE device');
  }
  const items = inspect0.body.items || [];
  // Préférer le CREATE device (mutation aaaa…) encore pending_review
  const doc =
    items.find(
      (x) =>
        x.reviewStatus === 'pending_review' &&
        String(x.clientMutationId || '').startsWith('aaaaaaaa-aaaa-4aaa-8aaa-'),
    ) ||
    items.find((x) => x.reviewStatus === 'pending_review') ||
    items[items.length - 1];
  const id = doc.id;
  let revision = doc.revision;
  report.create = {
    id,
    clientMutationId: doc.clientMutationId,
    reviewStatus: doc.reviewStatus,
    revision,
  };
  report.gates.create_present = true;
  if (doc.reviewStatus !== 'pending_review') {
    throw new Error(
      `Dossier ${id} pas pending_review (status=${doc.reviewStatus}) — relancer CREATE device`,
    );
  }

  // GATE 3 — request correction
  const opCorr = uuid();
  const corr = await json('POST', `/v1/field-recensements/${id}/request-correction`, {
    token: admin.token,
    body: {
      operationMutationId: opCorr,
      expectedRevision: revision,
      reasonCode: 'BUSINESS_INCOMPLETE',
      message: 'Merci de préciser la description du service.',
      fields: ['business.description'],
    },
  });
  report.gates.correction_request = {
    status: corr.status,
    code: corr.body?.code,
  };
  if (![200, 201, 202].includes(corr.status)) {
    throw new Error(`request-correction failed: ${corr.status} ${JSON.stringify(corr.body)}`);
  }
  assertNoSecrets(corr.body);
  revision = corr.body?.data?.revision ?? revision + 1;

  // Agent A lit needs_correction
  const detail = await json('GET', `/v1/field-recensements/${id}`, {
    token: agentA.token,
    build: BUILD,
  });
  report.gates.mobile_poll_shape = {
    status: detail.status,
    reviewStatus: detail.body?.data?.reviewStatus ?? detail.body?.reviewStatus,
    correctionFields:
      detail.body?.data?.correction?.fields ??
      detail.body?.correction?.fields ??
      null,
  };
  if (detail.status !== 200) {
    throw new Error(`detail after correction failed: ${detail.status}`);
  }
  assertNoSecrets(detail.body);

  // GATE 5 — PATCH puis resubmit (API réelle, simule mobile)
  const opPatch = uuid();
  const patch = await json('PATCH', `/v1/field-recensements/${id}`, {
    token: agentA.token,
    build: BUILD,
    body: {
      operationMutationId: opPatch,
      expectedRevision: revision,
      changes: {
        'business.description': 'Plomberie Gate E2E corrigée — débouchage urgent',
      },
    },
  });
  report.gates.patch = { status: patch.status, code: patch.body?.code, revision: patch.body?.data?.revision };
  if (patch.status !== 200) {
    throw new Error(`PATCH failed: ${patch.status} ${JSON.stringify(patch.body)}`);
  }
  revision = patch.body.data.revision;

  // Retry ambigu — même UUID → ALREADY_APPLIED
  const patchRetry = await json('PATCH', `/v1/field-recensements/${id}`, {
    token: agentA.token,
    build: BUILD,
    body: {
      operationMutationId: opPatch,
      expectedRevision: revision - 1,
      changes: {
        'business.description': 'Plomberie Gate E2E corrigée — débouchage urgent',
      },
    },
  });
  report.gates.patch_idempotent = {
    status: patchRetry.status,
    code: patchRetry.body?.code,
  };

  const opResubmit = uuid();
  const resubmit = await json('POST', `/v1/field-recensements/${id}/resubmit`, {
    token: agentA.token,
    build: BUILD,
    body: {
      operationMutationId: opResubmit,
      expectedRevision: revision,
    },
  });
  report.gates.resubmit = {
    status: resubmit.status,
    code: resubmit.body?.code,
    reviewStatus: resubmit.body?.data?.reviewStatus,
  };
  if (![200, 201, 202].includes(resubmit.status)) {
    throw new Error(`resubmit failed: ${resubmit.status} ${JSON.stringify(resubmit.body)}`);
  }
  revision = resubmit.body?.data?.revision ?? revision;

  // Double resubmit même UUID
  const resubmit2 = await json('POST', `/v1/field-recensements/${id}/resubmit`, {
    token: agentA.token,
    build: BUILD,
    body: {
      operationMutationId: opResubmit,
      expectedRevision: revision,
    },
  });
  report.gates.resubmit_idempotent = {
    status: resubmit2.status,
    code: resubmit2.body?.code,
  };

  // GATE 6 — approve + publish
  const opApprove = uuid();
  const approve = await json('POST', `/v1/field-recensements/${id}/approve`, {
    token: admin.token,
    body: {
      operationMutationId: opApprove,
      expectedRevision: revision,
      reasonCode: 'OTHER',
    },
  });
  report.gates.approve = { status: approve.status, code: approve.body?.code };
  if (![200, 201, 202].includes(approve.status)) {
    throw new Error(`approve failed: ${approve.status} ${JSON.stringify(approve.body)}`);
  }
  revision = approve.body?.data?.revision ?? revision + 1;
  assertNoSecrets(approve.body);

  const opPublish = uuid();
  const publish = await json('POST', `/v1/field-recensements/${id}/publish`, {
    token: admin.token,
    body: { operationMutationId: opPublish, expectedRevision: revision },
  });
  report.gates.publish = {
    status: publish.status,
    code: publish.body?.code,
    publicationStatus: publish.body?.data?.publicationStatus,
  };
  if (![200, 201, 202].includes(publish.status)) {
    throw new Error(`publish failed: ${publish.status} ${JSON.stringify(publish.body)}`);
  }
  revision = publish.body?.data?.revision ?? revision + 1;
  assertNoSecrets(publish.body);

  // GATE 7 — suspend / reactivate
  const opSuspend = uuid();
  const suspend = await json('POST', `/v1/field-recensements/${id}/suspend`, {
    token: admin.token,
    body: {
      operationMutationId: opSuspend,
      expectedRevision: revision,
      reasonCode: 'QUALITY_ISSUE',
      message: 'Suspension Gate E2E',
    },
  });
  report.gates.suspend = { status: suspend.status, code: suspend.body?.code };
  if (![200, 201, 202].includes(suspend.status)) {
    throw new Error(`suspend failed: ${suspend.status} ${JSON.stringify(suspend.body)}`);
  }
  revision = suspend.body?.data?.revision ?? revision + 1;

  const opReactivate = uuid();
  const reactivate = await json('POST', `/v1/field-recensements/${id}/reactivate`, {
    token: admin.token,
    body: {
      operationMutationId: opReactivate,
      expectedRevision: revision,
      reasonCode: 'ISSUE_RESOLVED',
    },
  });
  report.gates.reactivate = {
    status: reactivate.status,
    code: reactivate.body?.code,
    publicationStatus: reactivate.body?.data?.publicationStatus,
  };
  if (![200, 201, 202].includes(reactivate.status)) {
    throw new Error(`reactivate failed: ${reactivate.status} ${JSON.stringify(reactivate.body)}`);
  }

  const inspect1 = await json('GET', '/health/gate/recensements');
  const sameMut = (inspect1.body.items || []).filter(
    (x) => x.clientMutationId === doc.clientMutationId,
  );
  report.gates.no_duplicate = sameMut.length === 1;
  report.final = sameMut[0] || null;

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ...report, ok: true }, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ ok: false, error: String(err?.message || err) }));
  process.exit(1);
});
