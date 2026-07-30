import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellOff, Plus, Rocket } from 'lucide-react';
import {
  archiveNotificationPreset,
  createNotificationPreset,
  deployNotificationPreset,
  listNotificationPresets,
  updateNotificationPreset,
  type NotificationPreset,
} from '@/api/notification-presets';
import { listNotificationTypes } from '@/api/notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { UserDeployDrawer } from '@/features/administration/UserDeployDrawer';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

const KEY = ['notification-presets'];

/**
 * Notification preset bundles (Saved Layout): save a named set of digest-only +
 * per-type mute choices, then deploy it to many users' own preferences at once.
 */
export function NotificationPresetsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationPreset | undefined>();
  const [deploying, setDeploying] = useState<NotificationPreset | undefined>();
  const [archiving, setArchiving] = useState<NotificationPreset | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: KEY, queryFn: listNotificationPresets });
  const typesQuery = useQuery({ queryKey: ['notification-types'], queryFn: listNotificationTypes });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const createM = useMutation({
    mutationFn: createNotificationPreset,
    onSuccess: () => { invalidate(); toast({ title: 'Preset created', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not create', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name: string; digestOnly: boolean; mutedTypes: string[] } }) => updateNotificationPreset(id, input),
    onSuccess: () => { invalidate(); toast({ title: 'Preset updated', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not update', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveNotificationPreset,
    onSuccess: () => { invalidate(); setArchiving(undefined); toast({ title: 'Preset archived', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not archive', description: describeApiError(e), variant: 'destructive' }),
  });

  const presets = data?.items ?? [];
  const types = typesQuery.data ?? [];
  const typeLabel = (k: string) => types.find((t) => t.key === k)?.label ?? k;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--text-tertiary)">Save a notification setup once, then apply it to any users in one go.</p>
        <Button onClick={() => { setEditing(undefined); setEditorOpen(true); }}><Plus className="h-4 w-4" /> New preset</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : presets.length === 0 ? (
        <EmptyState icon={BellOff} title="No notification presets" description="Create a preset — e.g. a quiet 'digest only' setup — and deploy it to your team." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {presets.map((p) => (
            <div key={p.id} className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-4 elevation-1">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="font-medium text-(--text-primary)">{p.name}</div>
                {p.digestOnly && <Badge variant="accent">Digest only</Badge>}
              </div>
              <p className="text-xs text-(--text-tertiary)">
                {p.mutedTypes.length ? `Mutes: ${p.mutedTypes.map(typeLabel).join(', ')}` : 'Nothing muted'}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Button variant="secondary" size="sm" onClick={() => setDeploying(p)}><Rocket className="h-3.5 w-3.5" /> Deploy</Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setEditorOpen(true); }}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setArchiving(p)}>Archive</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PresetEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        preset={editing}
        types={types}
        isSubmitting={createM.isPending || updateM.isPending}
        onSubmit={async (v) => {
          if (editing) await updateM.mutateAsync({ id: editing.id, input: v });
          else await createM.mutateAsync(v);
        }}
      />
      <UserDeployDrawer
        open={!!deploying}
        title={`Deploy “${deploying?.name}” to users`}
        onOpenChange={(o) => !o && setDeploying(undefined)}
        onDeploy={(userIds) => deployNotificationPreset(deploying!.id, userIds)}
      />
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Archive this preset?"
        description={`"${archiving?.name ?? ''}" will be removed. Users it was applied to keep their current settings.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveM.mutate(archiving.id)}
        isConfirming={archiveM.isPending}
      />
    </div>
  );
}

function PresetEditor({
  open,
  onOpenChange,
  preset,
  types,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset?: NotificationPreset;
  types: { key: string; label: string }[];
  onSubmit: (values: { name: string; digestOnly: boolean; mutedTypes: string[] }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState('');
  const [digestOnly, setDigestOnly] = useState(false);
  const [muted, setMuted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setName(preset?.name ?? '');
      setDigestOnly(preset?.digestOnly ?? false);
      setMuted(new Set(preset?.mutedTypes ?? []));
    }
  }, [open, preset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{preset ? 'Edit preset' : 'New notification preset'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="np-name">Name</Label>
            <Input id="np-name" placeholder="e.g. Quiet — digest only" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={digestOnly} onChange={(e) => setDigestOnly(e.target.checked)} className="h-4 w-4 accent-accent-500" />
            Digest only (no live in-app badge; still emailed in the digest)
          </label>
          <div className="space-y-1.5">
            <Label>Mute these notification types</Label>
            <div className="space-y-1">
              {types.map((t) => (
                <label key={t.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-accent-500"
                    checked={muted.has(t.key)}
                    onChange={(e) =>
                      setMuted((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(t.key);
                        else next.delete(t.key);
                        return next;
                      })
                    }
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={isSubmitting || !name.trim()}
            onClick={async () => {
              await onSubmit({ name: name.trim(), digestOnly, mutedTypes: [...muted] });
              onOpenChange(false);
            }}
          >
            {isSubmitting ? 'Saving…' : preset ? 'Save changes' : 'Create preset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
