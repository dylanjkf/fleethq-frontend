import { apiClient } from './client';
import type { ComplianceDocument, ComplianceDocumentType, ListParams, Paginated } from './types';

export interface CreateComplianceDocumentInput {
  assetId?: string;
  operatorId?: string;
  documentType: ComplianceDocumentType;
  documentNumber?: string;
  issuedAt?: string;
  expiresAt: string;
  notes?: string;
  filePhotoBase64?: string;
  filePhotoContentType?: string;
  filePhotoFilename?: string;
}

export interface UpdateComplianceDocumentInput {
  documentType?: ComplianceDocumentType;
  documentNumber?: string;
  issuedAt?: string;
  expiresAt?: string;
  notes?: string;
  filePhotoBase64?: string;
  filePhotoContentType?: string;
  filePhotoFilename?: string;
}

export interface ComplianceSummary {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
}

/** Company-wide document currency counts for the dashboard Compliance position widget. */
export async function getComplianceSummary(): Promise<ComplianceSummary> {
  const { data } = await apiClient.get<ComplianceSummary>('/v1/compliance-documents/summary');
  return data;
}

/** One metric of the Compliance position: `current` of `total` (e.g. 98 of 100 licences). */
export interface ComplianceRate {
  current: number;
  total: number;
}

export interface CompliancePosition {
  prestart: ComplianceRate;
  driverLicences: ComplianceRate;
  deliveries: ComplianceRate;
  roadworthy: ComplianceRate;
  insurance: ComplianceRate;
  registration: ComplianceRate;
}

/** The six live compliance-currency rates for the dashboard widget. */
export async function getCompliancePosition(): Promise<CompliancePosition> {
  const { data } = await apiClient.get<CompliancePosition>('/v1/compliance-documents/position');
  return data;
}

export async function listComplianceDocuments(
  params: ListParams & { assetId?: string; operatorId?: string } = {},
): Promise<Paginated<ComplianceDocument>> {
  const { data } = await apiClient.get<Paginated<ComplianceDocument>>('/v1/compliance-documents', { params });
  return data;
}

export async function createComplianceDocument(
  input: CreateComplianceDocumentInput,
): Promise<ComplianceDocument> {
  const { data } = await apiClient.post<ComplianceDocument>('/v1/compliance-documents', input);
  return data;
}

export async function updateComplianceDocument(
  id: string,
  input: UpdateComplianceDocumentInput,
): Promise<ComplianceDocument> {
  const { data } = await apiClient.patch<ComplianceDocument>(`/v1/compliance-documents/${id}`, input);
  return data;
}

export async function archiveComplianceDocument(id: string): Promise<ComplianceDocument> {
  const { data } = await apiClient.post<ComplianceDocument>(`/v1/compliance-documents/${id}/archive`);
  return data;
}
