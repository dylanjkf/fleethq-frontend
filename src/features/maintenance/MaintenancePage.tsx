import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Package, Plus, RefreshCw, Sparkles, Wrench } from 'lucide-react';
import {
  approveMaintenanceJob,
  closeMaintenanceJob,
  createMaintenanceJob,
  listMaintenanceJobs,
  recordPartsUsed,
  updateMaintenanceJob,
} from '@/api/maintenance';
import { listParts } from '@/api/parts';
import { getPredictiveMaintenanceSignals } from '@/api/predictive-maintenance';
import { getMaintenancePriority } from '@/api/operational-recommendations';
import type { MaintenanceJob } from '@/api/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MaintenanceStatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CloseMaintenanceJobDialog, type CloseMaintenanceJobValues } from '@/features/maintenance/CloseMaintenanceJobDialog';
import { LogPartsUsedDialog } from '@/features/maintenance/LogPartsUsedDialog';
import {
  MaintenanceJobFormDialog,
  type MaintenanceJobFormValues,
} from '@/features/maintenance/MaintenanceJobFormDialog';
import { PartsTab } from '@/features/maintenance/PartsTab';
import { MaintenanceSchedulesTab } from '@/features/maintenance/MaintenanceSchedulesTab';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const QUERY_KEY = ['maintenance-jobs', 'list'];
const PARTS_QUERY_KEY = ['parts', 'list'];
const NON_TERMINAL_STATUSES = ['OPEN', 'IN_PROGRESS', 'PARTS_PENDING'] as const;

/**
 * The Workshop milestone's scoped slice (06-Workshop/Workshop_Overview.md):
 * manual job logging and a linear status lifecycle. Dispatch warns against
 * assigning an asset with any open maintenance job (the Normal/Critical
 * severity flag was removed). No OBD/CAN auto-creation — see the
 * CHANGELOG entry for this milestone for the full scope. The Signals tab is
 * 09-AI/Fleet_Intelligence_Overview.md's predictive maintenance line: a
 * deterministic pattern detector over this same fault history plus Fleet
 * Graph pairings — no AI/ML model involved, see Fleet_Intelligence_Overview.md's
 * implementation notes.
 */
