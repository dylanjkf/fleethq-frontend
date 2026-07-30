import { apiClient } from './client';

export type OverridableMetric = 'utilisation' | 'compliance_current' | 'prestart';

export interface AnalyticsSettings {
  utilisationTarget: number;
  complianceTarget: number;
  goodThreshold: number;
  warnThreshold: number;
  isDefault: boolean;
}

export interface AnalyticsOverride {
  value: number;
  note: string | null;
  by: string | null;
  at: string;
}

export interface AnalyticsConfig {
  settings: AnalyticsSettings;
  overrides: Partial<Record<OverridableMetric, AnalyticsOverride>>;
}

export async function getAnalyticsSettings(): Promise<AnalyticsConfig> {
  const { data } = await apiClient.get<AnalyticsConfig>('/v1/analytics/settings');
  return data;
}

export async function updateAnalyticsSettings(input: Partial<Omit<AnalyticsSettings, 'isDefault'>>): Promise<AnalyticsConfig> {
  const { data } = await apiClient.put<AnalyticsConfig>('/v1/analytics/settings', input);
  return data;
}

export async function resetAnalyticsSettings(): Promise<AnalyticsConfig> {
  const { data } = await apiClient.post<AnalyticsConfig>('/v1/analytics/settings/reset');
  return data;
}

export async function setAnalyticsOverride(metric: OverridableMetric, value: number, note?: string): Promise<AnalyticsConfig> {
  const { data } = await apiClient.put<AnalyticsConfig>(`/v1/analytics/overrides/${metric}`, { value, note });
  return data;
}

export async function clearAnalyticsOverride(metric: OverridableMetric): Promise<AnalyticsConfig> {
  const { data } = await apiClient.delete<AnalyticsConfig>(`/v1/analytics/overrides/${metric}`);
  return data;
}

export async function resetAnalyticsHistory(): Promise<{ deleted: number }> {
  const { data } = await apiClient.post<{ deleted: number }>('/v1/analytics/history/reset');
  return data;
}

export interface AnalyticsSnapshotDay {
  date: string;
  utilisation: number;
  samples: number;
  excluded: boolean;
}

export async function listAnalyticsSnapshots(days = 14): Promise<{ items: AnalyticsSnapshotDay[] }> {
  const { data } = await apiClient.get<{ items: AnalyticsSnapshotDay[] }>('/v1/analytics/snapshots', { params: { days } });
  return data;
}

export async function setSnapshotExclusion(date: string, excluded: boolean): Promise<{ date: string; excluded: boolean }> {
  const { data } = await apiClient.post<{ date: string; excluded: boolean }>(`/v1/analytics/snapshots/${date}/exclusion`, { excluded });
  return data;
}
