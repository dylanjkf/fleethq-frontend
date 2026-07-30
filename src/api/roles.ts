import { apiClient } from './client';
import type { ListParams, Paginated, RoleView } from './types';

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionKeys: string[];
}

export type UpdateRoleInput = Partial<CreateRoleInput>;

export async function listRoles(params: ListParams = {}): Promise<Paginated<RoleView>> {
  const { data } = await apiClient.get<Paginated<RoleView>>('/v1/roles', { params });
  return data;
}

export async function getRole(id: string): Promise<RoleView> {
  const { data } = await apiClient.get<RoleView>(`/v1/roles/${id}`);
  return data;
}

export async function createRole(input: CreateRoleInput): Promise<RoleView> {
  const { data } = await apiClient.post<RoleView>('/v1/roles', input);
  return data;
}

export async function updateRole(id: string, input: UpdateRoleInput): Promise<RoleView> {
  const { data } = await apiClient.patch<RoleView>(`/v1/roles/${id}`, input);
  return data;
}

export async function cloneRole(id: string, name: string): Promise<RoleView> {
  const { data } = await apiClient.post<RoleView>(`/v1/roles/${id}/clone`, { name });
  return data;
}

export async function archiveRole(id: string): Promise<RoleView> {
  const { data } = await apiClient.post<RoleView>(`/v1/roles/${id}/archive`);
  return data;
}
