import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboard, listConnections, triggerSync, TARGET_ENTITY_LABELS } from '@/api/integrations';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SyncStatusBadge } from '@/features/integrations/SyncStatusBadge';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

/** Sync Dashboard: connection health at a glance, pending dead letters, and recent runs across every connection. */
export function SyncDashboardTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const dashboardQuery = useQuery({ queryKey: ['integrations', 'dashboard'], queryFn: getDashboard });
  const connectionsQuery = useQuery({ queryKey: ['integrations', 'connections'], queryFn: () => listConnections() });

  const syncM = useMutation({
    mutationFn: (connectionId: string) => triggerSync(connectionId),
    onMutate: (connectionId) => setSyncingId(connectionId),
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['integrations', 'connections'] });
      toast({
        title: `Sync ${run.status.toLowerCase().replace('_', ' ')}`,
        description: `${run.recordsSucceeded} succeeded, ${run.recordsFailed} failed of ${run.recordsProcessed} processed.`,
        variant: run.status === 'FAILURE' ? 'destructive' : run.status === 'PARTIAL_FAILURE' ? undefined : 'success',
      });
    },
    onError: (e) => toast({ title: 'Sync failed to run', description: describeApiError(e), variant: 'destructive' }),
    onSettled: () => setSyncingId(null),
  });

  if (dashboardQuery.isLoading || connectionsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-36" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (dashboardQuery.isError) {
    return <ErrorState message={describeApiError(dashboardQuery.error)} onRetry={() => dashboardQuery.refetch()} />;
  }

  const dashboard = dashboardQuery.data!;
  const connections = connectionsQuery.data?.items ?? [];
  const health = dashboard.connectionsByHealth;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <StatTile label="Connections" value={dashboard.totalConnections} />
        <StatTile label="Healthy (last sync OK)" value={health.SUCCESS ?? 0} tone="ok" />
        <StatTile label="Partial failures" value={health.PARTIAL_FAILURE ?? 0} tone={(health.PARTIAL_FAILURE ?? 0) > 0 ? 'warn' : 'neutral'} />
        <StatTile label="Failing" value={health.FAILURE ?? 0} tone={(health.FAILURE ?? 0) > 0 ? 'bad' : 'neutral'} />
        <StatTile label="Pending dead letters" value={dashboard.pendingDeadLetters} tone={dashboard.pendingDeadLetters > 0 ? 'warn' : 'neutral'} />
        <StatTile label="Dead (max retries)" value={dashboard.deadDeadLetters} tone={dashboard.deadDeadLetters > 0 ? 'bad' : 'neutral'} />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-(--text-primary)">Connections</p>
        {connections.length === 0 ? (
          <p className="text-sm text-(--text-tertiary)">No connections yet — set one up on the Connections tab.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last synced</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-(--text-primary)">{c.name}</TableCell>
                  <TableCell>{TARGET_ENTITY_LABELS[c.targetEntity]}</TableCell>
                  <TableCell>{c.lastSyncStatus ? <SyncStatusBadge status={c.lastSyncStatus} /> : <span className="text-(--text-tertiary)">Never run</span>}</TableCell>
                  <TableCell className="text-(--text-tertiary)">{c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : '—'}</TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <Button variant="secondary" size="sm" disabled={syncM.isPending && syncingId === c.id} onClick={() => syncM.mutate(c.id)}>
                        {syncM.isPending && syncingId === c.id ? 'Syncing…' : 'Sync now'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-(--text-primary)">Recent sync runs (all connections)</p>
        {dashboard.recentRuns.length === 0 ? (
          <p className="text-sm text-(--text-tertiary)">No syncs yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {dashboard.recentRuns.map((run) => (
              <li key={run.id} className="flex items-center justify-between rounded-lg border border-(--border-subtle) px-3 py-2 text-sm">
                <SyncStatusBadge status={run.status} />
                <span className="text-(--text-tertiary)" data-tabular>
                  {run.recordsSucceeded}/{run.recordsProcessed} succeeded · {new Date(run.startedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'ok' | 'warn' | 'bad' }) {
  const toneClass =
    tone === 'bad' ? 'text-danger-500' : tone === 'warn' ? 'text-warning-500' : tone === 'ok' ? 'text-success-500' : 'text-(--text-primary)';
  return (
    <div className="min-w-[130px] flex-1 rounded-lg border border-(--border-subtle) bg-(--surface-1) px-4 py-3">
      <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      <div className="mt-0.5 text-xs text-(--text-tertiary)">{label}</div>
    </div>
  );
}
