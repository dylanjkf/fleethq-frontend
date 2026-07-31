import { apiClient } from './client';
import type { Company } from './types';

export async function getMyCompany(): Promise<Company> {
  const { data } = await apiClient.get<Company>('/v1/companies/me');
  return data;
}

export async function updateMyCompany(input: {
  name?: string;
  supportPhone?: string;
  supportNotes?: string;
  abn?: string;
  industry?: string;
  phone?: string;
  fleetSizeEstimate?: number;
}): Promise<Company> {
  const { data } = await apiClient.patch<Company>('/v1/companies/me', input);
  return data;
}

export interface SupportInfo {
  supportPhone: string | null;
  supportNotes: string | null;
}

/** 01-Product/Support_Help_Pathway.md — readable by any authenticated user. */
export async function getSupportInfo(): Promise<SupportInfo> {
  const { data } = await apiClient.get<SupportInfo>('/v1/companies/me/support');
  return data;
}
