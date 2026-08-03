import { apiClient } from './client';

export interface SecurityOverview {
  customerMfa: { enabled: number; total: number; adoptionPct: number };
  adminMfa: { enabled: number; total: number; adoptionPct: number };
  lockedCustomerAccounts: number;
  customersWithFailedLogins: number;
  lockedAccounts: {
    id: string;
    username: string;
    fullName: string;
    email: string | null;
    lockedUntil: string | null;
    failedLoginCount: number;
    organisation: { id: string; name: string } | null;
  }[];
}

export async function getSecurityOverview(): Promise<SecurityOverview> {
  const { data } = await apiClient.get<SecurityOverview>('/v1/admin/security/overview');
  return data;
}
