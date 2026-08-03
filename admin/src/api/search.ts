import { apiClient } from './client';

export interface GlobalSearchResult {
  companies: { id: string; name: string }[];
  users: { id: string; fullName: string; email: string | null }[];
  assets: { id: string; name: string; company: { id: string; name: string } }[];
}

export async function globalSearch(q: string): Promise<GlobalSearchResult> {
  const { data } = await apiClient.get<GlobalSearchResult>('/v1/admin/search', { params: { q } });
  return data;
}
