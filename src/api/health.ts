import { apiClient } from './client';
import type { HealthCheckResult } from './types';

export async function getReadiness(): Promise<HealthCheckResult> {
  const { data } = await apiClient.get<HealthCheckResult>('/health/ready');
  return data;
}
