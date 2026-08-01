import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Container, Plus, Search, Upload } from 'lucide-react';
import {
  archiveAttachedUnit,
  createAttachedUnit,
  hitchAttachedUnit,
  listAttachedUnits,
  unhitchAttachedUnit,
  updateAttachedUnit,
} from '@/api/attached-units';
import { importAttachedUnits } from '@/api/imports';
import type { AttachedUnit, Paginated } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { ArchivedStatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AttachedUnitFormDialog,
  type AttachedUnitFormValues,
} from '@/features/attached-units/AttachedUnitFormDialog';
import { HitchDialog } from '@/features/attached-units/HitchDialog';
import { ImportWizardDialog } from '@/features/imports/ImportWizardDialog';
import { GraphPanel } from '@/features/graph/GraphPanel';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const QUERY_KEY = ['attached-units', 'list'];
const IMPORT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'externalReference', label: 'External reference', required: false },
];

export function AttachedUnitsTab() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<AttachedUnit | undefined>();
  const [archiving, setArchiving] = useState<AttachedUnit | undefined>();
  const [hitching, setHitching] = useState<AttachedUnit | undefined>();
  const [viewingRelationships, setViewingRelationships] = useState<AttachedUnit | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listAttachedUnits({ pageSize: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: createAttachedUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Attached unit created', variant: 'success' });
    },
    onError: (err) =>
      toast({ title: 'Could not create attached unit', description: describeApiError(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string; name: string; externalReference?: string }) =>
      updateAttachedUnit(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Attached unit updated', variant: 'success' });
    },
    onError: (err) =>
      toast({ title: 'Could not update attached unit', description: describeApiError(err), variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveAttachedUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Attached unit archived', variant: 'success' });
      setArchiving(undefined);
    },
    onError: (err) =>
      toast({ title: 'Could not archive attached unit', description: describeApiError(err), variant: 'destructive' }),
  });

  const hitchMutation = useMutation({
    mutationFn: ({ id, assetId }: { id: string; assetId: string }) => hitchAttachedUnit(id, assetId),
    // Flip the row to "paired" instantly. The paired-with name is read from the
    // assets picker's own cache (falling back to a placeholder), then onSettled
    // reconciles against the server's authoritative record.
    onMutate: async ({ id, assetId }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<Paginated<AttachedUnit>>(QUERY_KEY);
      const assetName =
        queryClient
          .getQueryData<Paginated<{ id: string; name: string }>>(['assets', 'list', 'for-hitch'])
          ?.items.find((a) => a.id === assetId)?.name ?? '…';
      queryClient.setQueryData<Paginated<AttachedUnit>>(QUERY_KEY, (old) =>
        old
          ? { ...old, items: old.items.map((u) => (u.id === id ? { ...u, currentAsset: { id: assetId, name: assetName } } : u)) }
          : old,
      );
      return { previous };
    },
    onSuccess: () => toast({ title: 'Hitched', variant: 'success' }),
    onError: (err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
      toast({ title: 'Could not hitch', description: describeApiError(err), variant: 'destructive' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const unhitchMutation = useMutation({
    mutationFn: unhitchAttachedUnit,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<Paginated<AttachedUnit>>(QUERY_KEY);
      queryClient.setQueryData<Paginated<AttachedUnit>>(QUERY_KEY, (old) =>
        old ? { ...old, items: old.items.map((u) => (u.id === id ? { ...u, currentAsset: null } : u)) } : old,
      );
      return { previous };
    },
    onSuccess: () => toast({ title: 'Unhitched', variant: 'success' }),
    onError: (err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous);
      toast({ title: 'Could not unhitch', description: describeApiError(err), variant: 'destructive' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const filtered = (data?.items ?? []).filter(
    (u) =>
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.externalReference?.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleFormSubmit(values: AttachedUnitFormValues) {
    // The form holds `year` as a string (see AttachedUnitFormDialog); the API
    // takes a number. Blank stays undefined rather than becoming NaN.
    const parsedYear = values.year?.trim() ? Number(values.year) : undefined;
    const input = { ...values, year: Number.isFinite(parsedYear) ? parsedYear : undefined };
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...input });
    } else {
      await createMutation.mutateAsync(input);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--text-tertiary)" />
          <Input
            aria-label="Filter by name or reference"
            placeholder="Filter by name or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        {can(PERMISSIONS.ATTACHED_UNITS_CREATE) && (
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
              <Plus className="h-4 w-4" /> New attached unit
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Container}
          title={search ? 'No attached units match your filter' : 'No attached units yet'}
          description={search ? undefined : 'Create your first attached unit (e.g. a trailer) to get started.'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Paired with</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((unit) => (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">
                  {/* The name is the affordance into the unit's full record —
                      same interaction as an asset name in the assets list. */}
                  <Link to={`/attached-units/${unit.id}`} className="hover:underline">
                    {unit.name}
                  </Link>
                </TableCell>
                <TableCell className="text-(--text-tertiary)">{unit.externalReference ?? '—'}</TableCell>
                <TableCell className="text-(--text-tertiary)">{unit.currentAsset?.name ?? '—'}</TableCell>
                <TableCell>
                  <ArchivedStatusBadge archivedAt={unit.archivedAt} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {can(PERMISSIONS.ATTACHED_UNITS_EDIT) && !unit.archivedAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(unit);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {can(PERMISSIONS.ATTACHED_UNITS_EDIT) && !unit.archivedAt && (
                      unit.currentAsset ? (
                        <Button variant="ghost" size="sm" onClick={() => unhitchMutation.mutate(unit.id)} disabled={unhitchMutation.isPending}>
                          Unhitch
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setHitching(unit)}>
                          Hitch
                        </Button>
                      )
                    )}
                    {can(PERMISSIONS.ATTACHED_UNITS_ARCHIVE) && !unit.archivedAt && (
                      <Button variant="ghost" size="sm" onClick={() => setArchiving(unit)}>
                        Archive
                      </Button>
                    )}
                    {can(PERMISSIONS.FLEET_GRAPH_VIEW) && (
                      <Button variant="ghost" size="sm" onClick={() => setViewingRelationships(unit)}>
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

      <AttachedUnitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        attachedUnit={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this attached unit?"
        description={`"${archiving?.name}" will no longer appear in active lists. This can't be undone from here.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        isConfirming={archiveMutation.isPending}
      />

      <ImportWizardDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityLabel="Attached Unit"
        fields={IMPORT_FIELDS}
        importFn={importAttachedUnits}
        onImported={() => queryClient.invalidateQueries({ queryKey: QUERY_KEY })}
      />

      <HitchDialog
        open={!!hitching}
        onOpenChange={(open) => !open && setHitching(undefined)}
        attachedUnit={hitching}
        onSubmit={async (assetId) => {
          await hitchMutation.mutateAsync({ id: hitching!.id, assetId });
        }}
        isSubmitting={hitchMutation.isPending}
      />

      <GraphPanel
        entityType="ATTACHED_UNIT"
        entityId={viewingRelationships?.id}
        title={viewingRelationships?.name ?? ''}
        onOpenChange={(open) => !open && setViewingRelationships(undefined)}
      />
    </div>
  );
}
