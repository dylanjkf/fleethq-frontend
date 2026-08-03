import { apiClient } from './client';
import type { Paginated } from './types';

export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'PARTS_PENDING' | 'COMPLETE';

export interface MaintenanceListItem {
  id: string;
  title: string;
  status: MaintenanceStatus;
  createdAt: string;
  completedAt: string | null;
  company: { id: string; name: string };
  asset: { id: string; name: string };
  reportedByOperator: { id: string; fullName: string } | null;
}

export interface MaintenanceDetail extends MaintenanceListItem {
  description: string | null;
  resolutionNotes: string | null;
  partsCost: number | null;
  laborCost: number | null;
  approvedAt: string | null;
  updatedAt: string;
  asset: { id: string; name: string; registration: string | null };
}

export interface ListMaintenanceParams {
  page?: number;
  pageSize?: number;
  companyId?: string;
  assetId?: string;
  status?: MaintenanceStatus;
  from?: string;
  to?: string;
}

export async function listMaintenance(params: ListMaintenanceParams): Promise<Paginated<MaintenanceListItem>> {
  const { data } = await apiClient.get<Paginated<MaintenanceListItem>>('/v1/admin/maintenance', { params });
  return data;
}

export async function getMaintenance(id: string): Promise<MaintenanceDetail> {
  const { data } = await apiClient.get<MaintenanceDetail>(`/v1/admin/maintenance/${id}`);
  return data;
}
