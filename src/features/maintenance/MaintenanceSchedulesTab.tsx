import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Plus, Rocket } from 'lucide-react';
import {
  archivePlan,
  archiveTemplate,
  createPlan,
  createTemplate,
  deployTemplate,
  listAllPlans,
  listTemplates,
  markPlanServiced,
  updateTemplate,
  type AssetPlan,
  type ScheduleItem,
  type ScheduleTemplate,
} from '@/api/maintenance-schedules';
import { listAssets } from '@/api/assets';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScheduleTemplateDialog } from '@/features/maintenance/ScheduleTemplateDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const TKEY = ['schedule-templates'];
const PKEY = ['schedule-plans'];

const STATUS_META = {
  overdue: { label: 'Overdue', variant: 'danger' as const },
  due_soon: { label: 'Due soon', variant: 'warning' as const },
  ok: { label: 'On track', variant: 'success' as const },
};

/**
 * Maintenance schedules: manage reusable templates (a savable layout), deploy
 * one to many trucks at once, and see every deployed plan's due status with a
 * one-tap "mark serviced". Overdue plans also drag the asset's health score
 * down (Fleet Health / AI hub).
 */
export function MaintenanceSchedulesTab() {
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.MAINTENANCE_EDIT);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleTemplate | undefined>();
  const [deploying, setDeploying] = useState<ScheduleTemplate | undefined>();
  const [archiving, setArchiving] = useState<ScheduleTemplate | undefined>();
  const [removingPlan, setRemovingPlan] = useState<AssetPlan | undefined>();
  const [oneOffOpen, setOneOffOpen] = useState(false);

  const templatesQuery = useQuery({ queryKey: TKEY, queryFn: listTemplates });
  const plansQuery = useQuery({ queryKey: PKEY, queryFn: listAllPlans });
  const invalidateT = () => queryClient.invalidateQueries({ queryKey: TKEY });
  const invalidateP = () => queryClient.invalidateQueries({ queryKey: PKEY });

  const createM = useMutation({
    mutationFn: (v: { name: string; items: ScheduleItem[]; isDefault: boolean }) => createTemplate(v),
    onSuccess: () => { invalidateT(); toast({ title: 'Template created', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not create', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: { name: string; items: ScheduleItem[]; isDefault: boolean } }) => updateTemplate(id, v),
    onSuccess: () => { invalidateT(); invalidateP(); toast({ title: 'Template updated', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not update', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveTemplate,
    onSuccess: () => { invalidateT(); setArchiving(undefined); toast({ title: 'Template archived', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not archive', description: describeApiError(e), variant: 'destructive' }),
  });
  const serviceM = useMutation({
    mutationFn: markPlanServiced,
    onSuccess: () => { invalidateP(); toast({ title: 'Marked serviced', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not update', description: describeApiError(e), variant: 'destructive' }),
  });
  const removePlanM = useMutation({
    mutationFn: archivePlan,
    onSuccess: () => { invalidateP(); invalidateT(); setRemovingPlan(undefined); toast({ title: 'Plan removed', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not remove', description: describeApiError(e), variant: 'destructive' }),
  });
  const oneOffM = useMutation({
    mutationFn: createPlan,
    onSuccess: () => { invalidateP(); setOneOffOpen(false); toast({ title: 'One-off plan added', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not add plan', description: describeApiError(e), variant: 'destructive' }),
  });

  const templates = templatesQuery.data?.items ?? [];
  const plans = plansQuery.data?.items ?? [];

  return (
    <div className="space-y-8">
      {/* Templates */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-(--text-primary)">Schedule templates</h3>
            <p className="text-xs text-(--text-tertiary)">Reusable service schedules — build once, deploy to any number of trucks.</p>
          </div>
          {canManage && <Button onClick={() => { setEditing(undefined); setEditorOpen(true); }}><Plus className="h-4 w-4" /> New template</Button>}
        </div>

        {templatesQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : templatesQuery.isError ? (
          <ErrorState message={describeApiError(templatesQuery.error)} onRetry={() => templatesQuery.refetch()} />
        ) : templates.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No templates yet" description={canManage ? 'Create a schedule from a preset, then deploy it to your trucks.' : 'Schedule templates appear here.'} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-4 elevation-1">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="font-medium text-(--text-primary)">{t.name}</div>
                  <div className="flex gap-1">
                    {t.isDefault && <Badge variant="accent">Default</Badge>}
                    {!!t._count?.plans && <Badge variant="neutral">{t._count.plans} deployed</Badge>}
                  </div>
                </div>
                <ul className="space-y-0.5 text-xs text-(--text-tertiary)">
                  {t.items.map((it, i) => (
                    <li key={i}>{it.label} · every {it.intervalDays} days</li>
                  ))}
                </ul>
                {canManage && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Button variant="secondary" size="sm" onClick={() => setDeploying(t)}><Rocket className="h-3.5 w-3.5" /> Deploy</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setEditorOpen(true); }}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setArchiving(t)}>Archive</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Deployed plans */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-(--text-primary)">Deployed maintenance</h3>
            <p className="text-xs text-(--text-tertiary)">
              {plansQuery.data?.overdueCount ? (
                <span className="font-medium text-danger-500">{plansQuery.data.overdueCount} overdue</span>
              ) : (
                'Every truck’s scheduled service, with what’s due next.'
              )}
            </p>
          </div>
          {canManage && (
            <Button variant="secondary" size="sm" onClick={() => setOneOffOpen(true)}>
              <Plus className="h-4 w-4" /> Add one-off plan
            </Button>
          )}
        </div>
        {plansQuery.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
        ) : plansQuery.isError ? (
          // A failure here must not read as "nothing deployed" — that would hide
          // overdue service the office needs to see.
          <ErrorState message={describeApiError(plansQuery.error)} onRetry={() => plansQuery.refetch()} />
        ) : plans.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nothing deployed yet" description="Deploy a template to your trucks to start tracking recurring maintenance." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Truck</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Next due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p) => {
                const meta = STATUS_META[p.status];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.asset?.name ?? '—'}</TableCell>
                    <TableCell>{p.label} <span className="text-xs text-(--text-tertiary)">· {p.intervalDays}d</span></TableCell>
                    <TableCell className="text-(--text-tertiary)" data-tabular>
                      {new Date(p.nextDueAt).toLocaleDateString()}
                      {p.status === 'overdue' && <span className="ml-1 text-danger-500">({Math.abs(p.daysUntilDue)}d ago)</span>}
                    </TableCell>
                    <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => serviceM.mutate(p.id)}>Mark serviced</Button>
                          <Button variant="ghost" size="sm" onClick={() => setRemovingPlan(p)}>Remove</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <ScheduleTemplateDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editing}
        isSubmitting={createM.isPending || updateM.isPending}
        onSubmit={async (v) => {
          if (editing) await updateM.mutateAsync({ id: editing.id, v });
          else await createM.mutateAsync(v);
        }}
      />
      <DeployDrawer template={deploying} onOpenChange={(o) => !o && setDeploying(undefined)} onDeployed={() => { invalidateT(); invalidateP(); }} />
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Archive this template?"
        description={`"${archiving?.name ?? ''}" will be removed. Plans already deployed to trucks stay in place.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveM.mutate(archiving.id)}
        isConfirming={archiveM.isPending}
      />
      <ConfirmDialog
        open={!!removingPlan}
        onOpenChange={(o) => !o && setRemovingPlan(undefined)}
        title="Remove this maintenance plan?"
        description={`"${removingPlan?.label ?? ''}" on ${removingPlan?.asset?.name ?? 'this truck'} will stop being tracked. Use this if it was deployed to the wrong truck.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => removingPlan && removePlanM.mutate(removingPlan.id)}
        isConfirming={removePlanM.isPending}
      />
      <OneOffPlanDialog
        open={oneOffOpen}
        onOpenChange={setOneOffOpen}
        isSubmitting={oneOffM.isPending}
        onSubmit={(v) => oneOffM.mutate(v)}
      />
    </div>
  );
}

/** Add a single ad-hoc maintenance plan to one truck — for a service that isn't
 *  part of a reusable template. Wires the createPlan endpoint that existed but
 *  had no UI. */
function OneOffPlanDialog({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (v: { assetId: string; label: string; intervalDays: number }) => void;
}) {
  const [assetId, setAssetId] = useState('');
  const [label, setLabel] = useState('');
  const [intervalDays, setIntervalDays] = useState('90');

  const assetsQuery = useQuery({
    queryKey: ['assets', 'for-one-off-plan'],
    queryFn: () => listAssets({ pageSize: 200 }),
    enabled: open,
  });
  const assets = (assetsQuery.data?.items ?? []).filter((a) => !a.archivedAt);
  const interval = Number.parseInt(intervalDays, 10);
  const canSubmit = !!assetId && label.trim().length > 0 && Number.isFinite(interval) && interval > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setAssetId('');
          setLabel('');
          setIntervalDays('90');
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a one-off maintenance plan</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit({ assetId, label: label.trim(), intervalDays: interval });
          }}
        >
          <div className="space-y-1.5">
            <Label>Truck</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger>
                <SelectValue placeholder={assetsQuery.isLoading ? 'Loading…' : 'Choose a truck'} />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="one-off-label">Service</Label>
            <Input id="one-off-label" placeholder="e.g. Tyre rotation" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="one-off-interval">Every (days)</Label>
            <Input
              id="one-off-interval"
              type="number"
              min={1}
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeployDrawer({
  template,
  onOpenChange,
  onDeployed,
}: {
  template?: ScheduleTemplate;
  onOpenChange: (open: boolean) => void;
  onDeployed: () => void;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const assetsQuery = useQuery({
    queryKey: ['assets', 'for-schedule-deploy'],
    queryFn: () => listAssets({ pageSize: 200 }),
    enabled: !!template,
  });

  const deployM = useMutation({
    mutationFn: () => deployTemplate(template!.id, [...selected]),
    onSuccess: (res) => {
      onDeployed();
      toast({ title: `Deployed to ${res.assetsTargeted} truck${res.assetsTargeted === 1 ? '' : 's'} (${res.plansCreated} new)`, variant: 'success' });
      onOpenChange(false);
      setSelected(new Set());
    },
    onError: (e) => toast({ title: 'Could not deploy', description: describeApiError(e), variant: 'destructive' }),
  });

  const assets = (assetsQuery.data?.items ?? []).filter((a) => !a.archivedAt);

  return (
    <Drawer open={!!template} onOpenChange={onOpenChange}>
      <DrawerContent className="overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Deploy “{template?.name}” to trucks</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 space-y-1">
          {assetsQuery.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : assets.length === 0 ? (
            <p className="py-4 text-center text-sm text-(--text-tertiary)">No trucks yet.</p>
          ) : (
            assets.map((a) => (
              <label key={a.id} className="flex items-center gap-2 rounded-lg border border-(--border-subtle) px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent-500"
                  checked={selected.has(a.id)}
                  onChange={(e) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(a.id);
                      else next.delete(a.id);
                      return next;
                    })
                  }
                />
                {a.name}
              </label>
            ))
          )}
        </div>
        <div className="mt-4 flex gap-2 border-t border-(--border-subtle) pt-4">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={deployM.isPending || selected.size === 0} onClick={() => deployM.mutate()}>
            {deployM.isPending ? 'Deploying…' : `Deploy to ${selected.size || ''}`.trim()}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
