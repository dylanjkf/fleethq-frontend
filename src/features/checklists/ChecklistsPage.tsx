import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Plus } from 'lucide-react';
import {
  archiveChecklistTemplate,
  createChecklistTemplate,
  getChecklistStatusToday,
  listChecklistSubmissions,
  listChecklistTemplates,
  updateChecklistTemplate,
} from '@/api/checklists';
import type { ChecklistSubmission, ChecklistTemplate } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChecklistTemplateFormDialog,
  type ChecklistTemplateFormValues,
} from '@/features/checklists/ChecklistTemplateFormDialog';
import { ChecklistSubmissionDetailDialog } from '@/features/checklists/ChecklistSubmissionDetailDialog';
import { ChecklistBundlesTab } from '@/features/checklists/ChecklistBundlesTab';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const TEMPLATES_KEY = ['checklist-templates', 'list'];
const SUBMISSIONS_KEY = ['checklist-submissions', 'list'];

function toInput(values: ChecklistTemplateFormValues) {
  return {
    name: values.name,
    appliesToAssetClass: values.appliesToAssetClass === 'ANY' ? undefined : values.appliesToAssetClass,
    assignedAssetIds: values.assignedAssetIds,
    items: values.items,
  };
}

/**
 * Smart Checklists (01-Product/Smart_Checklists.md), office side: build the
 * company's versioned pre-start templates and review what operators completed on
 * DriverOS. Templates use the ComplianceDocument archive-as-correction lifecycle;
 * submissions are immutable and read-only here — they are recorded on DriverOS.
 */
export function ChecklistsPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistTemplate | undefined>();
  const [archiving, setArchiving] = useState<ChecklistTemplate | undefined>();
  const [viewing, setViewing] = useState<ChecklistSubmission | undefined>();

  const templatesQuery = useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: () => listChecklistTemplates({ pageSize: 100 }),
  });
  const submissionsQuery = useQuery({
    queryKey: SUBMISSIONS_KEY,
    queryFn: () => listChecklistSubmissions({ pageSize: 100 }),
  });
  const statusQuery = useQuery({
    queryKey: ['checklist-status', 'today'],
    queryFn: getChecklistStatusToday,
  });

  const invalidateTemplates = () => queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });

  const createMutation = useMutation({
    mutationFn: (values: ChecklistTemplateFormValues) => createChecklistTemplate(toInput(values)),
    onSuccess: () => {
      invalidateTemplates();
      toast({ title: 'Inspection template created', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not create template', description: describeApiError(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ChecklistTemplateFormValues }) =>
      updateChecklistTemplate(id, toInput(values)),
    onSuccess: () => {
      invalidateTemplates();
      toast({ title: 'Inspection template updated', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not update template', description: describeApiError(err), variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveChecklistTemplate,
    onSuccess: () => {
      invalidateTemplates();
      toast({ title: 'Inspection template archived', variant: 'success' });
      setArchiving(undefined);
    },
    onError: (err) => toast({ title: 'Could not archive template', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleSubmit(values: ChecklistTemplateFormValues) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  const templates = templatesQuery.data?.items ?? [];
  const submissions = submissionsQuery.data?.items ?? [];

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Inspections</PanelTitle>
          <PanelDescription>
            Build the pre-start inspections operators complete on DriverOS, and review what's been completed.
          </PanelDescription>
        </div>
        {can(PERMISSIONS.CHECKLISTS_CREATE) && (
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New template
          </Button>
        )}
      </PanelHeader>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="bundles">Bundles</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          {statusQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : statusQuery.isError ? (
            <ErrorState message={describeApiError(statusQuery.error)} onRetry={() => statusQuery.refetch()} />
          ) : (statusQuery.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No active assets"
              description="Add an asset to track its daily pre-start checklist status here."
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-3">
                <StatTile label="Completed today" value={`${statusQuery.data!.summary.done}/${statusQuery.data!.summary.total}`} />
                <StatTile label="Not done yet" value={statusQuery.data!.summary.notDone} tone={statusQuery.data!.summary.notDone > 0 ? 'warn' : 'ok'} />
                <StatTile label="With failures" value={statusQuery.data!.summary.withFailures} tone={statusQuery.data!.summary.withFailures > 0 ? 'bad' : 'ok'} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Pre-start today</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusQuery.data!.items.map((row) => (
                    <TableRow key={row.asset.id}>
                      <TableCell className="font-medium">{row.asset.name}</TableCell>
                      <TableCell>
                        {row.status === 'not_done' ? (
                          <Badge variant="warning">Not done</Badge>
                        ) : row.hasFailures ? (
                          <Badge variant="danger">Done · needs attention</Badge>
                        ) : (
                          <Badge variant="success">Done</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-(--text-tertiary)">{row.operatorName ?? '—'}</TableCell>
                      <TableCell className="text-(--text-tertiary)">
                        {row.submittedAt ? new Date(row.submittedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </TabsContent>

        <TabsContent value="templates">
          {templatesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : templatesQuery.isError ? (
            <ErrorState message={describeApiError(templatesQuery.error)} onRetry={() => templatesQuery.refetch()} />
          ) : templates.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No inspection templates yet"
              description="Create a pre-start inspection for your operators to complete on DriverOS."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Applies to</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.appliesToAssetClass?.name ?? 'Any asset class'}</TableCell>
                    <TableCell className="text-(--text-tertiary)">{template.items.length}</TableCell>
                    <TableCell className="text-(--text-tertiary)">v{template.version}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {can(PERMISSIONS.CHECKLISTS_EDIT) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(template);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {can(PERMISSIONS.CHECKLISTS_ARCHIVE) && (
                          <Button variant="ghost" size="sm" onClick={() => setArchiving(template)}>
                            Archive
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

        <TabsContent value="bundles">
          <ChecklistBundlesTab />
        </TabsContent>

        <TabsContent value="completed">
          {submissionsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : submissionsQuery.isError ? (
            <ErrorState message={describeApiError(submissionsQuery.error)} onRetry={() => submissionsQuery.refetch()} />
          ) : submissions.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No completed inspections yet"
              description="Once operators complete pre-start inspections on DriverOS, they'll appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Inspection</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.asset?.name ?? '—'}</TableCell>
                    <TableCell>{submission.template?.name ?? '—'}</TableCell>
                    <TableCell className="text-(--text-tertiary)">{submission.operator?.fullName ?? '—'}</TableCell>
                    <TableCell className="text-(--text-tertiary)">
                      {new Date(submission.submittedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {submission.hasFailures ? (
                        <Badge variant="danger">Needs attention</Badge>
                      ) : (
                        <Badge variant="success">All pass</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setViewing(submission)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <ChecklistTemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editing}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ChecklistSubmissionDetailDialog submission={viewing} onOpenChange={(open) => !open && setViewing(undefined)} />

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this inspection template?"
        description="It will no longer be offered to operators on DriverOS. Completed inspections that used it are unaffected."
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        isConfirming={archiveMutation.isPending}
      />
    </Panel>
  );
}

function StatTile({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'ok' | 'warn' | 'bad' }) {
  const toneClass =
    tone === 'bad'
      ? 'text-danger-500'
      : tone === 'warn'
        ? 'text-warning-500'
        : tone === 'ok'
          ? 'text-success-500'
          : 'text-(--text-primary)';
  return (
    <div className="min-w-[130px] flex-1 rounded-lg border border-(--border-subtle) bg-(--surface-1) px-4 py-3">
      <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      <div className="mt-0.5 text-xs text-(--text-tertiary)">{label}</div>
    </div>
  );
}
