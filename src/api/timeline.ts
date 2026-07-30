import { apiClient } from './client';
import type { Paginated } from './types';

export type TimelineEntityType =
  | 'ASSET'
  | 'OPERATOR'
  | 'ATTACHED_UNIT'
  | 'USER'
  | 'ROLE'
  | 'COMPANY'
  | 'JOB'
  | 'MAINTENANCE_JOB'
  | 'COMPLIANCE_DOCUMENT'
  | 'CHECKLIST_TEMPLATE'
  | 'CHECKLIST_SUBMISSION'
  | 'CUSTOMER'
  | 'DEPOT'
  | 'PART';

export interface TimelineEvent {
  id: string;
  entityType: TimelineEntityType;
  entityId: string;
  eventType: string;
  summary: string;
  payload: Record<string, unknown> | null;
  actorType: 'USER' | 'SYSTEM';
  actorUser?: { id: string; fullName: string } | null;
  occurredAt: string;
}

export async function listTimeline(entityType: TimelineEntityType, entityId: string): Promise<Paginated<TimelineEvent>> {
  const { data } = await apiClient.get<Paginated<TimelineEvent>>('/v1/timeline', { params: { entityType, entityId, pageSize: 100 } });
  return data;
}

/** Company-wide recent-activity feed for the dashboard widget. */
export async function getRecentTimeline(limit = 15): Promise<{ items: TimelineEvent[] }> {
  const { data } = await apiClient.get<{ items: TimelineEvent[] }>('/v1/timeline/recent', { params: { limit } });
  return data;
}
