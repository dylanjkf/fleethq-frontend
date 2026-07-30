import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getRecentTimeline, type TimelineEvent } from '@/api/timeline';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

/** Compact relative time — "just now", "12m", "3h", "2d". */
function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Only ASSET events have a detail page today; link those, leave the rest as text. */
function eventHref(e: TimelineEvent): string | null {
  return e.entityType === 'ASSET' ? `/fleet/${e.entityId}` : null;
}

/**
 * Recent Activity dashboard widget — a live feed over the company-wide Timeline
 * (GET /v1/timeline/recent). Every entity in FleetOS writes an immutable
 * timeline event, so this is the office's single "what just happened" glance.
 */
export function RecentActivityWidget() {
  const { can } = usePermissions();
  const allowed = can(PERMISSIONS.TIMELINE_VIEW);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['timeline', 'recent', 'dashboard'],
    queryFn: () => getRecentTimeline(12),
    enabled: allowed,
    refetchInterval: 60_000,
  });

  const items = data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <History className="h-4 w-4 text-(--text-tertiary)" />
      </CardHeader>
      <CardContent>
        {!allowed ? (
          <p className="text-xs text-(--text-tertiary)">You don't have access to the timeline.</p>
        ) : isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-sm text-danger-500">Unavailable</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-(--text-tertiary)">No activity recorded yet. Events appear here as work happens across the fleet.</p>
        ) : (
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {items.map((e) => {
              const href = eventHref(e);
              const body = (
                <>
                  <span className="text-(--text-primary)">{e.summary}</span>
                  {e.actorUser && <span className="text-(--text-tertiary)"> · {e.actorUser.fullName}</span>}
                </>
              );
              return (
                <li key={e.id} className="flex items-start justify-between gap-2 text-xs">
                  <span className="min-w-0">{href ? <Link to={href} className="hover:underline">{body}</Link> : body}</span>
                  <span className="shrink-0 tabular-nums text-(--text-tertiary)" title={new Date(e.occurredAt).toLocaleString()}>
                    {ago(e.occurredAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
