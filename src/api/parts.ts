import { apiClient } from './client';
import type { ListParams, Paginated, Part } from './types';

export interface CreatePartInput {
  name: string;
  partNumber?: string;
  quantityOnHand?: number;
  unitCost?: number;
  lowStockThreshold?: number;
}

export type UpdatePartInput = Partial<CreatePartInput>;

export async function listParts(params: ListParams = {}): Promise<Paginated<Part>> {
  const { data } = await apiClient.get<Paginated<Part>>('/v1/parts', { params });
  return data;
}

export async function createPart(input: CreatePartInput): Promise<Part> {
  const { data } = await apiClient.post<Part>('/v1/parts', input);
  return data;
}

export async function updatePart(id: string, input: UpdatePartInput): Promise<Part> {
  const { data } = await apiClient.patch<Part>(`/v1/parts/${id}`, input);
  return data;
}

export async function archivePart(id: string): Promise<Part> {
  const { data } = await apiClient.post<Part>(`/v1/parts/${id}/archive`);
  return data;
}
