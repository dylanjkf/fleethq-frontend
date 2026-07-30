import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Truck, Upload } from 'lucide-react';
import { archiveAsset, createAsset, listAssets, updateAsset } from '@/api/assets';
import { importAssets } from '@/api/imports';
import type { Asset } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { ArchivedStatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AssetFormDialog, type AssetFormValues } from '@/features/assets/AssetFormDialog';
import { ImportWizardDialog } from '@/features/imports/ImportWizardDialog';
import { GraphPanel } from '@/features/graph/GraphPanel';
import { usePermissions } from '@/hooks/usePermissions';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const QUERY_KEY = ['assets', 'list'];
const IMPORT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'externalReference', label: 'External reference', required: false },
  { key: 'assetClass', label: 'Asset Class (LAND/AIR/SEA)', required: false },
];

export function AssetsTab() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [archiving, setArchiving] = useState<Asset | undefined>();
  const [viewingRelationships, setViewingRelationships] = useState<Asset | undefined>();

  const list = usePaginatedList<Asset>({ queryKey: QUERY_KEY, queryFn: listAssets });

  const createMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Asset created', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not create asset', description: describeApiError(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & AssetFormValues) => updateAsset(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Asset updated', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not update asset', description: describeApiError(err), variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Asset archived', variant: 'success' });
      setArchiving(undefined);
    },
    onError: (err) => toast({ title: 'Could not archive asset', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleFormSubmit(values: AssetFormValues) {
    if (editingAsset) {
      await updateMutation.mutateAsync({ id: editingAsset.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--text-tertiary)" />
          <Input
            placeholder="Search name, make, model, rego, VIN…"
            value={list.searchInput}
            onChange={(e) => list.setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        {can(PERMISSIONS.ASSETS_CREATE) && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
            <Button
              onClick={() => {
                setEditingAsset(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New asset
            </Button>
          </div>
        )}
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
          icon={Truck}
          title={list.search ? 'No assets match your search' : 'Add your first asset'}
          description={list.search ? undefined : 'Assets are your vehicles and equipment. Add them by hand, or import a CSV — this is step one to dispatching jobs.'}
          action={
            !list.search && can(PERMISSIONS.ASSETS_CREATE) ? (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" /> Import CSV
                </Button>
                <Button onClick={() => { setEditingAsset(undefined); setFormOpen(true); }}>
                  <Plus className="h-4 w-4" /> New asset
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">
                  <Link to={`/fleet/${asset.id}`} className="text-accent-500 hover:underline">
                    {asset.name}
                  </Link>
                </TableCell>
                <TableCell>{asset.assetClass.name}</TableCell>
                <TableCell className="text-(--text-tertiary)">{asset.externalReference ?? '—'}</TableCell>
                <TableCell>
                  <ArchivedStatusBadge archivedAt={asset.archivedAt} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" asChild>
                      <Link to={`/fleet/${asset.id}`}>Open</Link>
                    </Button>
                    {can(PERMISSIONS.ASSETS_EDIT) && !asset.archivedAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingAsset(asset);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {can(PERMISSIONS.ASSETS_ARCHIVE) && !asset.archivedAt && (
                      <Button variant="ghost" size="sm" onClick={() => setArchiving(asset)}>
                        Archive
                      </Button>
                    )}
                    {can(PERMISSIONS.FLEET_GRAPH_VIEW) && (
                      <Button variant="ghost" size="sm" onClick={() => setViewingRelationships(asset)}>
                        Relationships
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
        itemLabel="assets"
        isFetching={list.isFetching}
      />

      <AssetFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        asset={editingAsset}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this asset?"
        description={`"${archiving?.name}" will no longer appear in active lists. This can't be undone from here.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        isConfirming={archiveMutation.isPending}
      />

      <ImportWizardDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityLabel="Asset"
        fields={IMPORT_FIELDS}
        importFn={importAssets}
        onImported={() => queryClient.invalidateQueries({ queryKey: QUERY_KEY })}
      />

      <GraphPanel
        entityType="ASSET"
        entityId={viewingRelationships?.id}
        title={viewingRelationships?.name ?? ''}
        onOpenChange={(open) => !open && setViewingRelationships(undefined)}
      />
    </div>
  );
}
