import { apiClient } from './client';

export interface SearchCompanyRef {
  id: string;
  name: string;
}

export interface GlobalSearchResult {
  companies: SearchCompanyRef[];
  // Each user carries the company/companies they belong to (cockpit B1) so a
  // support operator searching by a driver's email sees which tenant to open.
  users: { id: string; fullName: string; email: string | null; companies: SearchCompanyRef[] }[];
  assets: { id: string; name: string; company: SearchCompanyRef }[];
  // Jobs/loads (cockpit B1), each company-scoped.
  jobs: { id: string; title: string; company: SearchCompanyRef }[];
}

export async function globalSearch(q: string): Promise<GlobalSearchResult> {
  const { data } = await apiClient.get<GlobalSearchResult>('/v1/admin/search', { params: { q } });
  return data;
}
