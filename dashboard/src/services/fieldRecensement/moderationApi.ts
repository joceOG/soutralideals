/**
 * R3-02 — Client API modération (décision sur code + HTTP, pas sur message).
 */
import axios, { AxiosError, CancelToken } from 'axios';
import { clearSession, getApiUrl } from '../setupApi';
import type { ModerationActionKind } from './moderationConstants';
import {
  FieldApiEnvelope,
  mapModerationResponse,
  ModerationApiOutcome,
  userMessageForOutcome,
} from './moderationOutcome';

export type { FieldApiEnvelope, ModerationApiOutcome };
export { mapModerationResponse, userMessageForOutcome };

function actionPath(id: string, action: ModerationActionKind): string {
  const base = `${getApiUrl()}/v1/field-recensements/${id}`;
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
  cancelToken?: CancelToken,
): Promise<ModerationApiOutcome> {
  try {
    const res = await axios.post(actionPath(id, action), body, { cancelToken });
    return mapModerationResponse(res.status, res.data as FieldApiEnvelope);
  } catch (err) {
    if (axios.isCancel(err)) {
      return { kind: 'other', code: 'CANCELLED' };
    }
    const ax = err as AxiosError<FieldApiEnvelope>;
    if (!ax.response) {
      return { kind: 'network' };
    }
    const outcome = mapModerationResponse(ax.response.status, ax.response.data || null);
    if (outcome.kind === 'auth') {
      clearSession();
    }
    return outcome;
  }
}
