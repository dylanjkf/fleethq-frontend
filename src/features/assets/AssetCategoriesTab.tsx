import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Shapes } from 'lucide-react';
import { createAssetCategory, listAssetCategories, removeAssetCategory, restoreAssetCategory, updateAssetCategory } from '@/api/asset-classes';
import type { AssetCategory } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const KEY = ['asset-categories'];

/**
 * Asset categories: the shared built-ins (Land/Air/Sea) plus a company's own.
 * A custom category can carry its own checklists/inspections — so a fleet with,
 * say, reefers or forklifts can run category-specific checks.
 */
export function AssetCategoriesTab() {
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.ASSET_CLASS_MANAGE);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  // This is the management screen, so it asks for removed categories too and
  // renders them greyed with a Restore action. Pickers elsewhere call
  // listAssetCategories() with no options and never see them.
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...KEY, 'with-hidden'],
    queryFn: () => listAssetCategories({ includeHidden: true }),
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AssetCategory | undefined>();
  const [archiving, setArchiving] = useState<AssetCategory | undefined>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createM = useMutation({
    mutationFn: createAssetCategory,
    onSuccess: () => { invalidate(); setEditorOpen(false); toast({ title: 'Category created', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not create', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name: string; description?: string } }) => updateAssetCategory(id, input),
    onSuccess: () => { invalidate(); setEditorOpen(false); toast({ title: 'Category updated', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not update', description: describeApiError(e), variant: 'destructive' }),
  });
  const removeM = useMutation({
    mutationFn: removeAssetCategory,
    onSuccess: (res) => {
      invalidate();
      setArchiving(undefined);
      toast({
        title: 'Category removed',
        // Be explicit that a built-in is only removed for this company — it is
        // a shared row, and pretending otherwise would misrepresent the effect.
        description: res.removed === 'hidden' ? 'Removed for your company. You can restore it any time.' : undefined,
        variant: 'success',
      });
    },
    onError: (e) => { setArchiving(undefined); toast({ title: 'Could not remove', description: describeApiError(e), variant: 'destructive' }); },
  });
  const restoreM = useMutation({
    mutationFn: restoreAssetCategory,
    onSuccess: () => { invalidate(); toast({ title: 'Category restored', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not restore', description: describeApiError(e), variant: 'destructive' }),
  });

  function openEditor(category?: AssetCategory) {
    setEditing(category);
    setName(category?.name ?? '');
    setDescription(category?.description ?? '');
    setEditorOpen(true);
  }

  const categories = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-(--text-tertiary)">Built-in categories are shared. Add your own (e.g. Reefer, Van, Forklift) — each can have its own checklists.</p>
        {canManage && <Button onClick={() => openEditor()}><Plus className="h-4 w-4" /> New category</Button>}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : categories.length === 0 ? (
        <EmptyState icon={Shapes} title="No categories" description="Add a category to group your assets and target checklists at them." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id} className={c.isHidden ? 'opacity-50' : undefined}>
                <TableCell className="font-medium">
                  {c.name}
                  {c.description && <p className="text-xs font-normal text-(--text-tertiary)">{c.description}</p>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.isBuiltIn ? 'neutral' : 'accent'}>{c.isBuiltIn ? 'Built-in' : 'Custom'}</Badge>
                    {c.isHidden && <Badge variant="warning">Removed</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <div className="flex justify-end gap-2">
                      {/* A built-in is a shared row — its name/description belong to
                          every tenant, so only a company's own category is editable.
                          Removing it, however, is per-company and allowed. */}
                      {!c.isBuiltIn && !c.isHidden && (
                        <Button variant="ghost" size="sm" onClick={() => openEditor(c)}>Edit</Button>
                      )}
                      {c.isHidden ? (
                        <Button variant="ghost" size="sm" disabled={restoreM.isPending} onClick={() => restoreM.mutate(c.id)}>
                          Restore
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setArchiving(c)}>Remove</Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ac-name">Name</Label>
              <Input id="ac-name" placeholder="e.g. Reefer Truck" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-desc">Description (optional)</Label>
              <Input id="ac-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button
              disabled={createM.isPending || updateM.isPending || !name.trim()}
              onClick={() => {
                const input = { name: name.trim(), description: description.trim() || undefined };
                if (editing) updateM.mutate({ id: editing.id, input });
                else createM.mutate(input);
              }}
            >
              {editing ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Remove this category?"
        // Built-ins read differently on purpose: removal is scoped to this
        // company and reversible, and saying so prevents the reasonable fear
        // that you're deleting something shared or unrecoverable.
        description={
          archiving?.isBuiltIn
            ? `"${archiving.name}" will be hidden from your company only — other companies keep it, and you can restore it any time. Assets must be moved to another category first.`
            : `"${archiving?.name ?? ''}" will be removed. Assets must be moved to another category first.`
        }
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => archiving && removeM.mutate(archiving.id)}
        isConfirming={removeM.isPending}
      />
    </div>
  );
}
