import { apiClient } from './client';
import type { ListParams, MembershipView, Paginated } from './types';

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  roleId: string;
}

export interface LinkExistingUserInput {
  username: string;
  roleId: string;
}

export async function listUsers(params: ListParams = {}): Promise<Paginated<MembershipView>> {
  const { data } = await apiClient.get<Paginated<MembershipView>>('/v1/users', { params });
  return data;
}

export async function getUser(membershipId: string): Promise<MembershipView> {
  const { data } = await apiClient.get<MembershipView>(`/v1/users/${membershipId}`);
  return data;
}

export async function createUser(input: CreateUserInput): Promise<MembershipView> {
  const { data } = await apiClient.post<MembershipView>('/v1/users', input);
  return data;
}

export async function linkExistingUser(input: LinkExistingUserInput): Promise<MembershipView> {
  const { data } = await apiClient.post<MembershipView>('/v1/users/link', input);
  return data;
}

export async function updateUserRole(membershipId: string, roleId: string): Promise<MembershipView> {
  const { data } = await apiClient.patch<MembershipView>(`/v1/users/${membershipId}/role`, { roleId });
  return data;
}

export async function deactivateUser(membershipId: string): Promise<MembershipView> {
  const { data } = await apiClient.post<MembershipView>(`/v1/users/${membershipId}/deactivate`);
  return data;
}
