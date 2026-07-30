import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Plus, Rocket } from 'lucide-react';
import {
  archiveDashboardPreset,
  createDashboardPreset,
  deployDashboardPreset,
  getMyDashboardLayout,
  listDashboardPresets,
  type DashboardPreset,
} from '@/api/dashboard-layouts';
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

const KEY = ['dashboard-presets'];

/**
 * Dashboard layout presets (Saved Layout): save the current dashboard
 * arrangement as a named preset and deploy it to many users' dashboards.
 */
export function DashboardLayoutsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deploying, setDeploying] = useState<DashboardPreset | undefined>();
  const [archiving, setArchiving] = useState<DashboardPreset | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: KEY, queryFn: listDashboardPresets });
  const myLayoutQuery = useQuery({ queryKey: ['dashboard', 'layout'], queryFn: getMyDashboardLayout });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const createM = useMutation({
    mutationFn: (name: string) => createDashboardPreset({ name, widgets: myLayoutQuery.data!.widgets }),
    onSuccess: () => { invalidate(); setCreateOpen(false); toast({ title: 'Preset saved from your current layout', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not save', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveDashboardPreset,
    onSuccess: () => { invalidate(); setArchiving(undefined); toast({ title: 'Preset archived', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not archive', description: describeApiError(e), variant: 'destructive' }),
  });

  const presets = data?.items ?? [];
  const [name, setName] = useState('');
  const labelFor = (key: string) => myLayoutQuery.data?.catalog.find((c) => c.key === key)?.label ?? key;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--text-tertiary)">Arrange your own dashboard (Dashboard → Customize), then save it here and deploy to your team.</p>
        <Button disabled={!myLayoutQuery.data} onClick={() => { setName(''); setCreateOpen(true); }}>
          <Plus className="h-4 w-4" /> Save current as preset
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : presets.length === 0 ? (
        <EmptyState icon={LayoutDashboard} title="No dashboard presets" description="Save your dashboard arrangement as a preset, then push it to other users." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {presets.map((p) => {
            const shown = p.widgets.filter((w) => w.visible);
            return (
              <div key={p.id} className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-4 elevation-1">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="font-medium text-(--text-primary)">{p.name}</div>
                  {p.isDefault && <Badge variant="accent">Default</Badge>}
                </div>
                <p className="text-xs text-(--text-tertiary)">{shown.length} widget{shown.length === 1 ? '' : 's'}: {shown.slice(0, 4).map((w) => labelFor(w.key)).join(', ')}{shown.length > 4 ? '…' : ''}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <Button variant="secondary" size="sm" onClick={() => setDeploying(p)}><Rocket className="h-3.5 w-3.5" /> Deploy</Button>
                  <Button variant="ghost" size="sm" onClick={() => setArchiving(p)}>Archive</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save current layout as preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="dp-name">Preset name</Label>
            <Input id="dp-name" placeholder="e.g. Dispatcher view" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={createM.isPending || !name.trim()} onClick={() => createM.mutate(name.trim())}>{createM.isPending ? 'Saving…' : 'Save preset'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserDeployDrawer
        open={!!deploying}
        title={`Deploy “${deploying?.name}” to users`}
        onOpenChange={(o) => !o && setDeploying(undefined)}
        onDeploy={(userIds) => deployDashboardPreset(deploying!.id, userIds)}
      />
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Archive this preset?"
        description={`"${archiving?.name ?? ''}" will be removed. Users it was applied to keep their current dashboards.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveM.mutate(archiving.id)}
        isConfirming={archiveM.isPending}
      />
    </div>
  );
}
