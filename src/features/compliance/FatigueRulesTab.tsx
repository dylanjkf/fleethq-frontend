import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Rocket, ShieldCheck } from 'lucide-react';
import {
  archiveFatigueRuleSet,
  createFatigueRuleSet,
  deployFatigueRuleSet,
  getFatiguePreset,
  listFatigueRuleSets,
  updateFatigueRuleSet,
  type FatigueRuleSet,
  type FatigueRuleSetInput,
} from '@/api/fatigue-rule-sets';
import { listOperators } from '@/api/operators';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { FatigueRuleSetDialog } from '@/features/compliance/FatigueRuleSetDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const KEY = ['fatigue-rule-sets'];
const hours = (min: number) => `${+(min / 60).toFixed(2)}h`;

/**
 * Manage the company's saved fatigue rule sets (a "savable layout"): create,
 * edit, set a default, and deploy a set to any number of operators in one go —
 * the same settings reused across drivers/trucks without re-entering them.
 */
export function FatigueRulesTab() {
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.FATIGUE_MANAGE);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FatigueRuleSet | undefined>();
  const [deploying, setDeploying] = useState<FatigueRuleSet | undefined>();
  const [archiving, setArchiving] = useState<FatigueRuleSet | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: KEY, queryFn: listFatigueRuleSets });
  const presetQuery = useQuery({ queryKey: ['fatigue-preset'], queryFn: getFatiguePreset, enabled: canManage });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const createM = useMutation({
    mutationFn: (v: FatigueRuleSetInput) => createFatigueRuleSet(v),
    onSuccess: () => { invalidate(); toast({ title: 'Rule set created', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not create', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: FatigueRuleSetInput }) => updateFatigueRuleSet(id, v),
    onSuccess: () => { invalidate(); toast({ title: 'Rule set updated', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not update', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveFatigueRuleSet,
    onSuccess: () => { invalidate(); setArchiving(undefined); toast({ title: 'Rule set archived', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not archive', description: describeApiError(e), variant: 'destructive' }),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--text-tertiary)">
          Custom work/rest limits, saved once and deployed to your drivers. Operators with no set assigned use the
          default.
        </p>
        {canManage && (
          <Button onClick={() => { setEditing(undefined); setEditorOpen(true); }}>
            <Plus className="h-4 w-4" /> New rule set
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No custom rule sets"
          description={canManage ? 'Create a rule set from the built-in preset, tweak the limits, and deploy it to your drivers.' : 'Custom fatigue rule sets appear here.'}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((rs) => (
            <div key={rs.id} className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-4 elevation-1">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="font-medium text-(--text-primary)">{rs.name}</div>
                <div className="flex gap-1">
                  {rs.isDefault && <Badge variant="accent">Default</Badge>}
                  {!!rs._count?.operators && <Badge variant="neutral">{rs._count.operators} deployed</Badge>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-(--text-tertiary)" data-tabular>
                <span>Max work 24h: <b className="text-(--text-secondary)">{hours(rs.maxWork24hMin)}</b></span>
                <span>Min rest 24h: <b className="text-(--text-secondary)">{hours(rs.minRest24hMin)}</b></span>
                <span>Max work 7d: <b className="text-(--text-secondary)">{hours(rs.maxWork7dMin)}</b></span>
                <span>Min rest 7d: <b className="text-(--text-secondary)">{hours(rs.minRest7dMin)}</b></span>
              </div>
              {canManage && (
                <div className="mt-3 flex flex-wrap gap-1">
                  <Button variant="secondary" size="sm" onClick={() => setDeploying(rs)}><Rocket className="h-3.5 w-3.5" /> Deploy</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(rs); setEditorOpen(true); }}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setArchiving(rs)}>Archive</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <FatigueRuleSetDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        ruleSet={editing}
        preset={presetQuery.data}
        isSubmitting={createM.isPending || updateM.isPending}
        onSubmit={async (v) => {
          if (editing) await updateM.mutateAsync({ id: editing.id, v });
          else await createM.mutateAsync(v);
        }}
      />
      <DeployDrawer ruleSet={deploying} onOpenChange={(o) => !o && setDeploying(undefined)} onDeployed={invalidate} />
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Archive this rule set?"
        description={`"${archiving?.name ?? ''}" will be removed. Operators using it fall back to the default rule set.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveM.mutate(archiving.id)}
        isConfirming={archiveM.isPending}
      />
    </div>
  );
}

function DeployDrawer({
  ruleSet,
  onOpenChange,
  onDeployed,
}: {
  ruleSet?: FatigueRuleSet;
  onOpenChange: (open: boolean) => void;
  onDeployed: () => void;
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [setDefault, setSetDefault] = useState(false);

  const operatorsQuery = useQuery({
    queryKey: ['operators', 'for-fatigue-deploy'],
    queryFn: () => listOperators({ pageSize: 200 }),
    enabled: !!ruleSet,
  });

  const deployM = useMutation({
    mutationFn: () => deployFatigueRuleSet(ruleSet!.id, { operatorIds: selected.size ? [...selected] : undefined, setDefault: setDefault || undefined }),
    onSuccess: (res) => {
      onDeployed();
      toast({ title: `Deployed to ${res.assigned} operator${res.assigned === 1 ? '' : 's'}${res.setDefault ? ' + set as default' : ''}`, variant: 'success' });
      onOpenChange(false);
      setSelected(new Set());
      setSetDefault(false);
    },
    onError: (e) => toast({ title: 'Could not deploy', description: describeApiError(e), variant: 'destructive' }),
  });

  const operators = (operatorsQuery.data?.items ?? []).filter((o) => !o.archivedAt);

  return (
    <Drawer open={!!ruleSet} onOpenChange={onOpenChange}>
      <DrawerContent className="overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>Deploy “{ruleSet?.name}”</DrawerTitle>
        </DrawerHeader>
        <label className="mb-3 flex items-center gap-2 rounded-lg border border-(--border-subtle) p-3 text-sm">
          <input type="checkbox" checked={setDefault} onChange={(e) => setSetDefault(e.target.checked)} className="h-4 w-4 accent-accent-500" />
          Set as the company default
        </label>
        <p className="mb-2 text-xs text-(--text-tertiary)">Assign to specific operators:</p>
        <div className="flex-1 space-y-1">
          {operatorsQuery.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : operators.length === 0 ? (
            <p className="py-4 text-center text-sm text-(--text-tertiary)">No operators yet.</p>
          ) : (
            operators.map((o) => (
              <label key={o.id} className="flex items-center gap-2 rounded-lg border border-(--border-subtle) px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent-500"
                  checked={selected.has(o.id)}
                  onChange={(e) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(o.id);
                      else next.delete(o.id);
                      return next;
                    })
                  }
                />
                {o.fullName}
              </label>
            ))
          )}
        </div>
        <div className="mt-4 flex gap-2 border-t border-(--border-subtle) pt-4">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={deployM.isPending || (selected.size === 0 && !setDefault)} onClick={() => deployM.mutate()}>
            {deployM.isPending ? 'Deploying…' : 'Deploy'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
