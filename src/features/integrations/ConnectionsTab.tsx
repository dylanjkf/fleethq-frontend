import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plug, Plus } from 'lucide-react';
import {
  archiveConnection,
  createConnection,
  listConnections,
  updateConnection,
  TARGET_ENTITY_LABELS,
  type CreateConnectionInput,
  type IntegrationConnection,
} from '@/api/integrations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConnectionFormDialog } from '@/features/integrations/ConnectionFormDialog';
import { ConnectionDetailDrawer } from '@/features/integrations/ConnectionDetailDrawer';
import { SyncStatusBadge } from '@/features/integrations/SyncStatusBadge';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

const KEY = ['integrations', 'connections'];

/** Connector Library / Connection Manager: create, edit, archive, and drill into a connection's mappings + sync history. */
export function ConnectionsTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IntegrationConnection | undefined>();
  const [archiving, setArchiving] = useState<IntegrationConnection | undefined>();
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: KEY, queryFn: () => listConnections() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const createM = useMutation({
    mutationFn: (v: CreateConnectionInput) => createConnection(v),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      toast({ title: 'Connection created', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not create connection', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: CreateConnectionInput }) => updateConnection(id, v),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      toast({ title: 'Connection updated', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not update connection', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveConnection,
    onSuccess: () => {
      invalidate();
      setArchiving(undefined);
      toast({ title: 'Connection archived', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not archive connection', description: describeApiError(e), variant: 'destructive' }),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--text-tertiary)">CSV/Excel, generic REST poller, and incoming webhook connectors.</p>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New connection
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No connections yet"
          description={canManage ? 'Connect a CSV import, a REST API to poll, or set up an incoming webhook.' : 'Connections set up by your team appear here.'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Connector</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Last sync</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetailId(c.id)}>
                <TableCell className="font-medium text-(--text-primary)">
                  {c.name}
                  {!c.isEnabled && (
                    <Badge variant="neutral" className="ml-2">
                      Disabled
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{c.connectorType}</TableCell>
                <TableCell>{TARGET_ENTITY_LABELS[c.targetEntity]}</TableCell>
                <TableCell>{c.lastSyncStatus ? <SyncStatusBadge status={c.lastSyncStatus} /> : <span className="text-(--text-tertiary)">Never run</span>}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  {canManage && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setArchiving(c)}>
                        Archive
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConnectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        connection={editing}
        isSubmitting={createM.isPending || updateM.isPending}
        onSubmit={async (v) => {
          if (editing) await updateM.mutateAsync({ id: editing.id, v });
          else await createM.mutateAsync(v);
        }}
      />
      <ConnectionDetailDrawer connectionId={detailId} canManage={canManage} onOpenChange={(o) => !o && setDetailId(null)} />
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Archive this connection?"
        description={`"${archiving?.name ?? ''}" will stop syncing and disappear from the active list. Its history is kept.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveM.mutate(archiving.id)}
        isConfirming={archiveM.isPending}
      />
    </div>
  );
}
