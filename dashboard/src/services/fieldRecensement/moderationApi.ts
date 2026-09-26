/**
 * R3-02 — Client API modération (décision sur code + HTTP, pas sur message).
 */
import { apiClient, clearSession, isApiClientError } from '../setupApi';
import type { ModerationActionKind } from './moderationConstants';
import {
  FieldApiEnvelope,
  mapModerationResponse,
  ModerationApiOutcome,
  userMessageForOutcome,
} from './moderationOutcome';

export type { FieldApiEnvelope, ModerationApiOutcome };
export { mapModerationResponse, userMessageForOutcome };

function actionRelativePath(id: string, action: ModerationActionKind): string {
  const base = `/v1/field-recensements/${id}`;
  switch (action) {
    case 'requestCorrection':
      return `${base}/request-correction`;
    case 'reject':
      return `${base}/reject`;
    case 'approve':
      return `${base}/approve`;
    case 'publish':
      return `${base}/publish`;
    case 'suspend':
      return `${base}/suspend`;
    case 'reactivate':
      return `${base}/reactivate`;
    default:
      return base;
  }
}

export type ModerationRequestBody = {
  operationMutationId: string;
  expectedRevision: number;
  reasonCode?: string;
  message?: string;
  fields?: string[];
};

export async function postModerationAction(
  id: string,
  action: ModerationActionKind,
  body: ModerationRequestBody,
  abortSignal?: AbortSignal,
): Promise<ModerationApiOutcome> {
  try {
    const res = await apiClient.post(actionRelativePath(id, action), body, { signal: abortSignal });
    return mapModerationResponse(res.status, res.data as FieldApiEnvelope);
  } catch (err) {
    if (isApiClientError(err) && (err.code === 'ERR_CANCELED' || err.name === 'CanceledError')) {
      return { kind: 'other', code: 'CANCELLED' };
    }
    if (!isApiClientError(err)) {
      return { kind: 'network' };
    }
    if (!err.response) {
      return { kind: 'network' };
    }
    const outcome = mapModerationResponse(err.response.status, err.response.data || null);
    if (outcome.kind === 'auth') {
      clearSession();
    }
    return outcome;
  }
}
