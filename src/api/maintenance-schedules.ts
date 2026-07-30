import { apiClient } from './client';

export type PlanStatus = 'ok' | 'due_soon' | 'overdue';

export interface ScheduleItem {
  label: string;
  intervalDays: number;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  items: ScheduleItem[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  _count?: { plans: number };
}

export interface AssetPlan {
  id: string;
  assetId: string;
  asset?: { id: string; name: string };
  label: string;
  intervalDays: number;
  lastServiceAt: string | null;
  nextDueAt: string;
  daysUntilDue: number;
  status: PlanStatus;
}

export interface PlansResult {
  items: AssetPlan[];
  overdueCount?: number;
  dueSoonCount?: number;
}

export async function getSchedulePresets(): Promise<{ items: { name: string; items: ScheduleItem[] }[] }> {
  const { data } = await apiClient.get('/v1/maintenance-schedules/presets');
  return data;
}
export async function listTemplates(): Promise<{ items: ScheduleTemplate[] }> {
  const { data } = await apiClient.get('/v1/maintenance-schedules/templates');
  return data;
}
export async function createTemplate(input: { name: string; items: ScheduleItem[]; isDefault?: boolean }): Promise<ScheduleTemplate> {
  const { data } = await apiClient.post('/v1/maintenance-schedules/templates', input);
  return data;
}
export async function updateTemplate(id: string, input: { name?: string; items?: ScheduleItem[]; isDefault?: boolean }): Promise<ScheduleTemplate> {
  const { data } = await apiClient.patch(`/v1/maintenance-schedules/templates/${id}`, input);
  return data;
}
export async function archiveTemplate(id: string): Promise<ScheduleTemplate> {
  const { data } = await apiClient.post(`/v1/maintenance-schedules/templates/${id}/archive`);
  return data;
}
export async function deployTemplate(id: string, assetIds: string[]): Promise<{ assetsTargeted: number; plansCreated: number; plansRevived: number }> {
  const { data } = await apiClient.post(`/v1/maintenance-schedules/templates/${id}/deploy`, { assetIds });
  return data;
}
export async function listAllPlans(): Promise<PlansResult> {
  const { data } = await apiClient.get('/v1/maintenance-schedules/plans');
  return data;
}
export async function createPlan(input: { assetId: string; label: string; intervalDays: number; lastServiceAt?: string }): Promise<AssetPlan> {
  const { data } = await apiClient.post('/v1/maintenance-schedules/plans', input);
  return data;
}
export async function markPlanServiced(id: string): Promise<AssetPlan> {
  const { data } = await apiClient.post(`/v1/maintenance-schedules/plans/${id}/service`);
  return data;
}
export async function archivePlan(id: string): Promise<AssetPlan> {
  const { data } = await apiClient.post(`/v1/maintenance-schedules/plans/${id}/archive`);
  return data;
}
