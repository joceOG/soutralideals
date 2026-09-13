/**
 * Gate 6E-TER — idempotence exacte resubmit
 * - même UUID + même payload → RECENSEMENT_ALREADY_APPLIED
 * - même UUID + expectedRevision différent → IDEMPOTENCY_KEY_REUSED
 *
 * Usage: node scripts/gate6eTerIdempotence.mjs <recensementId> <operationMutationId> <expectedRevision>
 */
import crypto from 'crypto';
import axios from 'axios';

const BASE = process.env.API_URL || 'http://127.0.0.1:3000/api';
const WORKER_TEL = '+2250700000001';
const PASS = 'GateTest1a!!';

async function login() {
  const res = await axios.post(`${BASE}/login`, {
    identifiant: WORKER_TEL,
    password: PASS,
  });
  return res.data.token || res.data.accessToken;
}

async function resubmit(token, id, body) {
  const res = await axios.post(
    `${BASE}/v1/field-recensements/${id}/resubmit`,
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-App-Build': '12',
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    },
  );
  return { status: res.status, code: res.data?.code, revision: res.data?.data?.revision };
}

async function main() {
  const id = process.argv[2];
  const opId = process.argv[3] || crypto.randomUUID();
  const expectedRevision = Number(process.argv[4] || '0');
  if (!id) {
    console.error('usage: node gate6eTerIdempotence.mjs <id> [operationMutationId] [expectedRevision]');
    process.exit(1);
  }
  const token = await login();

  // Si expectedRevision=0, récupérer revision courante
  let rev = expectedRevision;
  if (!rev) {
    const det = await axios.get(`${BASE}/v1/field-recensements/${id}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-App-Build': '12' },
    });
    rev = det.data?.data?.revision;
  }

  const payload = { operationMutationId: opId, expectedRevision: rev };

  // 1) premier resubmit (peut déjà être applied si worker l'a fait)
  const first = await resubmit(token, id, payload);
  // 2) replay identique
  const replay = await resubmit(token, id, payload);
  // 3) même UUID, revision différente
  const reuse = await resubmit(token, id, {
    operationMutationId: opId,
    expectedRevision: rev + 99,
  });

  const report = {
    event: 'gate6eter_idempotence',
    recensementIdPrefix: String(id).slice(0, 8) + '…',
    opIdPrefix: String(opId).slice(0, 8) + '…',
    first: { status: first.status, code: first.code },
    replayIdentical: {
      status: replay.status,
      code: replay.code,
      expect: 'RECENSEMENT_ALREADY_APPLIED',
      ok: replay.code === 'RECENSEMENT_ALREADY_APPLIED',
    },
    reuseDifferent: {
      status: reuse.status,
      code: reuse.code,
      expect: 'IDEMPOTENCY_KEY_REUSED',
      ok: reuse.code === 'IDEMPOTENCY_KEY_REUSED',
    },
  };
  report.ok = report.replayIdentical.ok && report.reuseDifferent.ok;
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
