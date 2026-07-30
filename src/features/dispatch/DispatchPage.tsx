import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Layers, Map as MapIcon, Plus } from 'lucide-react';
import { assignJob, cancelJob, completeJob, createJob, duplicateJob, listJobs } from '@/api/dispatch';
import type { AssignJobInput, JobView } from '@/api/dispatch';
import { ApiClientError } from '@/api/client';
import type { Job } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { JobStatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssignJobDialog } from '@/features/dispatch/AssignJobDialog';
import { CorEvidencePanel } from '@/features/dispatch/CorEvidencePanel';
import { JobFormDialog, type JobFormValues } from '@/features/dispatch/JobFormDialog';
import { BulkJobsDialog } from '@/features/dispatch/BulkJobsDialog';
import { JobStopsDialog } from '@/features/dispatch/JobStopsDialog';
import { LiveLocationsPanel } from '@/features/dispatch/LiveLocationsPanel';
import { TimelinePanel } from '@/features/timeline/TimelinePanel';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const QUERY_KEY_BASE = ['jobs', 'list'];

/**
 * The Dispatch milestone's scoped slice (05-Dispatch/Dispatch_Overview.md):
 * job creation, assignment to an Asset/Operator, and status. No live map,
 * GPS, OBD-derived status, route optimization, or operator chat yet — see
 * the CHANGELOG entry for this milestone for the full deliberately-out-of-
 * scope list.
 */
