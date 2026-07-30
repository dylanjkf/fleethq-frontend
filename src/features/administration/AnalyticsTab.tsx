import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import {
  clearAnalyticsOverride,
  getAnalyticsSettings,
  listAnalyticsSnapshots,
  resetAnalyticsHistory,
  resetAnalyticsSettings,
  setAnalyticsOverride,
  setSnapshotExclusion,
  updateAnalyticsSettings,
  type AnalyticsConfig,
  type OverridableMetric,
} from '@/api/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

const METRICS: { key: OverridableMetric; label: string }[] = [
  { key: 'utilisation', label: 'Fleet utilisation' },
  { key: 'compliance_current', label: 'Compliance documents current' },
  { key: 'prestart', label: 'Pre-start inspections (today)' },
];

const SETTINGS_KEY = ['analytics', 'settings'];

/**
 * Analytics controls (analytics:manage): set the company's target percentages
 * and colour thresholds, manually override a live dashboard figure (kept
 * transparent — the dashboard marks it "adjusted"), exclude an unrepresentative
 * day from the trend, and reset accumulated history. Every change is audited.
 */
export function AnalyticsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['analytics', 'snapshots'] });
  };

  const configQuery = useQuery({ queryKey: SETTINGS_KEY, queryFn: getAnalyticsSettings });

  if (configQuery.isLoading) return <Skeleton className="h-64 w-full" />;
  if (configQuery.isError || !configQuery.data) return <ErrorState message={describeApiError(configQuery.error)} onRetry={() => configQuery.refetch()} />;

  return (
    <div className="space-y-6">
      <TargetsCard config={configQuery.data} onChanged={invalidate} toast={toast} />
      <OverridesCard config={configQuery.data} onChanged={invalidate} toast={toast} />
      <ExclusionsCard onChanged={invalidate} toast={toast} />
      <ResetHistoryCard onChanged={invalidate} toast={toast} />
    </div>
  );
}

type Toast = ReturnType<typeof useToast>['toast'];

