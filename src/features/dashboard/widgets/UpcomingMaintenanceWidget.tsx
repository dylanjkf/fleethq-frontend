import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { listAllPlans, type AssetPlan } from '@/api/maintenance-schedules';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

/** "due in 5 days" / "3 days overdue" — a human phrase for a plan's clock. */
function dueLabel(plan: AssetPlan): string {
  if (plan.daysUntilDue < 0) return `${Math.abs(plan.daysUntilDue)}d overdue`;
  if (plan.daysUntilDue === 0) return 'due today';
  return `in ${plan.daysUntilDue}d`;
}

/**
 * Upcoming Maintenance dashboard widget — the head of the service queue from
 * GET /v1/maintenance-schedules/plans (overdue first, then soonest-due). Shows
 * how many plans are overdue / due soon and lists the next few, each linking
 * through to the asset.
 */
export function UpcomingMaintenanceWidget() {
  const { can } = usePermissions();
  const allowed = can(PERMISSIONS.MAINTENANCE_VIEW);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['maintenance-schedules', 'plans', 'dashboard'],
    queryFn: listAllPlans,
    enabled: allowed,
  });

  // Only surface what needs attention — overdue or due soon — soonest first.
  const attention = (data?.items ?? []).filter((p) => p.status !== 'ok').slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Maintenance</CardTitle>
        <Wrench className="h-4 w-4 text-(--text-tertiary)" />
      </CardHeader>
      <CardContent className="space-y-3">
        {!allowed ? (
          <p className="text-xs text-(--text-tertiary)">You don't have access to maintenance.</p>
        ) : isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : isError ? (
          <p className="text-sm text-danger-500">Unavailable</p>
        ) : (
          <>
            <div className="flex gap-2">
              <Badge variant={(data?.overdueCount ?? 0) > 0 ? 'danger' : 'neutral'}>{data?.overdueCount ?? 0} overdue</Badge>
              <Badge variant={(data?.dueSoonCount ?? 0) > 0 ? 'warning' : 'neutral'}>{data?.dueSoonCount ?? 0} due soon</Badge>
            </div>
            {attention.length === 0 ? (
              <p className="text-xs text-(--text-tertiary)">Nothing due in the next two weeks — you're on top of servicing.</p>
            ) : (
              <ul className="space-y-1.5">
                {attention.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link to={`/fleet/${p.assetId}`} className="min-w-0 truncate text-(--text-primary) hover:underline">
                      <span className="font-medium">{p.asset?.name ?? 'Asset'}</span>
                      <span className="text-(--text-tertiary)"> · {p.label}</span>
                    </Link>
                    <span className={`shrink-0 tabular-nums text-xs ${p.status === 'overdue' ? 'text-danger-500' : 'text-warning-500'}`}>
                      {dueLabel(p)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
