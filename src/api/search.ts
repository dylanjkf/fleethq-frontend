import { apiClient } from './client';

export interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  linkPath: string;
}

/** 01-Product/Universal_Search.md's non-AI fallback slice. */
export async function search(query: string): Promise<SearchResultItem[]> {
  const { data } = await apiClient.get<SearchResultItem[]>('/v1/search', { params: { q: query } });
  return data;
}
