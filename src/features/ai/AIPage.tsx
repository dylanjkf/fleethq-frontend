import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Activity, ArrowRight, Brain, Sparkles, TriangleAlert, Wrench } from 'lucide-react';
import { getPredictiveMaintenanceSignals } from '@/api/predictive-maintenance';
import { getMaintenancePriority } from '@/api/operational-recommendations';
import { getAtRiskOperators } from '@/api/fatigue';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

/**
 * The AI / Fleet Intelligence hub: one command centre that unifies the signals
 * FleetOS already computes across the fleet — predictive maintenance,
 * maintenance prioritisation, and driver-fatigue risk — into a single "what
 * needs my attention" view, each card deep-linking to the module that owns the
 * detail. Every section is permission-gated and only queried when the user can
 * see that data.
 */
export function AIPage() {
  const { can } = usePermissions();
  const canMaintenance = can(PERMISSIONS.MAINTENANCE_VIEW);
  const canCompliance = can(PERMISSIONS.COMPLIANCE_VIEW);

  const predictiveQuery = useQuery({
    queryKey: ['ai', 'predictive'],
    queryFn: getPredictiveMaintenanceSignals,
    enabled: canMaintenance,
  });
  const priorityQuery = useQuery({
    queryKey: ['ai', 'maintenance-priority'],
    queryFn: getMaintenancePriority,
    enabled: canMaintenance,
  });
  const fatigueQuery = useQuery({
    queryKey: ['ai', 'fatigue'],
    queryFn: getAtRiskOperators,
    enabled: canCompliance,
  });

  const predictive = predictiveQuery.data ?? [];
  const priority = priorityQuery.data ?? [];
  const fatigue = fatigueQuery.data ?? [];
  const fatigueBreaches = fatigue.filter((f) => f.status === 'breach');

  const anyVisible = canMaintenance || canCompliance;

  // The single "attention needed" number across every intelligence source.
  const attentionCount = useMemo(
    () => predictive.length + priority.length + fatigue.length,
    [predictive.length, priority.length, fatigue.length],
  );

  const loading =
    (canMaintenance && (predictiveQuery.isLoading || priorityQuery.isLoading)) ||
    (canCompliance && fatigueQuery.isLoading);

  // A failed request must never read as "all clear" — that would tell the office
  // a fatigued driver or a maintenance risk isn't there when we simply couldn't
  // check. Track errors per visible source and say so instead.
  const anyError =
    (canMaintenance && (predictiveQuery.isError || priorityQuery.isError)) ||
    (canCompliance && fatigueQuery.isError);

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent-500" /> Fleet Intelligence
            </span>
          </PanelTitle>
          <PanelDescription>
            Every signal FleetHQ computes across your fleet, in one place — predictive maintenance, maintenance
            priority, and driver-fatigue risk. This is where the system tells you what needs attention before it
            becomes a problem.
          </PanelDescription>
        </div>
      </PanelHeader>

      {!anyVisible ? (
        <EmptyState
          icon={Brain}
          title="No intelligence available"
          description="Fleet Intelligence draws on maintenance and compliance data. Ask an administrator for access to those modules to see insights here."
        />
      ) : (
        <div className="space-y-6">
          {/* Headline attention banner */}
          <div className="flex items-center gap-4 rounded-(--radius-panel) border border-(--border-subtle) bg-gradient-to-br from-accent-500/10 to-transparent p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-500/15">
              <Brain className="h-6 w-6 text-accent-500" />
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-7 w-40" />
              ) : anyError ? (
                <>
                  <p className="text-lg font-semibold text-danger-500">Couldn&apos;t load some signals</p>
                  <p className="text-sm text-(--text-tertiary)">
                    One or more intelligence sources didn&apos;t respond — this is not an &quot;all clear&quot;. Check
                    the cards below and retry.
                  </p>
                </>
              ) : attentionCount === 0 ? (
                <>
                  <p className="text-lg font-semibold text-(--text-primary)">All clear</p>
                  <p className="text-sm text-(--text-tertiary)">No fleet signals need your attention right now.</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-(--text-primary)">
                    {attentionCount} {attentionCount === 1 ? 'signal needs' : 'signals need'} attention
                  </p>
                  <p className="text-sm text-(--text-tertiary)">
                    Across predictive maintenance, maintenance priority, and fatigue monitoring.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Predictive maintenance */}
            {canMaintenance && (
              <InsightCard
                icon={Activity}
                title="Predictive maintenance"
                to="/maintenance"
                linkLabel="Open Maintenance"
                loading={predictiveQuery.isLoading}
                isError={predictiveQuery.isError}
                onRetry={() => predictiveQuery.refetch()}
                count={predictive.length}
                emptyText="No recurring-fault or shared-unit patterns detected."
              >
                {predictive.slice(0, 4).map((s, i) => (
                  <SignalRow key={i} title={s.title} detail={s.summary} badge={`×${s.occurrenceCount}`} badgeVariant="warning" />
                ))}
              </InsightCard>
            )}

            {/* Maintenance priority */}
            {canMaintenance && (
              <InsightCard
                icon={Wrench}
                title="Maintenance priority"
                to="/maintenance"
                linkLabel="Open Maintenance"
                loading={priorityQuery.isLoading}
                isError={priorityQuery.isError}
                onRetry={() => priorityQuery.refetch()}
                count={priority.length}
                countVariant="warning"
                emptyText="No open maintenance jobs."
              >
                {priority.slice(0, 4).map((p) => (
                  <SignalRow
                    key={p.maintenanceJobId}
                    title={`${p.assetName}: ${p.title}`}
                    detail={p.reasons.join(' · ')}
                    badge={`${p.ageDays}d`}
                    badgeVariant={p.currentlyInUse ? 'danger' : 'neutral'}
                  />
                ))}
              </InsightCard>
            )}

            {/* Fatigue risk */}
            {canCompliance && (
              <InsightCard
                icon={TriangleAlert}
                title="Driver-fatigue risk"
                to="/compliance"
                linkLabel="Open Compliance"
                loading={fatigueQuery.isLoading}
                isError={fatigueQuery.isError}
                onRetry={() => fatigueQuery.refetch()}
                count={fatigueBreaches.length}
                countVariant="danger"
                emptyText="No operators are approaching or over a work-hours limit."
              >
                {fatigue.slice(0, 4).map((f) => (
                  <SignalRow
                    key={f.operatorId}
                    title={f.operatorName}
                    detail={[...f.breaches, ...f.approaching].map((flag) => flag.message).join(' · ')}
                    badge={f.status === 'breach' ? 'In breach' : 'Approaching'}
                    badgeVariant={f.status === 'breach' ? 'danger' : 'warning'}
                  />
                ))}
              </InsightCard>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

interface InsightCardProps {
  icon: typeof Activity;
  title: string;
  to: string;
  linkLabel: string;
  loading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  count: number;
  countVariant?: 'neutral' | 'warning' | 'danger';
  emptyText: string;
  children: React.ReactNode;
}

function InsightCard({ icon: Icon, title, to, linkLabel, loading, isError, onRetry, count, countVariant = 'neutral', emptyText, children }: InsightCardProps) {
  const hasChildren = Array.isArray(children) ? children.some(Boolean) : !!children;
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-accent-500" /> {title}
        </CardTitle>
        {!loading && !isError && count > 0 && <Badge variant={countVariant}>{count}</Badge>}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-1.5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          // Never fall through to emptyText on failure — that would read as
          // "nothing to worry about" when we simply couldn't load it.
          <div className="py-2 text-sm">
            <p className="text-danger-500">Couldn&apos;t load this — the data may be out of date.</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="mt-1 font-medium text-accent-600 hover:underline">
                Retry
              </button>
            )}
          </div>
        ) : hasChildren ? (
          children
        ) : (
          <p className="py-2 text-sm text-(--text-tertiary)">{emptyText}</p>
        )}
        <Link
          to={to}
          className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium text-accent-600 hover:underline"
        >
          {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

function SignalRow({
  title,
  detail,
  badge,
  badgeVariant,
}: {
  title: string;
  detail?: string;
  badge?: string;
  badgeVariant?: 'neutral' | 'warning' | 'danger' | 'success';
}) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-(--border-subtle) px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-(--text-primary)">{title}</p>
        {detail && <p className="line-clamp-2 text-xs text-(--text-tertiary)">{detail}</p>}
      </div>
      {badge && <Badge variant={badgeVariant ?? 'neutral'}>{badge}</Badge>}
    </div>
  );
}
