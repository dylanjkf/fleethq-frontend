import { apiClient } from './client';
import type { ListParams } from './types';

export interface DocumentFile {
  id: string;
  filename: string;
  contentType: string;
  byteSize: number;
}

export interface CompanyDocument {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  fileAttachmentId: string;
  fileAttachment: DocumentFile;
  uploadedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface DocumentList {
  items: CompanyDocument[];
  total: number;
  categories: string[];
  page: number;
  pageSize: number;
}

export interface UploadDocumentInput {
  title: string;
  category?: string;
  description?: string;
  filename: string;
  contentType: string;
  dataBase64: string;
}

export interface UpdateDocumentInput {
  title?: string;
  category?: string;
  description?: string;
}

export async function listDocuments(
  params: ListParams & { category?: string; search?: string } = {},
): Promise<DocumentList> {
  const { data } = await apiClient.get<DocumentList>('/v1/documents', { params });
  return data;
}

export async function uploadDocument(input: UploadDocumentInput): Promise<CompanyDocument> {
  const { data } = await apiClient.post<CompanyDocument>('/v1/documents', input);
  return data;
}

export interface BulkUploadFile {
  filename: string;
  contentType: string;
  dataBase64: string;
  /** Omit and the API derives one from the filename. */
  title?: string;
  category?: string;
}

export interface BulkUploadInput {
  files: BulkUploadFile[];
  /** Fallback category for files that don't carry their own. */
  category?: string;
  /** Also create a draft Knowledge Base article per file. Needs `knowledge:create`. */
  publishToKnowledgeBase?: boolean;
}

export interface BulkUploadRow {
  index: number;
  valid: boolean;
  created: boolean;
  errors: string[];
  id?: string;
}

export interface BulkUploadResult {
  total: number;
  validCount: number;
  invalidCount: number;
  createdCount: number;
  rows: BulkUploadRow[];
}

/**
 * The API caps a batch at 25 files, and every file travels as base64 (~4/3 of
 * its real size) inside a 15 MB request body. So "upload as many as you like" is
 * the *caller's* job: split into batches that respect both limits and send them
 * one after another. `MAX_BATCH_BYTES` leaves headroom for the JSON envelope.
 */
export const MAX_BATCH_FILES = 25;
export const MAX_BATCH_BYTES = 9_000_000;

export async function bulkUploadDocuments(input: BulkUploadInput): Promise<BulkUploadResult> {
  const { data } = await apiClient.post<BulkUploadResult>('/v1/documents/bulk', input);
  return data;
}

/**
 * Groups files into batches the API will accept, preserving order so a reported
 * index still maps back to the file the user picked. A single file over the
 * per-request ceiling is left in a batch of its own — it will be rejected by the
 * API's own 8 MB attachment limit with a message about that file, which is more
 * useful than a client-side guess.
 */
export function batchFilesForUpload<T extends { dataBase64: string }>(files: T[]): T[][] {
  const batches: T[][] = [];
  let current: T[] = [];
  let bytes = 0;
  for (const file of files) {
    const size = file.dataBase64.length;
    if (current.length > 0 && (current.length >= MAX_BATCH_FILES || bytes + size > MAX_BATCH_BYTES)) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(file);
    bytes += size;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

export async function updateDocument(id: string, input: UpdateDocumentInput): Promise<CompanyDocument> {
  const { data } = await apiClient.patch<CompanyDocument>(`/v1/documents/${id}`, input);
  return data;
}

export async function archiveDocument(id: string): Promise<CompanyDocument> {
  const { data } = await apiClient.post<CompanyDocument>(`/v1/documents/${id}/archive`);
  return data;
}

/**
 * Opens a document's file in a new tab. The download endpoint needs the bearer
 * token, so a plain link won't do — fetch the bytes as a blob with the authed
 * client, then hand the browser an object URL.
 */
export async function openDocument(id: string): Promise<void> {
  const { data } = await apiClient.get<Blob>(`/v1/documents/${id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  window.open(url, '_blank', 'noopener,noreferrer');
  // Give the new tab time to claim the URL before revoking it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
