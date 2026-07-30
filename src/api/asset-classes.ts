import { apiClient } from './client';
import type { AssetCategory } from './types';

/**
 * `includeHidden` also returns built-ins this company removed (flagged
 * `isHidden`) so they can be restored. Pickers omit it and never offer a
 * removed category.
 */
export async function listAssetCategories(options: { includeHidden?: boolean } = {}): Promise<{ items: AssetCategory[] }> {
  const { data } = await apiClient.get('/v1/asset-classes', {
    params: options.includeHidden ? { includeHidden: 'true' } : undefined,
  });
  return data;
}
export async function createAssetCategory(input: { name: string; description?: string }): Promise<AssetCategory> {
  const { data } = await apiClient.post('/v1/asset-classes', input);
  return data;
}
export async function updateAssetCategory(id: string, input: { name?: string; description?: string }): Promise<AssetCategory> {
  const { data } = await apiClient.patch(`/v1/asset-classes/${id}`, input);
  return data;
}
/**
 * Remove a category from this company. A custom category is archived; a built-in
 * is suppressed for this company only (the shared row is untouched, so other
 * companies keep it) — hence `removed` distinguishes the two.
 */
export async function removeAssetCategory(id: string): Promise<{ id: string; removed: 'hidden' | 'archived' }> {
  const { data } = await apiClient.post(`/v1/asset-classes/${id}/archive`);
  return data;
}

/** Bring back a category this company removed. */
export async function restoreAssetCategory(id: string): Promise<{ id: string; restored: boolean }> {
  const { data } = await apiClient.post(`/v1/asset-classes/${id}/restore`);
  return data;
}
