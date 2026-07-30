import { apiClient } from './client';
import type { Paginated } from './types';

/**
 * A single security audit-log entry, as returned by GET /v1/audit-logs. Mirrors
 * apps/api/src/audit's response shape exactly — this is the append-only access/
 * security record (authentications, privilege changes, data exports/erasures),
 * separate from the per-entity business Timeline.
 */
export interface AuditLogEntry {
  id: string;
  companyId: string;
  actorUserId: string | null;
  actorLabel: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  outcome: 'success' | 'failure';
  ip: string | null;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListAuditLogsParams {
  page?: number;
  pageSize?: number;
  /** Exact action name, e.g. `auth.login_failed`. */
  action?: string;
  outcome?: 'success' | 'failure';
  actorUserId?: string;
  targetType?: string;
  /** ISO8601 — only events at/after this instant (inclusive). */
  from?: string;
  /** ISO8601 — only events at/before this instant (inclusive). */
  to?: string;
}

/** The company's security audit trail, newest first — company-scoped by RLS on the server. */
export async function listAuditLogs(params: ListAuditLogsParams = {}): Promise<Paginated<AuditLogEntry>> {
  const { data } = await apiClient.get<Paginated<AuditLogEntry>>('/v1/audit-logs', { params });
  return data;
}
