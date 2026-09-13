/**
 * Client dashboard R3-02 — même contrat que FieldRecensementModerationPanel
 * (postModerationAction / moderationApi.ts).
 *
 * Usage:
 *   node scripts/gate6eTerDashboardCorrection.mjs <recensementId> <expectedRevision>
 */
import crypto from 'crypto';
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:3000/api';
const ADMIN_TEL = '+2250700000009';
const PASS = 'GateTest1a!!';

async function loginAdmin() {
  const res = await axios.post(`${BASE}/login`, {
    identifiant: ADMIN_TEL,
    password: PASS,
  });
  const token = res.data.token || res.data.accessToken;
  if (!token) throw new Error('admin login failed');
  return { token, user: res.data.utilisateur || res.data.user };
}

/** Miroir de moderationApi.actionPath + postModerationAction */
async function postModerationAction(token, id, action, body) {
  const path =
    action === 'requestCorrection'
      ? `${BASE}/v1/field-recensements/${id}/request-correction`
      : `${BASE}/v1/field-recensements/${id}/${action}`;
  const res = await axios.post(path, body, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: () => true,
  });
  return { status: res.status, data: res.data };
}

async function main() {
  const id = process.argv[2];
  const expectedRevision = Number(process.argv[3] || '1');
  if (!id) {
    console.error('usage: node gate6eTerDashboardCorrection.mjs <id> <revision>');
    process.exit(1);
  }
  const { token } = await loginAdmin();
  const operationMutationId = crypto.randomUUID();
  const outcome = await postModerationAction(token, id, 'requestCorrection', {
    operationMutationId,
    expectedRevision,
    reasonCode: 'BUSINESS_INCOMPLETE',
    message: 'Merci de preciser la description du service (Gate 6E-TER).',
    fields: ['business.description'],
  });
  // Ne pas logger de token
  console.log(
    JSON.stringify({
      event: 'dashboard_client_request_correction',
      status: outcome.status,
      code: outcome.data?.code,
      reviewStatus: outcome.data?.data?.reviewStatus,
      revision: outcome.data?.data?.revision,
      fields: outcome.data?.data?.correction?.fields || ['business.description'],
      ok: [200, 201, 202].includes(outcome.status),
    }),
  );
  if (![200, 201, 202].includes(outcome.status)) process.exit(1);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
});