function TargetsCard({ config, onChanged, toast }: { config: AnalyticsConfig; onChanged: () => void; toast: Toast }) {
  const s = config.settings;
  const [utilisationTarget, setUtil] = useState(String(s.utilisationTarget));
  const [complianceTarget, setComp] = useState(String(s.complianceTarget));
  const [goodThreshold, setGood] = useState(String(s.goodThreshold));
  const [warnThreshold, setWarn] = useState(String(s.warnThreshold));

  useEffect(() => {
    setUtil(String(s.utilisationTarget));
    setComp(String(s.complianceTarget));
    setGood(String(s.goodThreshold));
    setWarn(String(s.warnThreshold));
  }, [s.utilisationTarget, s.complianceTarget, s.goodThreshold, s.warnThreshold]);

  const saveM = useMutation({
    mutationFn: () =>
      updateAnalyticsSettings({
        utilisationTarget: Number(utilisationTarget),
        complianceTarget: Number(complianceTarget),
        goodThreshold: Number(goodThreshold),
        warnThreshold: Number(warnThreshold),
      }),
    onSuccess: () => { onChanged(); toast({ title: 'Targets saved', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not save targets', description: describeApiError(e), variant: 'destructive' }),
  });
  const resetM = useMutation({
    mutationFn: resetAnalyticsSettings,
    onSuccess: () => { onChanged(); toast({ title: 'Targets reset to defaults', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not reset', description: describeApiError(e), variant: 'destructive' }),
  });

  const Field = ({ id, label, value, onChange, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={0} max={100} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-xs text-(--text-tertiary)">{hint}</p>}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Targets &amp; thresholds</CardTitle>
        <CardDescription>The utilisation target line, the compliance target, and the green/amber cut-offs that colour the dashboard bars. {s.isDefault ? 'Currently using the defaults.' : 'Customised.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="ut" label="Fleet utilisation target (%)" value={utilisationTarget} onChange={setUtil} />
          <Field id="ct" label="Compliance target (%)" value={complianceTarget} onChange={setComp} />
          <Field id="gt" label="Green at or above (%)" value={goodThreshold} onChange={setGood} hint="A bar at/above this shows green." />
          <Field id="wt" label="Amber at or above (%)" value={warnThreshold} onChange={setWarn} hint="At/above this but below green shows amber; lower is red." />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>{saveM.isPending ? 'Saving…' : 'Save targets'}</Button>
          <Button variant="secondary" onClick={() => resetM.mutate()} disabled={resetM.isPending || s.isDefault}>
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OverridesCard({ config, onChanged, toast }: { config: AnalyticsConfig; onChanged: () => void; toast: Toast }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual overrides</CardTitle>
        <CardDescription>Replace a live percentage with a hand-set figure — for any reason. The dashboard shows the value with an "adjusted" marker and your note, and every change is recorded in the audit log.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {METRICS.map((m) => (
          <OverrideRow key={m.key} metric={m.key} label={m.label} current={config.overrides[m.key]} onChanged={onChanged} toast={toast} />
        ))}
      </CardContent>
    </Card>
  );
}

function OverrideRow({ metric, label, current, onChanged, toast }: { metric: OverridableMetric; label: string; current: AnalyticsConfig['overrides'][OverridableMetric]; onChanged: () => void; toast: Toast }) {
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');

  const setM = useMutation({
    mutationFn: () => setAnalyticsOverride(metric, Number(value), note.trim() || undefined),
    onSuccess: () => { onChanged(); setValue(''); setNote(''); toast({ title: `${label} overridden`, variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not override', description: describeApiError(e), variant: 'destructive' }),
  });
  const clearM = useMutation({
    mutationFn: () => clearAnalyticsOverride(metric),
    onSuccess: () => { onChanged(); toast({ title: `${label} restored to computed`, variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not clear', description: describeApiError(e), variant: 'destructive' }),
  });

  return (
    <div className="rounded-lg border border-(--border-subtle) p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {current ? (
          <span className="text-xs text-warning-500">Adjusted to {current.value}%{current.by ? ` by ${current.by}` : ''}</span>
        ) : (
          <span className="text-xs text-(--text-tertiary)">Using the computed value</span>
        )}
      </div>
      {current?.note && <p className="mt-0.5 text-xs text-(--text-tertiary)">“{current.note}”</p>}
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div className="w-24 space-y-1">
          <Label htmlFor={`ov-${metric}`}>Value %</Label>
          <Input id={`ov-${metric}`} type="number" min={0} max={100} value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="min-w-40 flex-1 space-y-1">
          <Label htmlFor={`note-${metric}`}>Reason (optional)</Label>
          <Input id={`note-${metric}`} placeholder="e.g. excluding the depot-move week" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button size="sm" onClick={() => setM.mutate()} disabled={setM.isPending || value.trim() === '' || Number.isNaN(Number(value))}>Apply</Button>
        {current && <Button size="sm" variant="ghost" onClick={() => clearM.mutate()} disabled={clearM.isPending}>Clear</Button>}
      </div>
    </div>
  );
}

function ExclusionsCard({ onChanged, toast }: { onChanged: () => void; toast: Toast }) {
  const query = useQuery({ queryKey: ['analytics', 'snapshots'], queryFn: () => listAnalyticsSnapshots(14) });
  const toggleM = useMutation({
    mutationFn: ({ date, excluded }: { date: string; excluded: boolean }) => setSnapshotExclusion(date, excluded),
    onSuccess: () => { onChanged(); },
    onError: (e) => toast({ title: 'Could not update', description: describeApiError(e), variant: 'destructive' }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exclude data points</CardTitle>
        <CardDescription>Drop an unrepresentative day (e.g. a test job inflated it) from the utilisation trend and the "vs yesterday" delta. A correction to the inputs — the computed figure recovers — not an override of the output.</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : query.isError ? (
          <ErrorState message={describeApiError(query.error)} onRetry={() => query.refetch()} />
        ) : (query.data?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-(--text-tertiary)">No utilisation snapshots recorded yet — days appear here as they're captured.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Utilisation</TableHead>
                <TableHead>Samples</TableHead>
                <TableHead>Excluded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.items.map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="font-medium">{d.date}</TableCell>
                  <TableCell className="tabular-nums">{d.utilisation}%</TableCell>
                  <TableCell className="tabular-nums text-(--text-tertiary)">{d.samples}</TableCell>
                  <TableCell>
                    <Checkbox checked={d.excluded} disabled={toggleM.isPending} onCheckedChange={(c) => toggleM.mutate({ date: d.date, excluded: c === true })} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ResetHistoryCard({ onChanged, toast }: { onChanged: () => void; toast: Toast }) {
  const [confirming, setConfirming] = useState(false);
  const resetM = useMutation({
    mutationFn: resetAnalyticsHistory,
    onSuccess: (r) => { onChanged(); setConfirming(false); toast({ title: `Cleared ${r.deleted} day${r.deleted === 1 ? '' : 's'} of history`, variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not reset', description: describeApiError(e), variant: 'destructive' }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset accumulated history</CardTitle>
        <CardDescription>Clear the stored utilisation snapshots so the trend and the day-over-day deltas start rebuilding from now — for after a fleet restructure or a skewed period. This can't be undone; live figures are unaffected.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setConfirming(true)} disabled={resetM.isPending}>Reset analytics history</Button>
      </CardContent>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Reset accumulated analytics history?"
        description="Every stored daily utilisation snapshot is deleted. The trend line and vs-yesterday deltas will be empty until new days accumulate. Live dashboard numbers are unaffected."
        confirmLabel="Reset history"
        variant="destructive"
        onConfirm={() => resetM.mutate()}
        isConfirming={resetM.isPending}
      />
    </Card>
  );
}
