import { apiClient } from './client';
import type { ImportResult } from './types';

export interface ImportRowsInput {
  rows: Record<string, unknown>[];
  dryRun?: boolean;
}

export async function importAssets(input: ImportRowsInput): Promise<ImportResult> {
  const { data } = await apiClient.post<ImportResult>('/v1/imports/assets', input);
  return data;
}

export async function importOperators(input: ImportRowsInput): Promise<ImportResult> {
  const { data } = await apiClient.post<ImportResult>('/v1/imports/operators', input);
  return data;
}

export async function importDepots(input: ImportRowsInput): Promise<ImportResult> {
  const { data } = await apiClient.post<ImportResult>('/v1/imports/depots', input);
  return data;
}

export async function importCustomers(input: ImportRowsInput): Promise<ImportResult> {
  const { data } = await apiClient.post<ImportResult>('/v1/imports/customers', input);
  return data;
}

export async function importAttachedUnits(input: ImportRowsInput): Promise<ImportResult> {
  const { data } = await apiClient.post<ImportResult>('/v1/imports/attached-units', input);
  return data;
}

export async function importComplianceDocuments(input: ImportRowsInput): Promise<ImportResult> {
  const { data } = await apiClient.post<ImportResult>('/v1/imports/compliance-documents', input);
  return data;
}

export async function importStops(jobId: string, input: ImportRowsInput): Promise<ImportResult> {
  const { data } = await apiClient.post<ImportResult>(`/v1/jobs/${jobId}/stops/import`, input);
  return data;
}
