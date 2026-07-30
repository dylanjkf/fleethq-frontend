import { useQuery } from '@tanstack/react-query';
import { Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardMetrics, getUtilisationTrend, type UtilisationPoint } from '@/api/dashboard-layouts';
import { getAnalyticsSettings } from '@/api/analytics';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { MeterBar } from './MeterBar';

/**
 * A dependency-free area sparkline of the utilisation trend — same "no charting
 * library" approach as the Impact page. Y is 0–100%; the last point is
 * emphasised, and the company's target draws a dashed guide line.
 */
function TrendSparkline({ points, target }: { points: UtilisationPoint[]; target: number }) {
  const W = 260;
  const H = 48;
  const PAD = 3;
  const n = points.length;
  const x = (i: number) => (n === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (n - 1));
  const y = (v: number) => H - PAD - (Math.max(0, Math.min(100, v)) / 100) * (H - 2 * PAD);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.utilisation).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${H - PAD} L${x(0).toFixed(1)},${H - PAD} Z`;
  const last = points[n - 1];
  const targetY = y(target).toFixed(1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img"
      aria-label={`Utilisation trend over the last ${n} days, currently ${last.utilisation}%, target ${target}%`}>
      <line x1={PAD} y1={targetY} x2={W - PAD} y2={targetY} stroke="var(--text-tertiary)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" vectorEffect="non-scaling-stroke" />
      <path d={area} fill="var(--color-accent-600)" opacity="0.12" />
      <path d={line} fill="none" stroke="var(--color-accent-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(n - 1)} cy={y(last.utilisation)} r="2.5" fill="var(--color-accent-600)" />
    </svg>
  );
}

/**
 * Fleet utilisation — the share of the fleet working right now (assets on an
 * in-progress dispatch job ÷ active assets), from GET /dashboard/metrics, plus
 * the real accumulated day-by-day trend from GET /dashboard/utilisation-trend.
 *
 * The trend is genuine history the scheduler records daily — never a fabricated
 * back-fill. A brand-new company sees the live gauge with a note that the trend
 * fills in over the coming days, and the sparkline appears once there are two+
 * real days to plot.
 */
export function FleetUtilisationWidget() {
  const { can } = usePermissions();
  const allowed = can(PERMISSIONS.ASSETS_VIEW);

  const metricsQuery = useQuery({ queryKey: ['dashboard', 'metrics'], queryFn: getDashboardMetrics, enabled: allowed });
  const trendQuery = useQuery({ queryKey: ['dashboard', 'utilisation-trend'], queryFn: () => getUtilisationTrend(14), enabled: allowed });
  const configQuery = useQuery({ queryKey: ['analytics', 'settings'], queryFn: getAnalyticsSettings, enabled: allowed });

  const data = metricsQuery.data;
  const computed = data && data.assetsActive > 0 ? (data.assetsOnActiveJob / data.assetsActive) * 100 : 0;
  const override = configQuery.data?.overrides.utilisation;
  const percent = override ? override.value : computed;
  const target = configQuery.data?.settings.utilisationTarget ?? 80;
  const points = trendQuery.data?.points ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet utilisation</CardTitle>
        <Gauge className="h-4 w-4 text-(--text-tertiary)" />
      </CardHeader>
      <CardContent className="space-y-3">
        {!allowed ? (
          <p className="text-xs text-(--text-tertiary)">You don't have access to assets.</p>
        ) : metricsQuery.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : metricsQuery.isError ? (
          <p className="text-sm text-danger-500">Couldn't load utilisation.</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums text-(--text-primary)">{Math.round(percent)}%</span>
              <span className="text-xs text-(--text-tertiary)">{override ? 'manually adjusted' : 'on an active job right now'}</span>
            </div>
            <MeterBar
              label={override ? `Target ${target}%` : `${data?.assetsOnActiveJob ?? 0} of ${data?.assetsActive ?? 0} assets working`}
              percent={percent}
              tone="accent"
            />
            {override && (
              <p className="text-xs text-(--text-tertiary)">Manually adjusted{override.note ? ` — ${override.note}` : ''}{override.by ? ` (${override.by})` : ''}</p>
            )}
            {points.length >= 2 ? (
              <div>
                <TrendSparkline points={points} target={target} />
                <p className="mt-1 text-xs text-(--text-tertiary)">Daily average · last {points.length} days · target {target}%</p>
              </div>
            ) : (
              !trendQuery.isLoading && !override && <p className="text-xs text-(--text-tertiary)">The daily trend builds up over the coming days.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
