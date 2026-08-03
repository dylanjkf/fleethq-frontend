import { apiClient } from './client';
import type { Paginated } from './types';

/** A FleetHQ staff account (never exposes the password hash or MFA secret). */
export interface AdminUserSummary {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: { id: string; name: string };
  mfaEnabled: boolean;
  locked: boolean;
  mustResetPassword: boolean;
  deactivated: boolean;
  createdAt: string;
}

export interface AdminRoleOption {
  id: string;
  name: string;
  description: string | null;
}

export interface ListAdminUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  includeArchived?: boolean;
}

export interface CreateAdminUserInput {
  username: string;
  email: string;
  fullName: string;
  password: string;
  roleId: string;
}

export async function listAdminUsers(params: ListAdminUsersParams): Promise<Paginated<AdminUserSummary>> {
  const { data } = await apiClient.get<Paginated<AdminUserSummary>>('/v1/admin/users', { params });
  return data;
}

export async function listAdminRoles(): Promise<AdminRoleOption[]> {
  const { data } = await apiClient.get<AdminRoleOption[]>('/v1/admin/users/roles');
  return data;
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUserSummary> {
  const { data } = await apiClient.post<AdminUserSummary>('/v1/admin/users', input);
  return data;
}

export async function updateAdminUserRole(id: string, roleId: string): Promise<AdminUserSummary> {
  const { data } = await apiClient.patch<AdminUserSummary>(`/v1/admin/users/${id}/role`, { roleId });
  return data;
}

export async function deactivateAdminUser(id: string): Promise<AdminUserSummary> {
  const { data } = await apiClient.post<AdminUserSummary>(`/v1/admin/users/${id}/deactivate`, {});
  return data;
}

export async function reactivateAdminUser(id: string): Promise<AdminUserSummary> {
  const { data } = await apiClient.post<AdminUserSummary>(`/v1/admin/users/${id}/reactivate`, {});
  return data;
}
