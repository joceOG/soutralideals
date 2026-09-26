import { apiClient } from './setupApi';

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
  const res = await apiClient.get('/utilisateur/field-agents', { params });
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
  const res = await apiClient.post('/utilisateur/field-agents', body);
  return res.data as {
    agent: FieldAgent;
    temporaryPasswordSet: boolean;
    authorizationGranted: boolean;
    authorizationError: string | null;
    message: string;
  };
}

export async function setFieldAgentAuthorization(id: string, enabled: boolean) {
  const res = await apiClient.patch(`/utilisateur/${id}/can-create-recensement`, { enabled });
  return res.data as {
    agent: FieldAgent;
    canCreateRecensement: boolean;
    message: string;
  };
}

export async function setFieldAgentActive(id: string, isActive: boolean) {
  const res = await apiClient.patch(`/utilisateur/${id}/field-agent-active`, { isActive });
  return res.data as { agent: FieldAgent; message: string };
}

export async function resetAgentPassword(id: string, password: string) {
  const res = await apiClient.patch(`/utilisateur/${id}/agent-password`, { password });
  return res.data as { message: string };
}

export function generateClientTempPassword(): string {
  const n = Math.random().toString(36).slice(2, 8);
  return `Ag${n}!a9`;
}
