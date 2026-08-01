import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Upload, Warehouse } from 'lucide-react';
import { archiveDepot, createDepot, listDepots, updateDepot } from '@/api/depots';
import { importDepots } from '@/api/imports';
import type { Depot } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { ArchivedStatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DepotFormDialog, type DepotFormValues } from '@/features/depots/DepotFormDialog';
import { ImportWizardDialog } from '@/features/imports/ImportWizardDialog';
import { TimelinePanel } from '@/features/timeline/TimelinePanel';
import { usePermissions } from '@/hooks/usePermissions';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const IMPORT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'address', label: 'Address', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

const QUERY_KEY = ['depots', 'list'];

/**
 * Depots: the fleet's own pickup/branch locations — distinct from Customer
 * (who the fleet delivers to). A Job can reference one as its pickup point.
 */
export function DepotsPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Depot | undefined>();
  const [archiving, setArchiving] = useState<Depot | undefined>();
  const [viewingHistory, setViewingHistory] = useState<Depot | undefined>();

  const list = usePaginatedList<Depot>({ queryKey: QUERY_KEY, queryFn: listDepots });

  const createMutation = useMutation({
    mutationFn: createDepot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Depot created', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not create depot', description: describeApiError(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & DepotFormValues) => updateDepot(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Depot updated', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not update depot', description: describeApiError(err), variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveDepot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Depot archived', variant: 'success' });
      setArchiving(undefined);
    },
    onError: (err) => toast({ title: 'Could not archive depot', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleFormSubmit(values: DepotFormValues) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Depots</PanelTitle>
          <PanelDescription>Your own pickup/branch locations — reference one as a job's pickup point.</PanelDescription>
        </div>
        {can(PERMISSIONS.DEPOTS_CREATE) && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New depot
            </Button>
          </div>
        )}
      </PanelHeader>

      <div className="mb-4">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--text-tertiary)" />
          <Input aria-label="Search name, address, notes" placeholder="Search name, address, notes…" value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} className="pl-8" />
        </div>
      </div>

      {list.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState message={describeApiError(list.error)} onRetry={() => list.refetch()} />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title={list.search ? 'No depots match your search' : 'No depots yet'}
          description={list.search ? undefined : 'Add your first pickup/branch location so a job can reference it.'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((depot) => (
              <TableRow key={depot.id}>
                <TableCell className="font-medium">{depot.name}</TableCell>
                <TableCell className="text-(--text-tertiary)">{depot.address ?? '—'}</TableCell>
                <TableCell>
                  <ArchivedStatusBadge archivedAt={depot.archivedAt} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {can(PERMISSIONS.DEPOTS_EDIT) && !depot.archivedAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(depot);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {can(PERMISSIONS.DEPOTS_ARCHIVE) && !depot.archivedAt && (
                      <Button variant="ghost" size="sm" onClick={() => setArchiving(depot)}>
                        Archive
                      </Button>
                    )}
                    {can(PERMISSIONS.TIMELINE_VIEW) && (
                      <Button variant="ghost" size="sm" onClick={() => setViewingHistory(depot)}>
                        History
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination
        rangeStart={list.rangeStart}
        rangeEnd={list.rangeEnd}
        total={list.total}
        page={list.page}
        totalPages={list.totalPages}
        canPrev={list.canPrev}
        canNext={list.canNext}
        onPrev={list.prevPage}
        onNext={list.nextPage}
        itemLabel="depots"
        isFetching={list.isFetching}
      />

      <DepotFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        depot={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this depot?"
        description={`"${archiving?.name}" will no longer be selectable as a pickup point for new jobs.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        isConfirming={archiveMutation.isPending}
      />

      <TimelinePanel
        entityType="DEPOT"
        entityId={viewingHistory?.id}
        title={viewingHistory?.name ?? ''}
        onOpenChange={(open) => !open && setViewingHistory(undefined)}
      />

      <ImportWizardDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityLabel="Depot"
        fields={IMPORT_FIELDS}
        importFn={importDepots}
        onImported={() => queryClient.invalidateQueries({ queryKey: QUERY_KEY })}
      />
    </Panel>
  );
}