export function MaintenancePage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [closing, setClosing] = useState<MaintenanceJob | undefined>();
  const [loggingParts, setLoggingParts] = useState<MaintenanceJob | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listMaintenanceJobs({ pageSize: 100 }),
  });

  const partsQuery = useQuery({
    queryKey: PARTS_QUERY_KEY,
    queryFn: () => listParts({ pageSize: 200 }),
    enabled: can(PERMISSIONS.PARTS_CREATE),
  });
  const availableParts = (partsQuery.data?.items ?? []).filter((p) => !p.archivedAt);

  const signalsQuery = useQuery({
    queryKey: ['predictive-maintenance', 'signals'],
    queryFn: getPredictiveMaintenanceSignals,
  });

  // 09-AI/Fleet_Intelligence_Overview.md's "which maintenance should be
  // prioritized" line: a deterministic ranking (severity, age, whether the
  // asset is currently in use) over these same jobs — a suggestion for sort
  // order, not a status the job itself carries.
  const priorityQuery = useQuery({
    queryKey: ['operational-recommendations', 'maintenance-priority'],
    queryFn: getMaintenancePriority,
  });
  const priorityByJobId = new Map((priorityQuery.data ?? []).map((p) => [p.maintenanceJobId, p]));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: createMaintenanceJob,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Maintenance job logged', variant: 'success' });
    },
    onError: (err) =>
      toast({ title: 'Could not log maintenance job', description: describeApiError(err), variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: (typeof NON_TERMINAL_STATUSES)[number] }) =>
      updateMaintenanceJob(id, { status }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Status updated', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not update status', description: describeApiError(err), variant: 'destructive' }),
  });

  const approveMutation = useMutation({
    mutationFn: approveMaintenanceJob,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Maintenance job approved', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not approve job', description: describeApiError(err), variant: 'destructive' }),
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CloseMaintenanceJobValues }) => closeMaintenanceJob(id, values),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Maintenance job closed', variant: 'success' });
      setClosing(undefined);
    },
    onError: (err) => toast({ title: 'Could not close job', description: describeApiError(err), variant: 'destructive' }),
  });

  const recordPartsUsedMutation = useMutation({
    mutationFn: ({ jobId, values }: { jobId: string; values: { partId: string; quantity: number } }) =>
      recordPartsUsed(jobId, values),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
      toast({ title: 'Parts used logged', variant: 'success' });
      setLoggingParts(undefined);
    },
    onError: (err) => toast({ title: 'Could not log parts used', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleCreate(values: MaintenanceJobFormValues) {
    await createMutation.mutateAsync(values);
  }

  async function handleClose(values: CloseMaintenanceJobValues) {
    if (!closing) return;
    await closeMutation.mutateAsync({ id: closing.id, values });
  }

  async function handleLogPartsUsed(values: { partId: string; quantity: number }) {
    if (!loggingParts) return;
    await recordPartsUsedMutation.mutateAsync({ jobId: loggingParts.id, values });
  }

  // Non-terminal jobs sort by priority (highest first); terminal jobs (which
  // the priority endpoint excludes) stay in their original order at the end.
  const jobs = [...(data?.items ?? [])].sort((a, b) => {
    const scoreA = priorityByJobId.get(a.id)?.priorityScore;
    const scoreB = priorityByJobId.get(b.id)?.priorityScore;
    if (scoreA !== undefined && scoreB !== undefined) return scoreB - scoreA;
    if (scoreA !== undefined) return -1;
    if (scoreB !== undefined) return 1;
    return 0;
  });
  const isTerminal = (job: MaintenanceJob) => job.status === 'COMPLETE';

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Maintenance</PanelTitle>
          <PanelDescription>Log, track, and close workshop jobs for your fleet.</PanelDescription>
        </div>
        {can(PERMISSIONS.MAINTENANCE_CREATE) && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Log job
          </Button>
        )}
      </PanelHeader>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="signals">
            Signals
            {!!signalsQuery.data?.length && (
              <span className="ml-1.5 rounded-full bg-warning-500/20 px-1.5 text-xs text-warning-500">
                {signalsQuery.data.length}
              </span>
            )}
          </TabsTrigger>
          {can(PERMISSIONS.PARTS_VIEW) && <TabsTrigger value="parts">Parts</TabsTrigger>}
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
          ) : jobs.length === 0 ? (
            <EmptyState icon={Wrench} title="No maintenance jobs yet" description="Log your first job to get started." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      {job.title}
                      {!!job.partsUsed?.length && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-normal text-(--text-tertiary)">
                          <Package className="h-3 w-3" />
                          {job.partsUsed.map((u) => `${u.quantity}× ${u.part.name}`).join(', ')}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-(--text-tertiary)">{job.asset?.name ?? '—'}</TableCell>
                    <TableCell>
                      {priorityByJobId.has(job.id) ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-(--text-tertiary)"
                          title={priorityByJobId.get(job.id)!.reasons.join(' ')}
                        >
                          <Sparkles className="h-3 w-3 text-accent-500" />
                          {priorityByJobId.get(job.id)!.priorityScore}
                        </span>
                      ) : (
                        <span className="text-(--text-tertiary)">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {can(PERMISSIONS.MAINTENANCE_EDIT) && !isTerminal(job) ? (
                        <Select
                          value={job.status}
                          onValueChange={(status) =>
                            statusMutation.mutate({
                              id: job.id,
                              status: status as (typeof NON_TERMINAL_STATUSES)[number],
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPEN">Open</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="PARTS_PENDING">Parts Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <MaintenanceStatusBadge status={job.status} />
                      )}
                    </TableCell>
                    <TableCell className="text-(--text-tertiary)">{job.approvedAt ? 'Yes' : '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {can(PERMISSIONS.MAINTENANCE_APPROVE) && !job.approvedAt && !isTerminal(job) && (
                          <Button variant="ghost" size="sm" onClick={() => approveMutation.mutate(job.id)}>
                            Approve
                          </Button>
                        )}
                        {can(PERMISSIONS.PARTS_CREATE) && !isTerminal(job) && (
                          <Button variant="ghost" size="sm" onClick={() => setLoggingParts(job)}>
                            Log parts
                          </Button>
                        )}
                        {can(PERMISSIONS.MAINTENANCE_CLOSE) && !isTerminal(job) && (
                          <Button variant="ghost" size="sm" onClick={() => setClosing(job)}>
                            Close
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="signals">
          {signalsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : signalsQuery.isError ? (
            <ErrorState message={describeApiError(signalsQuery.error)} onRetry={() => signalsQuery.refetch()} />
          ) : !signalsQuery.data || signalsQuery.data.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No patterns detected"
              description="Recurring faults on one asset, or matching faults across assets that have shared an attached unit, will appear here as they emerge from your maintenance history."
            />
          ) : (
            <div className="space-y-2">
              {signalsQuery.data.map((signal, i) => (
                <div key={i} className="rounded-lg border border-warning-500/40 bg-warning-500/5 p-3">
                  <div className="flex items-center gap-2">
                    {signal.type === 'SHARED_ATTACHED_UNIT_PATTERN' ? (
                      <Link2 className="h-4 w-4 shrink-0 text-warning-500" />
                    ) : (
                      <RefreshCw className="h-4 w-4 shrink-0 text-warning-500" />
                    )}
                    <p className="text-sm font-medium">{signal.summary}</p>
                  </div>
                  <p className="mt-1 pl-6 text-xs text-(--text-tertiary)">
                    {signal.type === 'SHARED_ATTACHED_UNIT_PATTERN' ? 'Shared attached-unit pattern' : 'Recurring fault'} ·{' '}
                    {signal.assetNames.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {can(PERMISSIONS.PARTS_VIEW) && (
          <TabsContent value="parts">
            <PartsTab />
          </TabsContent>
        )}
        <TabsContent value="schedules">
          <MaintenanceSchedulesTab />
        </TabsContent>
      </Tabs>

      <MaintenanceJobFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />

      <CloseMaintenanceJobDialog
        open={!!closing}
        onOpenChange={(open) => !open && setClosing(undefined)}
        job={closing}
        onSubmit={handleClose}
        isSubmitting={closeMutation.isPending}
      />

      <LogPartsUsedDialog
        open={!!loggingParts}
        onOpenChange={(open) => !open && setLoggingParts(undefined)}
        job={loggingParts}
        parts={availableParts}
        onSubmit={handleLogPartsUsed}
        isSubmitting={recordPartsUsedMutation.isPending}
      />
    </Panel>
  );
}
