import { apiClient } from './client';
import type { Paginated } from './types';

export interface InspectionListItem {
  id: string;
  templateName: string;
  hasFailures: boolean;
  submittedAt: string;
  company: { id: string; name: string };
  asset: { id: string; name: string };
  operator: { id: string; fullName: string } | null;
}

export interface InspectionDetail {
  id: string;
  templateVersion: number;
  templateSnapshot: unknown;
  answers: unknown;
  hasFailures: boolean;
  startedAt: string | null;
  submittedAt: string;
  createdAt: string;
  company: { id: string; name: string };
  asset: { id: string; name: string; registration: string | null };
  operator: { id: string; fullName: string } | null;
  template: { id: string; name: string };
}

export interface ListInspectionsParams {
  page?: number;
  pageSize?: number;
  companyId?: string;
  assetId?: string;
  operatorId?: string;
  failedOnly?: boolean;
  from?: string;
  to?: string;
}

export async function listInspections(params: ListInspectionsParams): Promise<Paginated<InspectionListItem>> {
  const { data } = await apiClient.get<Paginated<InspectionListItem>>('/v1/admin/inspections', { params });
  return data;
}

export async function getInspection(id: string): Promise<InspectionDetail> {
  const { data } = await apiClient.get<InspectionDetail>(`/v1/admin/inspections/${id}`);
  return data;
}
