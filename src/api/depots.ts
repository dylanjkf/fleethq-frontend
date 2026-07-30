import { apiClient } from './client';
import type { Depot, ListParams, Paginated } from './types';

export interface CreateDepotInput {
  name: string;
  address?: string;
  notes?: string;
}

export type UpdateDepotInput = Partial<CreateDepotInput>;

export async function listDepots(params: ListParams = {}): Promise<Paginated<Depot>> {
  const { data } = await apiClient.get<Paginated<Depot>>('/v1/depots', { params });
  return data;
}

export async function createDepot(input: CreateDepotInput): Promise<Depot> {
  const { data } = await apiClient.post<Depot>('/v1/depots', input);
  return data;
}

export async function updateDepot(id: string, input: UpdateDepotInput): Promise<Depot> {
  const { data } = await apiClient.patch<Depot>(`/v1/depots/${id}`, input);
  return data;
}

export async function archiveDepot(id: string): Promise<Depot> {
  const { data } = await apiClient.post<Depot>(`/v1/depots/${id}/archive`);
  return data;
}
