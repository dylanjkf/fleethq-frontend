import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getCompliancePosition, type ComplianceRate } from '@/api/compliance';
import { getAnalyticsSettings } from '@/api/analytics';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { MeterBar, type MeterTone } from './MeterBar';

/** Green/amber/red by the company's own thresholds (defaults 95/80). */
function toneFor(percent: number, good: number, warn: number): MeterTone {
  if (percent >= good) return 'success';
  if (percent >= warn) return 'warning';
  return 'danger';
}

/** current ÷ total as a whole percent; 100% when there's nothing to track yet. */
function pct(r: ComplianceRate): number {
  return r.total > 0 ? Math.round((r.current / r.total) * 100) : 100;
}

const ROWS: { key: keyof Awaited<ReturnType<typeof getCompliancePosition>>; label: string; unit: string }[] = [
  { key: 'prestart', label: 'Pre-start inspections (today)', unit: 'assets' },
  { key: 'driverLicences', label: 'Driver licences current', unit: 'operators' },
  { key: 'deliveries', label: 'Deliveries completed successfully', unit: 'deliveries' },
  { key: 'roadworthy', label: 'Roadworthy current', unit: 'assets' },
  { key: 'insurance', label: 'Insurance current', unit: 'assets' },
  { key: 'registration', label: 'Registration current', unit: 'assets' },
];

/**
 * Compliance position — six live currency rates (0–100%), each a small
 * horizontal bar showing "X of Y" for its factor: today's pre-start
 * inspections, driver licences current, deliveries completed successfully, and
 * roadworthy / insurance / registration currency. Every figure is recomputed on
 * read from GET /compliance-documents/position and the query refetches on a
 * short interval + on window focus, so the bars track changes automatically.
 * Bar colours follow the company's own green/amber thresholds (analytics:manage).
 */
export function CompliancePositionWidget() {
  const { can } = usePermissions();
  const allowed = can(PERMISSIONS.COMPLIANCE_VIEW);

  const positionQuery = useQuery({
    queryKey: ['compliance', 'position'],
    queryFn: getCompliancePosition,
    enabled: allowed,
    refetchInterval: 30_000,
  });
  const configQuery = useQuery({ queryKey: ['analytics', 'settings'], queryFn: getAnalyticsSettings, enabled: allowed });
  const good = configQuery.data?.settings.goodThreshold ?? 95;
  const warn = configQuery.data?.settings.warnThreshold ?? 80;
  const prestartOverride = configQuery.data?.overrides.prestart;

  const data = positionQuery.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance position</CardTitle>
        {allowed ? (
          <Link to="/compliance" className="text-xs font-medium text-accent-600 hover:underline">
            View all
          </Link>
        ) : (
          <ShieldCheck className="h-4 w-4 text-(--text-tertiary)" />
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!allowed ? (
          <p className="text-xs text-(--text-tertiary)">You don't have access to compliance.</p>
        ) : positionQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : positionQuery.isError || !data ? (
          <p className="text-sm text-danger-500">Couldn't load compliance position.</p>
        ) : (
          ROWS.map((row) => {
            const rate = data[row.key];
            // Pre-start keeps its analytics override (the other rates are pure computed).
            const override = row.key === 'prestart' ? prestartOverride : undefined;
            const percent = override ? override.value : pct(rate);
            return (
              <MeterBar
                key={row.key}
                label={row.label}
                percent={percent}
                tone={toneFor(percent, good, warn)}
                sublabel={
                  override
                    ? `Manually adjusted${override.note ? ` — ${override.note}` : ''}`
                    : rate.total > 0
                      ? `${rate.current} of ${rate.total} ${row.unit}`
                      : `No ${row.unit} to track yet`
                }
              />
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
