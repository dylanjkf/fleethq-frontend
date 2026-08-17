import { useQuery } from '@tanstack/react-query';
import { getSystemHealth } from '@/api/system';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

export function SystemHealthPage() {
  const query = useQuery({ queryKey: ['system-health'], queryFn: getSystemHealth, refetchInterval: 30_000 });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not load system health.'} />;
  }
  const health = query.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">System Health</h1>
        <Button variant="secondary" size="sm" onClick={() => query.refetch()}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Database connectivity</h2>
        </CardHeader>
        <CardBody className="flex gap-6">
          <div>
            <p className="text-xs text-(--text-tertiary)">Customer API (fleetos_app)</p>
            <Badge tone={health.database.customerApiConnected ? 'success' : 'danger'}>
              {health.database.customerApiConnected ? 'Connected' : 'Unreachable'}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-(--text-tertiary)">Admin platform (fleetos_admin)</p>
            <Badge tone={health.database.adminPlatformConnected ? 'success' : 'danger'}>
              {health.database.adminPlatformConnected ? 'Connected' : 'Unreachable'}
            </Badge>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Process</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-(--text-tertiary)">Uptime</p>
            <p className="text-sm font-medium">{formatUptime(health.process.uptimeSeconds)}</p>
          </div>
          <div>
            <p className="text-xs text-(--text-tertiary)">Node version</p>
            <p className="text-sm font-medium">{health.process.nodeVersion}</p>
          </div>
          <div>
            <p className="text-xs text-(--text-tertiary)">Environment</p>
            <p className="text-sm font-medium">{health.process.nodeEnv}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Version</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-(--text-tertiary)">API version</p>
            <p className="text-sm font-medium">{health.version.apiVersion}</p>
          </div>
          <div>
            <p className="text-xs text-(--text-tertiary)">Deployed commit</p>
            <p className="text-sm font-medium">{health.version.deployedCommit ?? 'Not reported by this deployment'}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Scheduler</h2>
            <Badge tone={health.scheduler.enabled ? 'success' : 'neutral'}>{health.scheduler.enabled ? 'Enabled' : 'Disabled'}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-xs text-(--text-tertiary)">
            Coarse health from the leader-election leases — last claim per task. No per-run pass/fail is persisted
            (granularity: {health.scheduler.granularity}).
          </p>
          {health.scheduler.tasks.length === 0 ? (
            <p className="text-sm text-(--text-tertiary)">No scheduler leases recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
                  <th className="py-2 pr-4 font-medium">Task</th>
                  <th className="py-2 pr-4 font-medium">Holder</th>
                  <th className="py-2 pr-4 font-medium">Last claimed</th>
                  <th className="py-2 font-medium">Lease held until</th>
                </tr>
              </thead>
              <tbody>
                {health.scheduler.tasks.map((t) => (
                  <tr key={t.task} className="border-b border-(--border-subtle) last:border-0">
                    <td className="py-2 pr-4 font-medium">{t.task}</td>
                    <td className="py-2 pr-4 text-(--text-secondary)">{t.holder}</td>
                    <td className="py-2 pr-4 text-(--text-secondary)">{new Date(t.lastClaimedAt).toLocaleString()}</td>
                    <td className="py-2 text-(--text-secondary)">{new Date(t.leaseHeldUntil).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Observability</h2>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-(--text-tertiary)">Error tracking ({health.observability.errorTracking.provider})</p>
              <Badge tone={health.observability.errorTracking.configured ? 'success' : 'warning'}>
                {health.observability.errorTracking.configured ? 'Configured' : 'Not configured'}
              </Badge>
            </div>
            {/* Honest gap: no in-app 5xx-rate aggregate exists — we say so rather than showing a fake graph. */}
            {!health.observability.errorTracking.summaryAvailable && (
              <p className="mt-1 text-xs text-(--text-tertiary)">{health.observability.errorTracking.note}</p>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-(--text-tertiary)">Email delivery ({health.observability.emailDelivery.provider})</p>
              <Badge tone={health.observability.emailDelivery.failureLogAvailable ? 'success' : 'warning'}>
                {health.observability.emailDelivery.failureLogAvailable ? 'Failure feed available' : 'No failure feed'}
              </Badge>
            </div>
            {!health.observability.emailDelivery.failureLogAvailable && (
              <p className="mt-1 text-xs text-(--text-tertiary)">{health.observability.emailDelivery.note}</p>
            )}
          </div>
        </CardBody>
      </Card>

      <p className="text-xs text-(--text-tertiary)">Checked at {new Date(health.checkedAt).toLocaleString()}</p>
    </div>
  );
}
