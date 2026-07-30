import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileInput, FileText, Plus } from 'lucide-react';
import {
  archiveFormTemplate,
  createFormTemplate,
  listFormSubmissions,
  listFormTemplates,
  openFormReferenceDocument,
  updateFormTemplate,
} from '@/api/forms';
import type { FormSubmission, FormTargetContext, FormTemplate } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormBuilderDialog } from '@/features/forms/FormBuilderDialog';
import { FormRunnerDialog } from '@/features/forms/FormRunnerDialog';
import { FormSubmissionDetailDialog } from '@/features/forms/FormSubmissionDetailDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const TEMPLATES_KEY = ['form-templates', 'list'];
const SUBMISSIONS_KEY = ['form-submissions', 'list'];

const TARGET_CONTEXT_LABEL: Record<FormTargetContext, string> = {
  DRIVER: 'DriverOS',
  OFFICE: 'FleetHQ',
  BOTH: 'DriverOS + FleetHQ',
};

/**
 * Universal Forms (01-Product/Universal_Forms.md), office side: build
 * data-driven forms (incident reports, custom inspections, ...) and review
 * what's been submitted. Shares Smart Checklists' versioned-template +
 * immutable-submission lifecycle — see ChecklistsPage for the sibling screen.
 */
export function FormsPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<FormTemplate | undefined>();
  const [archiving, setArchiving] = useState<FormTemplate | undefined>();
  const [filling, setFilling] = useState<FormTemplate | undefined>();
  const [viewing, setViewing] = useState<FormSubmission | undefined>();

  const templatesQuery = useQuery({ queryKey: TEMPLATES_KEY, queryFn: () => listFormTemplates({ pageSize: 100 }) });
  const submissionsQuery = useQuery({ queryKey: SUBMISSIONS_KEY, queryFn: () => listFormSubmissions({ pageSize: 100 }) });

  const invalidateTemplates = () => queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });

  const createMutation = useMutation({
    mutationFn: createFormTemplate,
    onSuccess: () => {
      invalidateTemplates();
      toast({ title: 'Form template created', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not create form', description: describeApiError(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Parameters<typeof updateFormTemplate>[1]) => updateFormTemplate(id, input),
    onSuccess: () => {
      invalidateTemplates();
      toast({ title: 'Form template updated', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not update form', description: describeApiError(err), variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveFormTemplate,
    onSuccess: () => {
      invalidateTemplates();
      toast({ title: 'Form template archived', variant: 'success' });
      setArchiving(undefined);
    },
    onError: (err) => toast({ title: 'Could not archive form', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleBuilderSubmit(values: Parameters<typeof createFormTemplate>[0]) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...values });
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
          <PanelTitle>Forms</PanelTitle>
          <PanelDescription>Build custom forms — incident reports, inspections, anything beyond the standard checklist — and review what's been submitted.</PanelDescription>
        </div>
        {can(PERMISSIONS.FORMS_CREATE) && (
          <Button
            onClick={() => {
              setEditing(undefined);
              setBuilderOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New form
          </Button>
        )}
      </PanelHeader>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

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
            <EmptyState icon={FileInput} title="No form templates yet" description="Create your first form for operators or office staff to complete." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.name}
                      {template.referenceDocument && (
                        <button
                          type="button"
                          onClick={() => void openFormReferenceDocument(template.id)}
                          className="mt-0.5 flex items-center gap-1 text-xs font-normal text-accent-600 underline"
                        >
                          <FileText className="h-3 w-3" /> {template.referenceDocument.title}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>{TARGET_CONTEXT_LABEL[template.targetContext]}</TableCell>
                    <TableCell className="text-(--text-tertiary)">{template.fields.length}</TableCell>
                    <TableCell className="text-(--text-tertiary)">v{template.version}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Office staff can fill in a template flagged for FleetHQ (or both apps). */}
                        {template.targetContext !== 'DRIVER' && can(PERMISSIONS.FORMS_SUBMIT) && (
                          <Button variant="secondary" size="sm" onClick={() => setFilling(template)}>
                            Fill in
                          </Button>
                        )}
                        {can(PERMISSIONS.FORMS_EDIT) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(template);
                              setBuilderOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {can(PERMISSIONS.FORMS_ARCHIVE) && (
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

        <TabsContent value="submissions">
          {submissionsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : submissionsQuery.isError ? (
            <ErrorState message={describeApiError(submissionsQuery.error)} onRetry={() => submissionsQuery.refetch()} />
          ) : submissions.length === 0 ? (
            <EmptyState icon={FileInput} title="No submissions yet" description="Completed forms will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form</TableHead>
                  <TableHead>Submitted by</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.template?.name ?? '—'}</TableCell>
                    <TableCell className="text-(--text-tertiary)">{submission.submittedByUser?.fullName ?? 'Unknown'}</TableCell>
                    <TableCell className="text-(--text-tertiary)">{new Date(submission.submittedAt).toLocaleString()}</TableCell>
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

      <FormBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        template={editing}
        onSubmit={handleBuilderSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <FormRunnerDialog template={filling} onOpenChange={(open) => !open && setFilling(undefined)} />

      <FormSubmissionDetailDialog submission={viewing} onOpenChange={(open) => !open && setViewing(undefined)} />

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this form template?"
        description="It will no longer be offered to operators or office staff. Completed submissions that used it are unaffected."
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        isConfirming={archiveMutation.isPending}
      />
    </Panel>
  );
}