export function DispatchPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [assigning, setAssigning] = useState<Job | undefined>();
  const [completing, setCompleting] = useState<Job | undefined>();
  const [cancelling, setCancelling] = useState<Job | undefined>();
  const [viewingStops, setViewingStops] = useState<Job | undefined>();
  const [viewingHistory, setViewingHistory] = useState<Job | undefined>();
  const [viewingCorEvidence, setViewingCorEvidence] = useState<Job | undefined>();
  const [view, setView] = useState<JobView>('today');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY_BASE, view],
    queryFn: () => listJobs({ pageSize: 100, view }),
    // Keep the board live: a driver completing a stop or another dispatcher
    // reassigning a job shows up without a manual refresh. Poll while the tab
    // is open and re-sync the moment the dispatcher returns to it.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY_BASE });

  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: (newJob) => {
      invalidate();
      toast({ title: 'Job created — now add its stops', variant: 'success' });
      // Drop the dispatcher straight into stop-building so multi-drop runs are
      // discoverable at the moment of creation (add stops or import a manifest).
      setViewingStops(newJob as unknown as Job);
    },
    onError: (err) => toast({ title: 'Could not create job', description: describeApiError(err), variant: 'destructive' }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AssignJobInput }) => assignJob(id, input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Job assignment updated', variant: 'success' });
    },
    onError: (err) => {
      // A concurrent reassignment (someone else moved this job first) — pull the
      // fresh state onto the board so the dispatcher re-decides against reality.
      if (err instanceof ApiClientError && err.code === 'JOB_MODIFIED') {
        invalidate();
        setAssigning(undefined);
        toast({ title: 'Job changed by someone else', description: 'The board has been refreshed — check the new assignment before reassigning.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Could not update assignment', description: describeApiError(err), variant: 'destructive' });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeJob,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Job marked complete', variant: 'success' });
      setCompleting(undefined);
    },
    onError: (err) => toast({ title: 'Could not complete job', description: describeApiError(err), variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelJob,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Job cancelled', variant: 'success' });
      setCancelling(undefined);
    },
    onError: (err) => toast({ title: 'Could not cancel job', description: describeApiError(err), variant: 'destructive' }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (jobId: string) => duplicateJob(jobId),
    onSuccess: (newJob) => {
      invalidate();
      toast({ title: 'Run duplicated', description: `"${newJob.title}" created with the same stops.`, variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not duplicate job', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleCreate(values: JobFormValues) {
    await createMutation.mutateAsync(values);
  }

  async function handleAssign(values: AssignJobInput) {
    if (!assigning) return;
    await assignMutation.mutateAsync({ id: assigning.id, input: values });
  }

  const jobs = data?.items ?? [];
  const isTerminal = (job: Job) => job.status === 'COMPLETED' || job.status === 'CANCELLED';

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Dispatch</PanelTitle>
          <PanelDescription>Create a run, add its delivery stops (drops), then assign it to an asset and operator.</PanelDescription>
        </div>
        {can(PERMISSIONS.DISPATCH_CREATE) && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>
              <Layers className="h-4 w-4" /> Add multiple
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New job
            </Button>
          </div>
        )}
      </PanelHeader>

      {can(PERMISSIONS.LOCATION_VIEW) && <LiveLocationsPanel jobs={jobs} />}

      <Tabs value={view} onValueChange={(v) => setView(v as JobView)} className="mb-4">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title={view === 'today' ? 'No jobs due today' : view === 'upcoming' ? 'No upcoming jobs' : 'No job history yet'}
          description={view === 'today' ? 'Create a run, add its delivery stops, then assign it to an asset and operator — the driver sees it in DriverOS.' : undefined}
          action={
            view === 'today' && can(PERMISSIONS.DISPATCH_CREATE) ? (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> New job
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Pickup depot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.title}</TableCell>
                <TableCell className="text-(--text-tertiary)">{job.asset?.name ?? '—'}</TableCell>
                <TableCell className="text-(--text-tertiary)">{job.operator?.fullName ?? '—'}</TableCell>
                <TableCell className="text-(--text-tertiary)">{job.pickupDepot?.name ?? '—'}</TableCell>
                <TableCell>
                  <JobStatusBadge status={job.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setViewingStops(job)}>
                      {job.stops && job.stops.length > 0
                        ? `Stops (${job.stops.filter((s) => s.outcome !== 'PENDING').length}/${job.stops.length})`
                        : '+ Add stops'}
                    </Button>
                    {can(PERMISSIONS.DISPATCH_ASSIGN) && !isTerminal(job) && (
                      <Button variant="ghost" size="sm" onClick={() => setAssigning(job)}>
                        Assign
                      </Button>
                    )}
                    {can(PERMISSIONS.DISPATCH_EDIT) && !isTerminal(job) && (
                      <Button variant="ghost" size="sm" onClick={() => setCompleting(job)}>
                        Complete
                      </Button>
                    )}
                    {can(PERMISSIONS.DISPATCH_CANCEL) && !isTerminal(job) && (
                      <Button variant="ghost" size="sm" onClick={() => setCancelling(job)}>
                        Cancel
                      </Button>
                    )}
                    {can(PERMISSIONS.DISPATCH_CREATE) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateMutation.mutate(job.id)}
                        disabled={duplicateMutation.isPending}
                      >
                        <Copy className="h-4 w-4" /> Repeat
                      </Button>
                    )}
                    {can(PERMISSIONS.TIMELINE_VIEW) && (
                      <Button variant="ghost" size="sm" onClick={() => setViewingHistory(job)}>
                        History
                      </Button>
                    )}
                    {can(PERMISSIONS.COMPLIANCE_VIEW) && (
                      <Button variant="ghost" size="sm" onClick={() => setViewingCorEvidence(job)}>
                        CoR Evidence
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <BulkJobsDialog open={bulkOpen} onOpenChange={setBulkOpen} />

      <JobFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
      />

      <JobStopsDialog jobId={viewingStops?.id} onOpenChange={(open) => !open && setViewingStops(undefined)} />

      <AssignJobDialog
        open={!!assigning}
        onOpenChange={(open) => !open && setAssigning(undefined)}
        job={assigning}
        onSubmit={handleAssign}
        isSubmitting={assignMutation.isPending}
      />

      <ConfirmDialog
        open={!!completing}
        onOpenChange={(open) => !open && setCompleting(undefined)}
        title="Mark this job complete?"
        description={`"${completing?.title}" will move to a terminal state and can no longer be edited or reassigned.`}
        confirmLabel="Mark complete"
        onConfirm={() => completing && completeMutation.mutate(completing.id)}
        isConfirming={completeMutation.isPending}
      />

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(undefined)}
        title="Cancel this job?"
        description={`"${cancelling?.title}" will move to a terminal state and can no longer be edited or reassigned.`}
        confirmLabel="Cancel job"
        variant="destructive"
        onConfirm={() => cancelling && cancelMutation.mutate(cancelling.id)}
        isConfirming={cancelMutation.isPending}
      />

      <TimelinePanel
        entityType="JOB"
        entityId={viewingHistory?.id}
        title={viewingHistory?.title ?? ''}
        onOpenChange={(open) => !open && setViewingHistory(undefined)}
      />

      <CorEvidencePanel
        jobId={viewingCorEvidence?.id}
        jobTitle={viewingCorEvidence?.title ?? ''}
        onOpenChange={(open) => !open && setViewingCorEvidence(undefined)}
      />
    </Panel>
  );
}
