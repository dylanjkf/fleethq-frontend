import { apiClient } from './client';
import type { Job, ListParams, Paginated, StopParcel } from './types';

export interface ParcelListResult {
  parcels: StopParcel[];
  scanned: number;
  total: number;
}

/** Office pre-lists a stop's parcels (from a manifest). */
export async function addStopParcels(jobId: string, stopId: string, parcels: { reference: string; label?: string }[]): Promise<ParcelListResult> {
  const { data } = await apiClient.post<ParcelListResult>(`/v1/jobs/${jobId}/stops/${stopId}/parcels`, { parcels });
  return data;
}

export interface StopInput {
  /** Optional — the server derives a label from customerId when omitted. */
  label?: string;
  address?: string;
  contactName?: string;
  customerId?: string;
  windowStart?: string;
  windowEnd?: string;
}

export async function getJob(id: string): Promise<Job> {
  const { data } = await apiClient.get<Job>(`/v1/jobs/${id}`);
  return data;
}

export async function addStops(jobId: string, stops: StopInput[]): Promise<Job> {
  const { data } = await apiClient.post<Job>(`/v1/jobs/${jobId}/stops`, { stops });
  return data;
}

export async function duplicateJob(jobId: string, input: { scheduledAt?: string } = {}): Promise<Job> {
  const { data } = await apiClient.post<Job>(`/v1/jobs/${jobId}/duplicate`, input);
  return data;
}

export async function reorderStops(jobId: string, stopIds: string[]): Promise<Job> {
  const { data } = await apiClient.post<Job>(`/v1/jobs/${jobId}/stops/reorder`, { stopIds });
  return data;
}

export async function reattemptStop(jobId: string, stopId: string, input: { targetJobId?: string } = {}): Promise<Job> {
  const { data } = await apiClient.post<Job>(`/v1/jobs/${jobId}/stops/${stopId}/reattempt`, input);
  return data;
}

/**
 * Opens the Proof-of-Delivery PDF receipt for a completed stop in a new tab.
 * Fetched as an authed blob (the PDF endpoint needs the bearer token, so a
 * plain link can't reach it), then handed to the browser's PDF viewer.
 */
export async function openStopReceipt(jobId: string, stopId: string): Promise<void> {
  const { data } = await apiClient.get<Blob>(`/v1/jobs/${jobId}/stops/${stopId}/receipt`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  window.open(url, '_blank', 'noopener,noreferrer');
  // Give the new tab a moment to load the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export interface CreateJobInput {
  title: string;
  description?: string;
  assetId?: string;
  operatorId?: string;
  pickupDepotId?: string;
  scheduledAt?: string;
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  scheduledAt?: string;
}

/** Omit a field to leave it unchanged, or pass `null` to explicitly unassign it. */
export interface AssignJobInput {
  assetId?: string | null;
  operatorId?: string | null;
  pickupDepotId?: string | null;
  acknowledgeFatigueRisk?: boolean;
  /** The `updatedAt` last seen for this job — the server rejects with JOB_MODIFIED if it changed since. */
  expectedUpdatedAt?: string;
}

export type JobView = 'today' | 'upcoming' | 'history';

export async function listJobs(params: ListParams & { view?: JobView } = {}): Promise<Paginated<Job>> {
  const { data } = await apiClient.get<Paginated<Job>>('/v1/jobs', { params });
  return data;
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const { data } = await apiClient.post<Job>('/v1/jobs', input);
  return data;
}

export interface BulkJobRow {
  index: number;
  valid: boolean;
  created: boolean;
  errors: string[];
  id?: string;
}

export interface BulkJobResult {
  total: number;
  createdCount: number;
  invalidCount: number;
  rows: BulkJobRow[];
}

/** Create many runs in one request — each row is an ordinary CreateJobInput,
 *  validated and created independently server-side. */
export async function bulkCreateJobs(rows: CreateJobInput[]): Promise<BulkJobResult> {
  const { data } = await apiClient.post<BulkJobResult>('/v1/jobs/bulk', { rows });
  return data;
}

export async function updateJob(id: string, input: UpdateJobInput): Promise<Job> {
  const { data } = await apiClient.patch<Job>(`/v1/jobs/${id}`, input);
  return data;
}

export async function assignJob(id: string, input: AssignJobInput): Promise<Job> {
  const { data } = await apiClient.post<Job>(`/v1/jobs/${id}/assign`, input);
  return data;
}

export async function completeJob(id: string): Promise<Job> {
  const { data } = await apiClient.post<Job>(`/v1/jobs/${id}/complete`);
  return data;
}

export async function cancelJob(id: string): Promise<Job> {
  const { data } = await apiClient.post<Job>(`/v1/jobs/${id}/cancel`);
  return data;
}
