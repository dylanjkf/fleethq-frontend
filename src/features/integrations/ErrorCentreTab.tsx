import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { listConnections, listDeadLetters, retryDeadLetter } from '@/api/integrations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

const STATUS_VARIANT: Record<string, 'neutral' | 'warning' | 'success' | 'danger'> = {
  PENDING_RETRY: 'warning',
  RETRYING: 'warning',
  RESOLVED: 'success',
  DEAD: 'danger',
};

/**
 * Error Centre: one connection's dead letters at a time (pick from the
 * dropdown) — the Sync Dashboard's tiles already give the company-wide
 * pending/dead counts; this is where you actually see and act on a row.
 */
export function ErrorCentreTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectionId, setConnectionId] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const connectionsQuery = useQuery({ queryKey: ['integrations', 'connections'], queryFn: () => listConnections() });
  useEffect(() => {
    if (!connectionId && connectionsQuery.data?.items.length) setConnectionId(connectionsQuery.data.items[0].id);
  }, [connectionId, connectionsQuery.data]);

  const deadLettersQuery = useQuery({
    queryKey: ['integrations', 'dead-letters', connectionId],
    queryFn: () => listDeadLetters(connectionId, { pageSize: 100 }),
    enabled: !!connectionId,
  });

  const retryM = useMutation({
    mutationFn: retryDeadLetter,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', 'dead-letters', connectionId] });
      queryClient.invalidateQueries({ queryKey: ['integrations', 'dashboard'] });
      toast({
        title: updated.status === 'RESOLVED' ? 'Retry succeeded' : updated.status === 'DEAD' ? 'Retry failed — max attempts reached' : 'Retry failed, will retry again later',
        variant: updated.status === 'RESOLVED' ? 'success' : 'destructive',
      });
    },
    onError: (e) => toast({ title: 'Could not retry', description: describeApiError(e), variant: 'destructive' }),
  });

  const connections = connectionsQuery.data?.items ?? [];
  const items = deadLettersQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="max-w-xs space-y-1.5">
        <Select value={connectionId} onValueChange={setConnectionId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a connection" />
          </SelectTrigger>
          <SelectContent>
            {connections.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {connections.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No connections yet" description="Set one up on the Connections tab first." />
      ) : deadLettersQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : deadLettersQuery.isError ? (
        <ErrorState message={describeApiError(deadLettersQuery.error)} onRetry={() => deadLettersQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No dead letters" description="Rows that fail to sync land here — none right now." />
      ) : (
        <ul className="space-y-2">
          {items.map((dl) => (
            <li key={dl.id} className="rounded-lg border border-(--border-subtle) p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[dl.status] ?? 'neutral'}>{dl.status.replace('_', ' ')}</Badge>
                    <span className="text-xs text-(--text-tertiary)">Attempt {dl.attempts}</span>
                  </div>
                  <p className="mt-1 text-sm text-(--text-primary)">{dl.errorMessage}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === dl.id ? null : dl.id)}>
                    {expandedId === dl.id ? 'Hide payload' : 'View payload'}
                  </Button>
                  {canManage && dl.status !== 'RESOLVED' && (
                    <Button variant="secondary" size="sm" disabled={retryM.isPending} onClick={() => retryM.mutate(dl.id)}>
                      Retry now
                    </Button>
                  )}
                </div>
              </div>
              {expandedId === dl.id && (
                <pre className="mt-2 overflow-x-auto rounded-md bg-(--surface-2) p-2 text-xs text-(--text-secondary)">
                  {JSON.stringify(dl.rawPayload, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
