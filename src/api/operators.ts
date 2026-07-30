import { apiClient } from './client';
import type { ListParams, Operator, Paginated } from './types';

export interface CreateOperatorInput {
  fullName: string;
  email?: string;
  phone?: string;
}

export type UpdateOperatorInput = Partial<CreateOperatorInput>;

export async function listOperators(params: ListParams = {}): Promise<Paginated<Operator>> {
  const { data } = await apiClient.get<Paginated<Operator>>('/v1/operators', { params });
  return data;
}

export async function getOperator(id: string): Promise<Operator> {
  const { data } = await apiClient.get<Operator>(`/v1/operators/${id}`);
  return data;
}

export async function createOperator(input: CreateOperatorInput): Promise<Operator> {
  const { data } = await apiClient.post<Operator>('/v1/operators', input);
  return data;
}

export async function updateOperator(id: string, input: UpdateOperatorInput): Promise<Operator> {
  const { data } = await apiClient.patch<Operator>(`/v1/operators/${id}`, input);
  return data;
}

export async function archiveOperator(id: string): Promise<Operator> {
  const { data } = await apiClient.post<Operator>(`/v1/operators/${id}/archive`);
  return data;
}

export interface LinkOperatorUserInput {
  username: string;
  password: string;
  roleId: string;
}

export async function linkOperatorUser(id: string, input: LinkOperatorUserInput): Promise<Operator> {
  const { data } = await apiClient.post<Operator>(`/v1/operators/${id}/link-user`, input);
  return data;
}

/** 14-Security/Privacy_Data_Protection.md's admin-initiated data-export path. */
export async function exportOperatorData(id: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(`/v1/operators/${id}/data-export`);
  return data;
}

/** 14-Security/Privacy_Data_Protection.md's admin-initiated erasure path — irreversible. */
export async function eraseOperatorData(id: string): Promise<{ erased: boolean }> {
  const { data } = await apiClient.post<{ erased: boolean }>(`/v1/operators/${id}/erase-personal-data`);
  return data;
}
