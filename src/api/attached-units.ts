import { apiClient } from './client';
import type { AttachedUnit, ListParams, Paginated } from './types';

/**
 * Optional structured specs an attached unit can carry — deliberately the same
 * shape Asset uses, since a trailer's identity data is the same kind of data.
 */
export interface AttachedUnitSpecs {
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  registration?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface CreateAttachedUnitInput extends AttachedUnitSpecs {
  name: string;
  externalReference?: string;
}

/** One row of a unit's hitch history, derived from the timed fleet-graph pairings. */
export interface AttachedUnitHitch {
  id: string;
  assetId: string;
  assetName: string;
  hitchedAt: string;
  unhitchedAt: string | null;
  isCurrent: boolean;
}

// AttachedUnit already carries the spec fields (the server returns them on every
// read), so only the hitch history is additional here.
export interface AttachedUnitDetail extends AttachedUnit {
  hitchHistory: AttachedUnitHitch[];
}

export type UpdateAttachedUnitInput = Partial<CreateAttachedUnitInput>;

export async function listAttachedUnits(params: ListParams = {}): Promise<Paginated<AttachedUnit>> {
  const { data } = await apiClient.get<Paginated<AttachedUnit>>('/v1/attached-units', { params });
  return data;
}

export async function createAttachedUnit(input: CreateAttachedUnitInput): Promise<AttachedUnit> {
  const { data } = await apiClient.post<AttachedUnit>('/v1/attached-units', input);
  return data;
}

export async function updateAttachedUnit(
  id: string,
  input: UpdateAttachedUnitInput,
): Promise<AttachedUnit> {
  const { data } = await apiClient.patch<AttachedUnit>(`/v1/attached-units/${id}`, input);
  return data;
}

export async function archiveAttachedUnit(id: string): Promise<AttachedUnit> {
  const { data } = await apiClient.post<AttachedUnit>(`/v1/attached-units/${id}/archive`);
  return data;
}

/** 01-Product/Fleet_Graph.md's PAIRED_WITH workflow. */
export async function hitchAttachedUnit(id: string, assetId: string): Promise<AttachedUnit> {
  const { data } = await apiClient.post<AttachedUnit>(`/v1/attached-units/${id}/hitch`, { assetId });
  return data;
}

export async function unhitchAttachedUnit(id: string): Promise<AttachedUnit> {
  const { data } = await apiClient.post<AttachedUnit>(`/v1/attached-units/${id}/unhitch`);
  return data;
}

/** Full detail for one unit: specs, current hitch, and hitch history. */
export async function getAttachedUnitDetail(id: string): Promise<AttachedUnitDetail> {
  const { data } = await apiClient.get<AttachedUnitDetail>(`/v1/attached-units/${id}/detail`);
  return data;
}
