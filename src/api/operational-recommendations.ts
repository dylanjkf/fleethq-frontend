import { apiClient } from './client';
import type { AssetRecommendation, MaintenancePriorityItem } from './types';

export async function getAssetRecommendations(excludeJobId?: string): Promise<AssetRecommendation[]> {
  const { data } = await apiClient.get<AssetRecommendation[]>('/v1/operational-recommendations/assets-for-job', {
    params: excludeJobId ? { excludeJobId } : undefined,
  });
  return data;
}

export async function getMaintenancePriority(): Promise<MaintenancePriorityItem[]> {
  const { data } = await apiClient.get<MaintenancePriorityItem[]>('/v1/operational-recommendations/maintenance-priority');
  return data;
}
