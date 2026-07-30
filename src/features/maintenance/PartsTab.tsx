import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Package, Plus } from 'lucide-react';
import { archivePart, createPart, listParts, updatePart } from '@/api/parts';
import type { Part } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ArchivedStatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PartFormDialog, type PartFormValues } from '@/features/maintenance/PartFormDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const QUERY_KEY = ['parts', 'list'];

function toInput(values: PartFormValues) {
  return {
    name: values.name,
    partNumber: values.partNumber || undefined,
    quantityOnHand: Number(values.quantityOnHand),
    unitCost: values.unitCost === '' || values.unitCost === undefined ? undefined : Number(values.unitCost),
    lowStockThreshold: values.lowStockThreshold === '' || values.lowStockThreshold === undefined ? undefined : Number(values.lowStockThreshold),
  };
}

/**
 * Parts inventory basics (06-Workshop/Workshop_Overview.md's "Future
 * expansion notes"): a simple catalog with a quantity on hand. Restocking is
 * a direct edit to quantityOnHand; parts get decremented by logging usage
 * against a maintenance job on the Jobs tab.
 */
export function PartsTab() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Part | undefined>();
  const [archiving, setArchiving] = useState<Part | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listParts({ pageSize: 200 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: createPart,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Part added', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not add part', description: describeApiError(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & ReturnType<typeof toInput>) => updatePart(id, input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Part updated', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not update part', description: describeApiError(err), variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: archivePart,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Part archived', variant: 'success' });
      setArchiving(undefined);
    },
    onError: (err) => toast({ title: 'Could not archive part', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleFormSubmit(values: PartFormValues) {
    const input = toInput(values);
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...input });
    } else {
      await createMutation.mutateAsync(input);
    }
  }

  const parts = data?.items ?? [];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {can(PERMISSIONS.PARTS_CREATE) && (
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New part
          </Button>
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
      ) : parts.length === 0 ? (
        <EmptyState icon={Package} title="No parts in the catalog yet" description="Add a part to start tracking stock and logging usage against maintenance jobs." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Part number</TableHead>
              <TableHead>On hand</TableHead>
              <TableHead>Unit cost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {parts.map((part) => (
              <TableRow key={part.id}>
                <TableCell className="font-medium">{part.name}</TableCell>
                <TableCell className="text-(--text-tertiary)">{part.partNumber ?? '—'}</TableCell>
                <TableCell>
                  <span className={`flex items-center gap-1.5 ${part.isLowStock ? 'text-warning-500' : ''}`}>
                    {part.isLowStock && <AlertTriangle className="h-3.5 w-3.5" />}
                    {part.quantityOnHand}
                  </span>
                </TableCell>
                <TableCell className="text-(--text-tertiary)">{part.unitCost != null ? `$${part.unitCost.toFixed(2)}` : '—'}</TableCell>
                <TableCell>
                  <ArchivedStatusBadge archivedAt={part.archivedAt} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {can(PERMISSIONS.PARTS_EDIT) && !part.archivedAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(part);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {can(PERMISSIONS.PARTS_ARCHIVE) && !part.archivedAt && (
                      <Button variant="ghost" size="sm" onClick={() => setArchiving(part)}>
                        Archive
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PartFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        part={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this part?"
        description={`"${archiving?.name}" will no longer be selectable when logging parts used.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        isConfirming={archiveMutation.isPending}
      />
    </div>
  );
}
