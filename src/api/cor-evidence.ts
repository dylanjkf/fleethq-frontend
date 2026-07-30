import { apiClient } from './client';
import type { CorEvidencePack } from './types';

export async function getCorEvidencePack(jobId: string): Promise<CorEvidencePack> {
  const { data } = await apiClient.get<CorEvidencePack>(`/v1/compliance/cor-evidence/${jobId}`);
  return data;
}
