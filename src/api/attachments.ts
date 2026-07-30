import { apiClient } from './client';

/**
 * Fetches an attachment's bytes with the authenticated client and returns an
 * object URL. A plain <img src="/v1/attachments/:id"> can't send the bearer
 * token, so proof-of-delivery photos are fetched as a blob instead.
 */
export async function fetchAttachmentObjectUrl(id: string): Promise<string> {
  const { data } = await apiClient.get<Blob>(`/v1/attachments/${id}`, { responseType: 'blob' });
  return URL.createObjectURL(data);
}
