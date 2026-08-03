import { apiClient } from './client';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AdminAlert {
  key: string;
  severity: AlertSeverity;
  title: string;
  count: number;
  href: string;
}

export interface AdminAlertsResponse {
  alerts: AdminAlert[];
  total: number;
}

export async function getAdminAlerts(): Promise<AdminAlertsResponse> {
  const { data } = await apiClient.get<AdminAlertsResponse>('/v1/admin/notifications');
  return data;
}
