import { apiClient } from './client';
import type { AssetClassKey } from './types';

export interface BundleTemplate {
  id: string;
  name: string;
  version: number;
  appliesToAssetClassId: string | null;
}

export interface ChecklistBundle {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  templates: BundleTemplate[];
}

export async function listChecklistBundles(): Promise<{ items: ChecklistBundle[] }> {
  const { data } = await apiClient.get('/v1/checklist-bundles');
  return data;
}
export async function createChecklistBundle(input: { name: string; description?: string; templateIds: string[] }): Promise<ChecklistBundle> {
  const { data } = await apiClient.post('/v1/checklist-bundles', input);
  return data;
}
export async function updateChecklistBundle(id: string, input: { name?: string; description?: string; templateIds?: string[] }): Promise<ChecklistBundle> {
  const { data } = await apiClient.patch(`/v1/checklist-bundles/${id}`, input);
  return data;
}
export async function archiveChecklistBundle(id: string): Promise<ChecklistBundle> {
  const { data } = await apiClient.post(`/v1/checklist-bundles/${id}/archive`);
  return data;
}
export async function deployChecklistBundle(id: string, assetClass: AssetClassKey): Promise<{ scoped: number; assetClass: AssetClassKey }> {
  const { data } = await apiClient.post(`/v1/checklist-bundles/${id}/deploy`, { assetClass });
  return data;
}
