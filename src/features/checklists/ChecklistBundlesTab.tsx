import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, Rocket } from 'lucide-react';
import {
  archiveChecklistBundle,
  createChecklistBundle,
  deployChecklistBundle,
  listChecklistBundles,
  updateChecklistBundle,
  type ChecklistBundle,
} from '@/api/checklist-bundles';
import { listChecklistTemplates } from '@/api/checklists';
import { listAssetCategories } from '@/api/asset-classes';
import type { AssetClassKey } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const KEY = ['checklist-bundles'];

/**
 * Checklist/inspection bundles (Saved Layout): group checklist templates and
 * deploy the whole set to an asset class in one action.
 */
export function ChecklistBundlesTab() {
  const { can } = usePermissions();
  const canEdit = can(PERMISSIONS.CHECKLISTS_EDIT);
  const canArchive = can(PERMISSIONS.CHECKLISTS_ARCHIVE);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistBundle | undefined>();
  const [deploying, setDeploying] = useState<ChecklistBundle | undefined>();
  const [archiving, setArchiving] = useState<ChecklistBundle | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: KEY, queryFn: listChecklistBundles });
  const templatesQuery = useQuery({ queryKey: ['checklist-templates', 'for-bundle'], queryFn: () => listChecklistTemplates({ pageSize: 200 }) });
  const categoriesQuery = useQuery({ queryKey: ['asset-categories'], queryFn: () => listAssetCategories() });
  const categories = categoriesQuery.data?.items ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const createM = useMutation({
    mutationFn: createChecklistBundle,
    onSuccess: () => { invalidate(); toast({ title: 'Bundle created', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not create', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name: string; description?: string; templateIds: string[] } }) => updateChecklistBundle(id, input),
    onSuccess: () => { invalidate(); toast({ title: 'Bundle updated', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not update', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveChecklistBundle,
    onSuccess: () => { invalidate(); setArchiving(undefined); toast({ title: 'Bundle archived', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not archive', description: describeApiError(e), variant: 'destructive' }),
  });
  const deployM = useMutation({
    mutationFn: ({ id, assetClass }: { id: string; assetClass: AssetClassKey }) => deployChecklistBundle(id, assetClass),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      invalidate();
      setDeploying(undefined);
      toast({ title: `Applied ${res.scoped} checklist${res.scoped === 1 ? '' : 's'} to ${res.assetClass}`, variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not deploy', description: describeApiError(e), variant: 'destructive' }),
  });

  const bundles = data?.items ?? [];
  const templates = (templatesQuery.data?.items ?? []).filter((t) => !t.archivedAt);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--text-tertiary)">Group your pre-start / inspection checklists, then apply the whole set to an asset class at once.</p>
        {canEdit && <Button onClick={() => { setEditing(undefined); setEditorOpen(true); }}><Plus className="h-4 w-4" /> New bundle</Button>}
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : bundles.length === 0 ? (
        <EmptyState icon={Layers} title="No bundles yet" description={canEdit ? 'Group a few checklist templates into a bundle, then deploy them to an asset class in one go.' : 'Checklist bundles appear here.'} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {bundles.map((b) => (
            <div key={b.id} className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-4 elevation-1">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="font-medium text-(--text-primary)">{b.name}</div>
                <Badge variant="neutral">{b.templates.length} checklist{b.templates.length === 1 ? '' : 's'}</Badge>
              </div>
              {b.description && <p className="mb-2 text-xs text-(--text-tertiary)">{b.description}</p>}
              <ul className="space-y-0.5 text-xs text-(--text-tertiary)">
                {b.templates.slice(0, 5).map((t) => <li key={t.id}>{t.name} <span className="opacity-60">v{t.version}</span></li>)}
              </ul>
              {(canEdit || canArchive) && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {canEdit && <Button variant="secondary" size="sm" onClick={() => setDeploying(b)}><Rocket className="h-3.5 w-3.5" /> Deploy</Button>}
                  {canEdit && <Button variant="ghost" size="sm" onClick={() => { setEditing(b); setEditorOpen(true); }}>Edit</Button>}
                  {canArchive && <Button variant="ghost" size="sm" onClick={() => setArchiving(b)}>Archive</Button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <BundleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        bundle={editing}
        templates={templates.map((t) => ({ id: t.id, name: t.name }))}
        isSubmitting={createM.isPending || updateM.isPending}
        onSubmit={async (v) => {
          if (editing) await updateM.mutateAsync({ id: editing.id, input: v });
          else await createM.mutateAsync(v);
        }}
      />

      <Drawer open={!!deploying} onOpenChange={(o) => !o && setDeploying(undefined)}>
        <DrawerContent className="max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Deploy “{deploying?.name}”</DrawerTitle>
          </DrawerHeader>
          <p className="mb-3 text-sm text-(--text-tertiary)">
            Scope all {deploying?.templates.length} checklist{deploying?.templates.length === 1 ? '' : 's'} in this bundle to an asset class — every asset of that class then gets them as its pre-start / inspection set.
          </p>
          <div className="space-y-2">
            {categories.map((c) => (
              <Button key={c.id} variant="secondary" disabled={deployM.isPending} onClick={() => deploying && deployM.mutate({ id: deploying.id, assetClass: c.key })}>
                Apply to {c.name}
              </Button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Archive this bundle?"
        description={`"${archiving?.name ?? ''}" will be removed. The checklists themselves stay put — only the grouping is archived.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveM.mutate(archiving.id)}
        isConfirming={archiveM.isPending}
      />
    </div>
  );
}

function BundleEditor({
  open,
  onOpenChange,
  bundle,
  templates,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle?: ChecklistBundle;
  templates: { id: string; name: string }[];
  onSubmit: (values: { name: string; description?: string; templateIds: string[] }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setName(bundle?.name ?? '');
      setDescription(bundle?.description ?? '');
      setSelected(new Set(bundle?.templates.map((t) => t.id) ?? []));
    }
  }, [open, bundle]);

  const canSubmit = name.trim().length > 0 && selected.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{bundle ? 'Edit bundle' : 'New checklist bundle'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cb-name">Name</Label>
            <Input id="cb-name" placeholder="e.g. Heavy vehicle inspection set" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cb-desc">Description (optional)</Label>
            <Input id="cb-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Checklists in this bundle</Label>
            {templates.length === 0 ? (
              <p className="text-xs text-(--text-tertiary)">No checklist templates yet — create some in the Templates tab first.</p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {templates.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 rounded-md border border-(--border-subtle) px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-accent-500"
                      checked={selected.has(t.id)}
                      onChange={(e) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(t.id);
                          else next.delete(t.id);
                          return next;
                        })
                      }
                    />
                    {t.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={isSubmitting || !canSubmit}
            onClick={async () => {
              await onSubmit({ name: name.trim(), description: description.trim() || undefined, templateIds: [...selected] });
              onOpenChange(false);
            }}
          >
            {isSubmitting ? 'Saving…' : bundle ? 'Save changes' : 'Create bundle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
