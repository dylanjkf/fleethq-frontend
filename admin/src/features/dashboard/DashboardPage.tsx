import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { getOverview, getDailySignups, getTrialsExpiring, getActivity } from '@/api/analytics';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';
import { SignupsChart } from './SignupsChart';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-(--text-tertiary)">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-(--text-tertiary)">{sub}</p>}
      </CardBody>
    </Card>
  );
}

export function DashboardPage() {
  const overviewQuery = useQuery({ queryKey: ['analytics', 'overview'], queryFn: getOverview });
  const signupsQuery = useQuery({ queryKey: ['analytics', 'signups'], queryFn: () => getDailySignups(30) });
  const trialsQuery = useQuery({ queryKey: ['analytics', 'trials-expiring'], queryFn: () => getTrialsExpiring(7) });
  const activityQuery = useQuery({ queryKey: ['analytics', 'activity'], queryFn: getActivity, refetchInterval: 60_000 });

  if (overviewQuery.isLoading) return <PageSpinner />;
  if (overviewQuery.isError) {
    return <ErrorState message={overviewQuery.error instanceof ApiClientError ? overviewQuery.error.message : 'Could not load the dashboard.'} />;
  }
  const overview = overviewQuery.data!;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Active organisations"
          value={overview.organisations.active}
          sub={`${overview.organisations.total} total · +${overview.organisations.newToday} today`}
        />
        <StatCard label="On trial" value={overview.trials.active} sub={`${overview.organisations.cancelled} cancelled`} />
        <StatCard label="Total users" value={overview.users.total} sub={`+${overview.users.newLast30Days} / 30d · +${overview.users.newToday} today`} />
        <StatCard label="Fleet" value={overview.fleet.assets} sub={`${overview.fleet.operators} operators`} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Inspections" value={overview.operations.inspections} sub={`+${overview.operations.inspectionsToday} today`} />
        <StatCard label="Open defects" value={overview.operations.openDefects} sub={`+${overview.operations.defectsReportedToday} reported today`} />
        <StatCard label="New signups today" value={overview.organisations.newToday} />
        <StatCard label="Suspended orgs" value={overview.organisations.suspended} />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Revenue</h2>
        </CardHeader>
        <CardBody>
          {overview.revenue.billingConfigured ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-(--text-tertiary)">MRR</p>
                <p className="text-lg font-semibold">
                  {overview.revenue.mrr != null ? `${overview.revenue.currency?.toUpperCase() ?? ''} ${overview.revenue.mrr.toFixed(2)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-(--text-tertiary)">ARR</p>
                <p className="text-lg font-semibold">
                  {overview.revenue.arr != null ? `${overview.revenue.currency?.toUpperCase() ?? ''} ${overview.revenue.arr.toFixed(2)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-(--text-tertiary)">Churn (30d)</p>
                <p className="text-lg font-semibold">{overview.churn.canceledLast30Days}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-(--text-tertiary)">Billing is not configured on this deployment — revenue figures are unavailable.</p>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Signups, last 30 days</h2>
          </CardHeader>
          <CardBody>{signupsQuery.data && <SignupsChart data={signupsQuery.data} />}</CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Trials expiring within 7 days</h2>
          </CardHeader>
          <CardBody className="!px-0 !py-0">
            {trialsQuery.data?.length ? (
              <ul className="divide-y divide-(--border-subtle)">
                {trialsQuery.data.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <Link to={`/organisations/${t.id}`} className="font-medium hover:text-accent-400">
                      {t.name}
                    </Link>
                    <span className="text-(--text-tertiary)">{new Date(t.trialEndsAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-(--text-tertiary)">No trials expiring soon.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Live activity</h2>
        </CardHeader>
        <CardBody className="!px-0 !py-0">
          {activityQuery.data?.items.length ? (
            <ul className="divide-y divide-(--border-subtle)">
              {activityQuery.data.items.map((e, idx) => (
                <li key={`${e.type}-${idx}`} className="flex items-center justify-between px-5 py-3 text-sm">
                  <Link to={e.href} className="flex items-center gap-2 hover:text-accent-400">
                    <Badge tone={e.tone === 'danger' ? 'danger' : e.tone === 'warning' ? 'warning' : e.tone === 'success' ? 'success' : 'neutral'}>{e.type.replace(/_/g, ' ')}</Badge>
                    <span>{e.title}</span>
                    {e.subtitle && <span className="text-(--text-tertiary)">· {e.subtitle}</span>}
                  </Link>
                  <span className="shrink-0 text-xs text-(--text-tertiary)">{new Date(e.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-(--text-tertiary)">No recent activity.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Subscriptions</h2>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          {Object.entries(overview.subscriptions).map(([status, count]) => (
            <Badge key={status} tone="neutral">
              {status}: {count}
            </Badge>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
