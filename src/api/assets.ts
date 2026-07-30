import { apiClient } from './client';
import type { Asset, AssetClassKey, ListParams, Paginated } from './types';

export interface AssetSpecs {
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  registration?: string;
  odometer?: number;
  odometerUnit?: string;
  customFields?: Record<string, unknown>;
}

export interface CreateAssetInput extends AssetSpecs {
  name: string;
  externalReference?: string;
  emergencyContact?: string;
  /** Category by key (built-in default / import) … */
  assetClass?: AssetClassKey;
  /** … or by id when picked from the category dropdown (AssetFormDialog). */
  assetClassId?: string;
}

export type UpdateAssetInput = Partial<Omit<CreateAssetInput, 'assetClass'>>;

export interface AssetMaintenanceRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  partsCost: number | null;
  laborCost: number | null;
  createdAt: string;
  completedAt: string | null;
}
export interface AssetComplianceRow {
  id: string;
  documentType: string;
  documentNumber: string | null;
  expiresAt: string;
}
export interface AssetChecklistRow {
  id: string;
  hasFailures: boolean;
  createdAt: string;
  template: { name: string };
}
export interface AssetDetail {
  asset: Asset;
  maintenance: AssetMaintenanceRow[];
  compliance: AssetComplianceRow[];
  checklists: AssetChecklistRow[];
  summary: { openMaintenanceCount: number; complianceCount: number; checklistCount: number };
}

export async function getAssetDetail(id: string): Promise<AssetDetail> {
  const { data } = await apiClient.get<AssetDetail>(`/v1/assets/${id}/detail`);
  return data;
}

export async function listAssets(params: ListParams = {}): Promise<Paginated<Asset>> {
  const { data } = await apiClient.get<Paginated<Asset>>('/v1/assets', { params });
  return data;
}

export async function getAsset(id: string): Promise<Asset> {
  const { data } = await apiClient.get<Asset>(`/v1/assets/${id}`);
  return data;
}

export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const { data } = await apiClient.post<Asset>('/v1/assets', input);
  return data;
}

export async function updateAsset(id: string, input: UpdateAssetInput): Promise<Asset> {
  const { data } = await apiClient.patch<Asset>(`/v1/assets/${id}`, input);
  return data;
}

export async function archiveAsset(id: string): Promise<Asset> {
  const { data } = await apiClient.post<Asset>(`/v1/assets/${id}/archive`);
  return data;
}
