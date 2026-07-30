import { apiClient } from './client';

export interface WidgetSlot {
  key: string;
  visible: boolean;
}

export interface WidgetCatalogEntry {
  key: string;
  label: string;
}

export interface MyLayout {
  widgets: WidgetSlot[];
  catalog: WidgetCatalogEntry[];
}

export interface DashboardPreset {
  id: string;
  name: string;
  isDefault: boolean;
  widgets: WidgetSlot[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface DashboardMetricDeltas {
  assetsActive: number;
  assetsInWorkshop: number;
  servicesDue: number;
  openDefects: number;
}

export interface DashboardMetrics {
  assetsActive: number;
  assetsInWorkshop: number;
  servicesDue: number;
  openDefects: number;
  assetsOnActiveJob: number;
  /** Change vs the most recent prior-day snapshot average; null until one exists. */
  deltas: DashboardMetricDeltas | null;
  /** The day the deltas compare against (YYYY-MM-DD), or null. */
  comparedTo: string | null;
}

/** Live operational counts for the ops-snapshot + fleet-utilisation widgets. */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const { data } = await apiClient.get<DashboardMetrics>('/v1/dashboard/metrics');
  return data;
}

export interface UtilisationPoint {
  /** YYYY-MM-DD */
  date: string;
  /** Whole-percent utilisation for the day (busy ÷ active). */
  utilisation: number;
  assetsOnActiveJob: number;
  assetsActive: number;
}

/** The real day-by-day utilisation trend the scheduler has accumulated. */
export async function getUtilisationTrend(days = 14): Promise<{ points: UtilisationPoint[] }> {
  const { data } = await apiClient.get<{ points: UtilisationPoint[] }>('/v1/dashboard/utilisation-trend', { params: { days } });
  return data;
}

export async function getMyDashboardLayout(): Promise<MyLayout> {
  const { data } = await apiClient.get('/v1/dashboard/layout');
  return data;
}
export async function setMyDashboardLayout(widgets: WidgetSlot[]): Promise<{ widgets: WidgetSlot[] }> {
  const { data } = await apiClient.put('/v1/dashboard/layout', { widgets });
  return data;
}
export async function listDashboardPresets(): Promise<{ items: DashboardPreset[] }> {
  const { data } = await apiClient.get('/v1/dashboard/layout-presets');
  return data;
}
export async function createDashboardPreset(input: { name: string; widgets: WidgetSlot[]; isDefault?: boolean }): Promise<DashboardPreset> {
  const { data } = await apiClient.post('/v1/dashboard/layout-presets', input);
  return data;
}
export async function archiveDashboardPreset(id: string): Promise<DashboardPreset> {
  const { data } = await apiClient.post(`/v1/dashboard/layout-presets/${id}/archive`);
  return data;
}
export async function deployDashboardPreset(id: string, userIds: string[]): Promise<{ applied: number }> {
  const { data } = await apiClient.post(`/v1/dashboard/layout-presets/${id}/deploy`, { userIds });
  return data;
}
