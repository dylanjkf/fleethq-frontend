import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, KeyRound, Plus, Search, ShieldOff, Upload, Users } from 'lucide-react';
import {
  archiveOperator,
  createOperator,
  eraseOperatorData,
  exportOperatorData,
  linkOperatorUser,
  listOperators,
  updateOperator,
} from '@/api/operators';
import { importOperators } from '@/api/imports';
import { listRoles } from '@/api/roles';
import type { Operator } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { ArchivedStatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OperatorFormDialog, type OperatorFormValues } from '@/features/operators/OperatorFormDialog';
import { LinkOperatorUserDialog, type LinkOperatorUserFormValues } from '@/features/operators/LinkOperatorUserDialog';
import { ImportWizardDialog } from '@/features/imports/ImportWizardDialog';
import { GraphPanel } from '@/features/graph/GraphPanel';
import { usePermissions } from '@/hooks/usePermissions';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const QUERY_KEY = ['operators', 'list'];
const IMPORT_FIELDS = [
  { key: 'fullName', label: 'Full name', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Phone', required: false },
];

export function OperatorsListPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [linkingOperator, setLinkingOperator] = useState<Operator | undefined>();
  const [editingOperator, setEditingOperator] = useState<Operator | undefined>();
  const [archiving, setArchiving] = useState<Operator | undefined>();
  const [erasing, setErasing] = useState<Operator | undefined>();
  const [viewingRelationships, setViewingRelationships] = useState<Operator | undefined>();

  const list = usePaginatedList<Operator>({ queryKey: QUERY_KEY, queryFn: listOperators });
  const rolesQuery = useQuery({
    queryKey: ['roles', 'list'],
    queryFn: () => listRoles({ pageSize: 100 }),
    enabled: !!linkingOperator,
  });

  const createMutation = useMutation({
    mutationFn: createOperator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Operator created', variant: 'success' });
    },
    onError: (err) =>
      toast({ title: 'Could not create operator', description: describeApiError(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & OperatorFormValues) => updateOperator(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Operator updated', variant: 'success' });
    },
    onError: (err) =>
      toast({ title: 'Could not update operator', description: describeApiError(err), variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveOperator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Operator archived', variant: 'success' });
      setArchiving(undefined);
    },
    onError: (err) =>
      toast({ title: 'Could not archive operator', description: describeApiError(err), variant: 'destructive' }),
  });

  const linkUserMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & LinkOperatorUserFormValues) => linkOperatorUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'DriverOS login granted', variant: 'success' });
    },
    onError: (err) =>
      toast({ title: 'Could not grant login', description: describeApiError(err), variant: 'destructive' }),
  });

  const exportMutation = useMutation({
    mutationFn: exportOperatorData,
    onSuccess: (data, operatorId) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `operator-${operatorId}-data-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (err) =>
      toast({ title: 'Could not export data', description: describeApiError(err), variant: 'destructive' }),
  });

  const eraseMutation = useMutation({
    mutationFn: eraseOperatorData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Personal data erased', variant: 'success' });
      setErasing(undefined);
    },
    onError: (err) =>
      toast({ title: 'Could not erase personal data', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleFormSubmit(values: OperatorFormValues) {
    if (editingOperator) {
      await updateMutation.mutateAsync({ id: editingOperator.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Operators</PanelTitle>
          <PanelDescription>Everyone who operates an Asset in your fleet.</PanelDescription>
        </div>
        {can(PERMISSIONS.OPERATORS_CREATE) && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
            <Button
              onClick={() => {
                setEditingOperator(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New operator
            </Button>
          </div>
        )}
      </PanelHeader>

      <div className="relative w-72">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--text-tertiary)" />
        <Input
          placeholder="Search name, email, phone…"
          value={list.searchInput}
          onChange={(e) => list.setSearchInput(e.target.value)}
          className="pl-8"
        />
      </div>

      {list.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState message={describeApiError(list.error)} onRetry={() => list.refetch()} />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={list.search ? 'No operators match your search' : 'Add your first operator'}
          description={list.search ? undefined : 'Operators are your drivers. Add them here, then give each a DriverOS login so they can see and complete their runs.'}
          action={
            !list.search && can(PERMISSIONS.OPERATORS_CREATE) ? (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" /> Import CSV
                </Button>
                <Button onClick={() => { setEditingOperator(undefined); setFormOpen(true); }}>
                  <Plus className="h-4 w-4" /> New operator
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>DriverOS</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((operator) => (
              <TableRow key={operator.id}>
                <TableCell className="font-medium">{operator.fullName}</TableCell>
                <TableCell className="text-(--text-tertiary)">{operator.email ?? '—'}</TableCell>
                <TableCell className="text-(--text-tertiary)">{operator.phone ?? '—'}</TableCell>
                <TableCell>
                  {operator.userId ? (
                    <Badge variant="success">Linked</Badge>
                  ) : (
                    <Badge variant="neutral">No login</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <ArchivedStatusBadge archivedAt={operator.archivedAt} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {can(PERMISSIONS.USERS_CREATE) && !operator.archivedAt && !operator.userId && (
                      <Button variant="ghost" size="sm" onClick={() => setLinkingOperator(operator)}>
                        <KeyRound className="h-3.5 w-3.5" /> Link login
                      </Button>
                    )}
                    {can(PERMISSIONS.OPERATORS_EDIT) && !operator.archivedAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingOperator(operator);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {can(PERMISSIONS.OPERATORS_ARCHIVE) && !operator.archivedAt && (
                      <Button variant="ghost" size="sm" onClick={() => setArchiving(operator)}>
                        Archive
                      </Button>
                    )}
                    {can(PERMISSIONS.PRIVACY_EXPORT_DATA) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={exportMutation.isPending}
                        onClick={() => exportMutation.mutate(operator.id)}
                      >
                        <Download className="h-3.5 w-3.5" /> Export data
                      </Button>
                    )}
                    {can(PERMISSIONS.PRIVACY_ERASE_DATA) && !!operator.archivedAt && (
                      <Button variant="ghost" size="sm" onClick={() => setErasing(operator)}>
                        <ShieldOff className="h-3.5 w-3.5" /> Erase data
                      </Button>
                    )}
                    {can(PERMISSIONS.FLEET_GRAPH_VIEW) && (
                      <Button variant="ghost" size="sm" onClick={() => setViewingRelationships(operator)}>
                        Relationships
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination
        rangeStart={list.rangeStart}
        rangeEnd={list.rangeEnd}
        total={list.total}
        page={list.page}
        totalPages={list.totalPages}
        canPrev={list.canPrev}
        canNext={list.canNext}
        onPrev={list.prevPage}
        onNext={list.nextPage}
        itemLabel="operators"
        isFetching={list.isFetching}
      />

      <OperatorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        operator={editingOperator}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this operator?"
        description={`"${archiving?.fullName}" will no longer appear in active lists${archiving?.userId ? ', and their DriverOS login will be deactivated' : ''}.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        isConfirming={archiveMutation.isPending}
      />

      <ImportWizardDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityLabel="Operator"
        fields={IMPORT_FIELDS}
        importFn={importOperators}
        onImported={() => queryClient.invalidateQueries({ queryKey: QUERY_KEY })}
      />

      <ConfirmDialog
        open={!!erasing}
        onOpenChange={(open) => !open && setErasing(undefined)}
        title="Erase this operator's personal data?"
        description={`This permanently erases "${erasing?.fullName}"'s name, contact details, licence/medical document numbers, and any scanned files. This can't be undone. Their job/shift/timeline history is kept, per 14-Security/Privacy_Data_Protection.md.`}
        confirmLabel="Erase permanently"
        variant="destructive"
        onConfirm={() => erasing && eraseMutation.mutate(erasing.id)}
        isConfirming={eraseMutation.isPending}
      />

      <GraphPanel
        entityType="OPERATOR"
        entityId={viewingRelationships?.id}
        title={viewingRelationships?.fullName ?? ''}
        onOpenChange={(open) => !open && setViewingRelationships(undefined)}
      />

      <LinkOperatorUserDialog
        open={!!linkingOperator}
        onOpenChange={(open) => !open && setLinkingOperator(undefined)}
        operator={linkingOperator}
        roles={rolesQuery.data?.items ?? []}
        onSubmit={async (values) => {
          await linkUserMutation.mutateAsync({ id: linkingOperator!.id, ...values });
        }}
        isSubmitting={linkUserMutation.isPending}
      />
    </Panel>
  );
}
