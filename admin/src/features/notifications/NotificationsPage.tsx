import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { getAdminAlerts, type AlertSeverity } from '@/api/notifications';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState, EmptyState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

function severityBadge(severity: AlertSeverity) {
  if (severity === 'critical') return <Badge tone="danger">Critical</Badge>;
  if (severity === 'warning') return <Badge tone="warning">Warning</Badge>;
  return <Badge tone="neutral">Info</Badge>;
}

/** Operational alerts feed — what needs attention right now, from live data. */
export function NotificationsPage() {
  const query = useQuery({ queryKey: ['admin-alerts'], queryFn: getAdminAlerts, refetchInterval: 60_000 });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError) {
    return <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not load alerts.'} />;
  }
  const { alerts } = query.data!;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Alerts</h1>

      {alerts.length === 0 ? (
        <Card>
          <EmptyState title="All clear" description="No operational alerts need attention right now." />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-(--border-subtle)">
            {alerts.map((a) => (
              <li key={a.key} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  {severityBadge(a.severity)}
                  <span className="text-sm">{a.title}</span>
                </div>
                <Link to={a.href} className="text-sm font-medium text-accent-400 hover:underline">
                  Review →
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
