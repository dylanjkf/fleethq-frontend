import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, Plus, Upload } from 'lucide-react';
import {
  archiveFieldMapping,
  createFieldMapping,
  getConnection,
  listSyncRuns,
  triggerSync,
  updateFieldMapping,
  type FieldMappingInput,
  type IntegrationFieldMapping,
} from '@/api/integrations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SyncStatusBadge } from '@/features/integrations/SyncStatusBadge';
import { FieldMappingFormDialog } from '@/features/integrations/FieldMappingFormDialog';
import { parseCsvFile } from '@/lib/csv';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

/**
 * A connection's detail: the Data Mapping Designer (field mappings table) and
 * "Sync now" — for a CSV connector this parses a file client-side (reusing
 * the same CSV parser the bulk-imports UI uses; no file bytes are ever sent
 * to the API) before posting rows; for REST/WEBHOOK connectors it just
 * triggers a sync (REST fetches its own rows, WEBHOOK connections are driven
 * by the linked incoming webhook instead).
 */
export function ConnectionDetailDrawer({ connectionId, canManage, onOpenChange }: { connectionId: string | null; canManage: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mappingFormOpen, setMappingFormOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<IntegrationFieldMapping | undefined>();
  const [archivingMapping, setArchivingMapping] = useState<IntegrationFieldMapping | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const connectionQuery = useQuery({
    queryKey: ['integrations', 'connections', connectionId],
    queryFn: () => getConnection(connectionId!),
    enabled: !!connectionId,
  });
  const syncRunsQuery = useQuery({
    queryKey: ['integrations', 'sync-runs', connectionId],
    queryFn: () => listSyncRuns(connectionId!, { pageSize: 10 }),
    enabled: !!connectionId,
  });

  const invalidateMappings = () => queryClient.invalidateQueries({ queryKey: ['integrations', 'connections', connectionId] });
  const invalidateSyncRuns = () => {
    queryClient.invalidateQueries({ queryKey: ['integrations', 'sync-runs', connectionId] });
    queryClient.invalidateQueries({ queryKey: ['integrations', 'dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['integrations', 'connections'] });
  };

  const createMappingM = useMutation({
    mutationFn: (v: FieldMappingInput) => createFieldMapping(connectionId!, v),
    onSuccess: () => {
      invalidateMappings();
      setMappingFormOpen(false);
      toast({ title: 'Mapping added', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not add mapping', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateMappingM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: FieldMappingInput }) => updateFieldMapping(id, v),
    onSuccess: () => {
      invalidateMappings();
      setMappingFormOpen(false);
      toast({ title: 'Mapping updated', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not update mapping', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveMappingM = useMutation({
    mutationFn: archiveFieldMapping,
    onSuccess: () => {
      invalidateMappings();
      setArchivingMapping(undefined);
      toast({ title: 'Mapping removed', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not remove mapping', description: describeApiError(e), variant: 'destructive' }),
  });
  const syncM = useMutation({
    mutationFn: (rows?: Record<string, unknown>[]) => triggerSync(connectionId!, rows),
    onSuccess: (run) => {
      invalidateSyncRuns();
      toast({
        title: `Sync ${run.status.toLowerCase().replace('_', ' ')}`,
        description: `${run.recordsSucceeded} succeeded, ${run.recordsFailed} failed of ${run.recordsProcessed} processed.`,
        variant: run.status === 'FAILURE' ? 'destructive' : run.status === 'PARTIAL_FAILURE' ? undefined : 'success',
      });
    },
    onError: (e) => toast({ title: 'Sync failed to run', description: describeApiError(e), variant: 'destructive' }),
  });

  async function handleCsvUpload(file: File) {
    try {
      const parsed = await parseCsvFile(file);
      await syncM.mutateAsync(parsed.rows as unknown as Record<string, unknown>[]);
    } catch {
      toast({ title: 'Could not read that file', description: "Make sure it's a valid CSV.", variant: 'destructive' });
    }
  }

  const connection = connectionQuery.data;
  const mappings = [...(connection?.fieldMappings ?? [])].sort((a, b) => a.order - b.order);

  return (
    <Drawer open={!!connectionId} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>{connection?.name ?? 'Connection'}</DrawerTitle>
        </DrawerHeader>

        {connectionQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : connection ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="neutral">{connection.connectorType}</Badge>
              <Badge variant="neutral">{connection.direction}</Badge>
              <Badge variant="accent">{connection.targetEntity}</Badge>
              {connection.lastSyncStatus && <SyncStatusBadge status={connection.lastSyncStatus} />}
            </div>

            {/* Sync now */}
            {canManage && (
              <div className="rounded-lg border border-(--border-subtle) p-3">
                <p className="mb-2 text-sm font-medium text-(--text-primary)">Sync now</p>
                {connection.connectorType === 'CSV' ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleCsvUpload(file);
                        e.target.value = '';
                      }}
                    />
                    <Button size="sm" disabled={syncM.isPending} onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4" /> {syncM.isPending ? 'Syncing…' : 'Upload CSV and sync'}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" disabled={syncM.isPending} onClick={() => syncM.mutate(undefined)}>
                    {syncM.isPending ? 'Syncing…' : 'Run sync now'}
                  </Button>
                )}
              </div>
            )}

            {/* Data Mapping Designer */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium text-(--text-primary)">
                  <ArrowUpDown className="h-4 w-4" /> Field mappings
                </p>
                {canManage && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingMapping(undefined);
                      setMappingFormOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add mapping
                  </Button>
                )}
              </div>
              {mappings.length === 0 ? (
                <EmptyState title="No field mappings yet" description="Map external columns to FleetHQ fields before syncing." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>External field</TableHead>
                      <TableHead>FleetHQ field</TableHead>
                      <TableHead>Transform</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell data-tabular>{m.order}</TableCell>
                        <TableCell>{m.externalField}</TableCell>
                        <TableCell className="font-medium text-(--text-primary)">{m.fleetField}</TableCell>
                        <TableCell>{m.transform !== 'NONE' ? <Badge variant="neutral">{m.transform}</Badge> : '—'}</TableCell>
                        <TableCell>{m.isRequired ? <Badge variant="warning">Required</Badge> : '—'}</TableCell>
                        <TableCell className="text-right">
                          {canManage && (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingMapping(m);
                                  setMappingFormOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setArchivingMapping(m)}>
                                Remove
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Recent sync runs */}
            <div>
              <p className="mb-2 text-sm font-medium text-(--text-primary)">Recent sync runs</p>
              {(syncRunsQuery.data?.items.length ?? 0) === 0 ? (
                <p className="text-sm text-(--text-tertiary)">No syncs yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {syncRunsQuery.data!.items.map((run) => (
                    <li key={run.id} className="flex items-center justify-between rounded-lg border border-(--border-subtle) px-3 py-2 text-sm">
                      <div>
                        <SyncStatusBadge status={run.status} />
                        <span className="ml-2 text-(--text-tertiary)">{run.trigger === 'MANUAL' ? 'Manual' : 'Scheduled'}</span>
                      </div>
                      <div className="text-(--text-tertiary)" data-tabular>
                        {run.recordsSucceeded}/{run.recordsProcessed} succeeded · {new Date(run.startedAt).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        {connection && (
          <FieldMappingFormDialog
            open={mappingFormOpen}
            onOpenChange={setMappingFormOpen}
            mapping={editingMapping}
            targetEntity={connection.targetEntity}
            nextOrder={mappings.length}
            isSubmitting={createMappingM.isPending || updateMappingM.isPending}
            onSubmit={async (v) => {
              if (editingMapping) await updateMappingM.mutateAsync({ id: editingMapping.id, v });
              else await createMappingM.mutateAsync(v);
            }}
          />
        )}
        <ConfirmDialog
          open={!!archivingMapping}
          onOpenChange={(o) => !o && setArchivingMapping(undefined)}
          title="Remove this field mapping?"
          description={`"${archivingMapping?.externalField ?? ''}" → "${archivingMapping?.fleetField ?? ''}" will no longer be applied on sync.`}
          confirmLabel="Remove"
          variant="destructive"
          onConfirm={() => archivingMapping && archiveMappingM.mutate(archivingMapping.id)}
          isConfirming={archiveMappingM.isPending}
        />
      </DrawerContent>
    </Drawer>
  );
}
