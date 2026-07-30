import { apiClient } from './client';
import type { PredictiveMaintenanceSignal } from './types';

export async function getPredictiveMaintenanceSignals(): Promise<PredictiveMaintenanceSignal[]> {
  const { data } = await apiClient.get<PredictiveMaintenanceSignal[]>('/v1/predictive-maintenance/signals');
  return data;
}
