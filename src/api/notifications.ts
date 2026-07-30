import { apiClient } from './client';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}

export async function listNotifications(): Promise<NotificationList> {
  const { data } = await apiClient.get<NotificationList>('/v1/notifications');
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/v1/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/v1/notifications/read-all');
}

export interface DigestRecipient {
  userId: string;
  username: string;
  email: string | null;
  fullName: string;
  itemCount: number;
  subjects: string[];
}

export interface DigestResult {
  /** People who will actually be emailed (those with an email address). */
  recipientCount: number;
  /** People with pending items but no email — reached in-app only. */
  skippedCount: number;
  recipients: DigestRecipient[];
}

export async function previewDigest(): Promise<DigestResult> {
  const { data } = await apiClient.get<DigestResult>('/v1/notifications/digest/preview');
  return data;
}

export async function sendDigest(): Promise<DigestResult> {
  const { data } = await apiClient.post<DigestResult>('/v1/notifications/digest/send');
  return data;
}

export interface NotificationPreferences {
  digestOnly: boolean;
  mutedTypes: string[];
}

export interface NotificationTypeInfo {
  key: string;
  label: string;
}

export async function listNotificationTypes(): Promise<NotificationTypeInfo[]> {
  const { data } = await apiClient.get<NotificationTypeInfo[]>('/v1/notifications/types');
  return data;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await apiClient.get<NotificationPreferences>('/v1/notifications/preferences');
  return data;
}

export async function updateNotificationPreferences(
  input: Partial<Pick<NotificationPreferences, 'digestOnly' | 'mutedTypes'>>,
): Promise<NotificationPreferences> {
  const { data } = await apiClient.patch<NotificationPreferences>('/v1/notifications/preferences', input);
  return data;
}
