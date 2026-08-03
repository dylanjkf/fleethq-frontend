import { apiClient } from './client';
import type { FleetAsset, FleetIntegration, FleetOperator, Paginated } from './types';

export interface FleetSearchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  includeArchived?: boolean;
  /** Scope assets/operators to one organisation (used by the company-detail tabs). */
  companyId?: string;
}

export async function searchAssets(params: FleetSearchParams): Promise<Paginated<FleetAsset>> {
  const { data } = await apiClient.get<Paginated<FleetAsset>>('/v1/admin/fleet/assets', { params });
  return data;
}

export async function searchOperators(params: FleetSearchParams): Promise<Paginated<FleetOperator>> {
  const { data } = await apiClient.get<Paginated<FleetOperator>>('/v1/admin/fleet/operators', { params });
  return data;
}

export async function searchIntegrations(params: FleetSearchParams): Promise<Paginated<FleetIntegration>> {
  const { data } = await apiClient.get<Paginated<FleetIntegration>>('/v1/admin/fleet/integrations', { params });
  return data;
}
