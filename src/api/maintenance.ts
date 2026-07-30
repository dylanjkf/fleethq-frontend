import { apiClient } from './client';
import type { ListParams, MaintenanceJob, Paginated } from './types';

export interface CreateMaintenanceJobInput {
  assetId: string;
  title: string;
  description?: string;
  reportedByOperatorId?: string;
}

export interface UpdateMaintenanceJobInput {
  title?: string;
  description?: string;
  status?: 'OPEN' | 'IN_PROGRESS' | 'PARTS_PENDING';
}

export async function listMaintenanceJobs(params: ListParams = {}): Promise<Paginated<MaintenanceJob>> {
  const { data } = await apiClient.get<Paginated<MaintenanceJob>>('/v1/maintenance-jobs', { params });
  return data;
}

export async function createMaintenanceJob(input: CreateMaintenanceJobInput): Promise<MaintenanceJob> {
  const { data } = await apiClient.post<MaintenanceJob>('/v1/maintenance-jobs', input);
  return data;
}

export async function updateMaintenanceJob(
  id: string,
  input: UpdateMaintenanceJobInput,
): Promise<MaintenanceJob> {
  const { data } = await apiClient.patch<MaintenanceJob>(`/v1/maintenance-jobs/${id}`, input);
  return data;
}

export async function approveMaintenanceJob(id: string): Promise<MaintenanceJob> {
  const { data } = await apiClient.post<MaintenanceJob>(`/v1/maintenance-jobs/${id}/approve`);
  return data;
}

export interface CloseMaintenanceJobInput {
  resolutionNotes?: string;
  partsCost?: number;
  laborCost?: number;
}

export async function closeMaintenanceJob(id: string, input: CloseMaintenanceJobInput): Promise<MaintenanceJob> {
  const { data } = await apiClient.post<MaintenanceJob>(`/v1/maintenance-jobs/${id}/close`, input);
  return data;
}

export async function recordPartsUsed(jobId: string, input: { partId: string; quantity: number }): Promise<MaintenanceJob> {
  const { data } = await apiClient.post<MaintenanceJob>(`/v1/maintenance-jobs/${jobId}/parts-used`, input);
  return data;
}
