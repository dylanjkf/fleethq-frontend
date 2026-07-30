import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardMetrics } from '@/api/dashboard-layouts';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

/**
 * A tile's delta chip. `betterWhen` says which direction is good news, so the
 * chip is coloured green for an improving move and red for a worsening one
 * (a rise in "Open defects" is red; a rise in "Assets active" is green). No
 * chip is shown when there's no prior day to compare against, or no change.
 */
function DeltaChip({ delta, betterWhen }: { delta: number | undefined; betterWhen: 'higher' | 'lower' }) {
  if (delta === undefined || delta === 0) return null;
  const good = betterWhen === 'higher' ? delta > 0 : delta < 0;
  const sign = delta > 0 ? '+' : '';
  return (
    <span className={`text-xs font-medium tabular-nums ${good ? 'text-success-500' : 'text-danger-500'}`}>
      {sign}
      {delta}
    </span>
  );
}

function Stat({ label, value, tone, delta, betterWhen }: { label: string; value: number | undefined; tone?: 'danger' | 'warning'; delta?: number; betterWhen: 'higher' | 'lower' }) {
  const valueColor = value && value > 0 && tone === 'danger' ? 'text-danger-500' : value && value > 0 && tone === 'warning' ? 'text-warning-500' : 'text-(--text-primary)';
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-(--text-tertiary)">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <p className={`text-2xl font-semibold tabular-nums ${valueColor}`}>{value ?? '—'}</p>
        <DeltaChip delta={delta} betterWhen={betterWhen} />
      </div>
    </div>
  );
}

/**
 * Operations snapshot — the morning "what's running / what needs a decision"
 * stat row. Every number is live from GET /dashboard/metrics; the "vs yesterday"
 * deltas are real (current value − the most recent prior-day snapshot average),
 * shown only once at least one prior day has been recorded — never invented.
 */
export function OperationsSnapshotWidget() {
  const { can } = usePermissions();
  const canAssets = can(PERMISSIONS.ASSETS_VIEW);

  const metricsQuery = useQuery({ queryKey: ['dashboard', 'metrics'], queryFn: getDashboardMetrics, enabled: canAssets });
  const m = metricsQuery.data;
  const d = m?.deltas ?? undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operations snapshot</CardTitle>
        <Activity className="h-4 w-4 text-(--text-tertiary)" />
      </CardHeader>
      <CardContent className="space-y-2">
        {!canAssets ? (
          <p className="text-xs text-(--text-tertiary)">You don't have access to assets.</p>
        ) : metricsQuery.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : metricsQuery.isError ? (
          <p className="text-sm text-danger-500">Couldn't load operations.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Assets active" value={m?.assetsActive} delta={d?.assetsActive} betterWhen="higher" />
              <Stat label="In workshop" value={m?.assetsInWorkshop} tone="warning" delta={d?.assetsInWorkshop} betterWhen="lower" />
              <Stat label="Services due" value={m?.servicesDue} tone="warning" delta={d?.servicesDue} betterWhen="lower" />
              <Stat label="Open defects" value={m?.openDefects} tone="danger" delta={d?.openDefects} betterWhen="lower" />
            </div>
            <p className="text-xs text-(--text-tertiary)">
              {m?.comparedTo ? `Change since ${m.comparedTo}` : 'Day-over-day change appears once a prior day is recorded.'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
