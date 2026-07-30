import { apiClient } from './client';

export interface NotificationPreset {
  id: string;
  name: string;
  digestOnly: boolean;
  mutedTypes: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface NotificationPresetInput {
  name: string;
  digestOnly?: boolean;
  mutedTypes?: string[];
}

export async function listNotificationPresets(): Promise<{ items: NotificationPreset[] }> {
  const { data } = await apiClient.get('/v1/notification-presets');
  return data;
}
export async function createNotificationPreset(input: NotificationPresetInput): Promise<NotificationPreset> {
  const { data } = await apiClient.post('/v1/notification-presets', input);
  return data;
}
export async function updateNotificationPreset(id: string, input: Partial<NotificationPresetInput>): Promise<NotificationPreset> {
  const { data } = await apiClient.patch(`/v1/notification-presets/${id}`, input);
  return data;
}
export async function archiveNotificationPreset(id: string): Promise<NotificationPreset> {
  const { data } = await apiClient.post(`/v1/notification-presets/${id}/archive`);
  return data;
}
export async function deployNotificationPreset(id: string, userIds: string[]): Promise<{ applied: number }> {
  const { data } = await apiClient.post(`/v1/notification-presets/${id}/deploy`, { userIds });
  return data;
}
