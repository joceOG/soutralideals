import axios from 'axios';
import { getApiUrl, getAuthHeaders } from './setupApi';

export type FieldAgent = {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  role: string;
  label: string;
  canCreateRecensement: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  permissionHistory: Array<{
    action: 'grant' | 'revoke';
    at: string;
    byAdminLabel: string;
  }>;
};

export type FieldAgentFilter = 'authorized' | 'unauthorized' | 'inactive' | 'all';

export async function listFieldAgents(params: {
  q?: string;
  filter?: FieldAgentFilter;
  page?: number;
  limit?: number;
}) {
  const res = await axios.get(`${getApiUrl()}/utilisateur/field-agents`, {
    params,
    headers: getAuthHeaders(),
  });
  return res.data as {
    agents: FieldAgent[];
    total: number;
    page: number;
    totalPages: number;
  };
}

export async function createFieldAgent(body: {
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  password: string;
  authorize?: boolean;
  phoneCountry?: string;
}) {
  const res = await axios.post(`${getApiUrl()}/utilisateur/field-agents`, body, {
    headers: getAuthHeaders(),
  });
  return res.data as {
    agent: FieldAgent;
    temporaryPasswordSet: boolean;
    authorizationGranted: boolean;
    authorizationError: string | null;
    message: string;
  };
}

export async function setFieldAgentAuthorization(id: string, enabled: boolean) {
  const res = await axios.patch(
    `${getApiUrl()}/utilisateur/${id}/can-create-recensement`,
    { enabled },
    { headers: getAuthHeaders() },
  );
  return res.data as {
    agent: FieldAgent;
    canCreateRecensement: boolean;
    message: string;
  };
}

export async function setFieldAgentActive(id: string, isActive: boolean) {
  const res = await axios.patch(
    `${getApiUrl()}/utilisateur/${id}/field-agent-active`,
    { isActive },
    { headers: getAuthHeaders() },
  );
  return res.data as { agent: FieldAgent; message: string };
}

export async function resetAgentPassword(id: string, password: string) {
  const res = await axios.patch(
    `${getApiUrl()}/utilisateur/${id}/agent-password`,
    { password },
    { headers: getAuthHeaders() },
  );
  return res.data as { message: string };
}

export function generateClientTempPassword(): string {
  const n = Math.random().toString(36).slice(2, 8);
  return `Ag${n}!a9`;
}
