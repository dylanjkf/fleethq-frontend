import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus } from 'lucide-react';
import {
  archiveMachinePlan,
  copyMachineScheduleTo,
  createMachinePlan,
  listMachinePlans,
  listMachines,
  markMachinePlanServiced,
  type WarehouseMachine,
} from '@/api/warehouse';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

const STATUS = {
  overdue: { label: 'Overdue', variant: 'danger' as const },
  due_soon: { label: 'Due soon', variant: 'warning' as const },
  ok: { label: 'On track', variant: 'success' as const },
};

/**
 * A machine's recurring maintenance schedule, shown inside the machine drawer.
 * Add/mark-serviced/archive plans, and copy this machine's whole schedule to
 * other machines in one action — the savable/deployable layout pattern for
 * warehouse machines.
 */
export function MachineScheduleSection({ machine, canManage }: { machine: WarehouseMachine; canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = ['warehouse', 'machine-plans', machine.id];
  const [label, setLabel] = useState('');
  const [days, setDays] = useState('90');
  const [copying, setCopying] = useState(false);
  const [targets, setTargets] = useState<Set<string>>(new Set());

  const plansQuery = useQuery({ queryKey: key, queryFn: () => listMachinePlans(machine.id) });
  const machinesQuery = useQuery({ queryKey: ['warehouse', 'machines', 'for-copy'], queryFn: () => listMachines({ pageSize: 200 }), enabled: copying });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ['warehouse', 'machines'] });
  };

  const addM = useMutation({
    mutationFn: () => createMachinePlan(machine.id, { label: label.trim(), intervalDays: Number(days) }),
    onSuccess: () => { invalidate(); setLabel(''); setDays('90'); toast({ title: 'Schedule item added', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not add', description: describeApiError(e), variant: 'destructive' }),
  });
  const serviceM = useMutation({
    mutationFn: markMachinePlanServiced,
    onSuccess: () => { invalidate(); toast({ title: 'Marked serviced', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not update', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveMachinePlan,
    onSuccess: () => { invalidate(); toast({ title: 'Removed', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not remove', description: describeApiError(e), variant: 'destructive' }),
  });
  const copyM = useMutation({
    mutationFn: () => copyMachineScheduleTo(machine.id, [...targets]),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'machine-plans'] });
      toast({ title: `Copied to ${res.machinesTargeted} machine${res.machinesTargeted === 1 ? '' : 's'} (${res.plansCreated} new)`, variant: 'success' });
      setCopying(false);
      setTargets(new Set());
    },
    onError: (e) => toast({ title: 'Could not copy', description: describeApiError(e), variant: 'destructive' }),
  });

  const plans = plansQuery.data?.items ?? [];
  const otherMachines = (machinesQuery.data?.items ?? []).filter((m) => m.id !== machine.id && !m.archivedAt);

  return (
    <div className="mb-4 space-y-2 rounded-lg border border-(--border-subtle) p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-(--text-primary)">Maintenance schedule</h4>
        {canManage && plans.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setCopying((v) => !v)}>
            <Copy className="h-3.5 w-3.5" /> Copy to machines
          </Button>
        )}
      </div>

      {plansQuery.isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : plans.length === 0 ? (
        <p className="text-xs text-(--text-tertiary)">No recurring maintenance scheduled for this machine yet.</p>
      ) : (
        <div className="space-y-1.5">
          {plans.map((p) => {
            const meta = STATUS[p.status];
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-(--border-subtle) px-2.5 py-1.5">
                <div className="min-w-0">
                  <div className="truncate text-sm text-(--text-primary)">{p.label} <span className="text-xs text-(--text-tertiary)">· {p.intervalDays}d</span></div>
                  <div className="text-xs text-(--text-tertiary)" data-tabular>
                    Due {new Date(p.nextDueAt).toLocaleDateString()}
                    {p.status === 'overdue' && <span className="ml-1 text-danger-500">({Math.abs(p.daysUntilDue)}d ago)</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  {canManage && <Button variant="ghost" size="sm" onClick={() => serviceM.mutate(p.id)}>Serviced</Button>}
                  {canManage && <button type="button" className="text-xs text-(--text-tertiary) underline" onClick={() => archiveM.mutate(p.id)}>Remove</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canManage && (
        <div className="flex items-center gap-2 pt-1">
          <Input placeholder="Add item (e.g. Service)" value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-sm" />
          <div className="flex items-center gap-1">
            <Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} className="h-8 w-16 text-sm" />
            <span className="text-xs text-(--text-tertiary)">days</span>
          </div>
          <Button size="sm" disabled={addM.isPending || !label.trim() || !Number(days)} onClick={() => addM.mutate()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {copying && (
        <div className="space-y-1 rounded-md border border-(--border-subtle) bg-(--surface-1)/60 p-2">
          <p className="text-xs text-(--text-tertiary)">Copy this schedule to:</p>
          {machinesQuery.isLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : otherMachines.length === 0 ? (
            <p className="text-xs text-(--text-tertiary)">No other machines.</p>
          ) : (
            otherMachines.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent-500"
                  checked={targets.has(m.id)}
                  onChange={(e) =>
                    setTargets((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(m.id);
                      else next.delete(m.id);
                      return next;
                    })
                  }
                />
                {m.name}
              </label>
            ))
          )}
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="secondary" onClick={() => setCopying(false)}>Cancel</Button>
            <Button size="sm" disabled={copyM.isPending || targets.size === 0} onClick={() => copyM.mutate()}>
              {copyM.isPending ? 'Copying…' : 'Copy'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
