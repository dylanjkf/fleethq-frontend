import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookUser, Plus, Search, Upload } from 'lucide-react';
import { archiveCustomer, createCustomer, listCustomers, updateCustomer } from '@/api/customers';
import { importCustomers } from '@/api/imports';
import type { Customer } from '@/api/types';
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
import { CustomerFormDialog, type CustomerFormValues } from '@/features/customers/CustomerFormDialog';
import { CustomerDeliveriesPanel } from '@/features/customers/CustomerDeliveriesPanel';
import { ImportWizardDialog } from '@/features/imports/ImportWizardDialog';
import { TimelinePanel } from '@/features/timeline/TimelinePanel';
import { usePermissions } from '@/hooks/usePermissions';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const QUERY_KEY = ['customers', 'list'];
const IMPORT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'address', label: 'Address', required: false },
  { key: 'contactName', label: 'Contact name', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

/**
 * The fleet's own address book (courier vertical, 00-Company/Commercial_Priority.md):
 * a saved directory of who the fleet delivers to, so a delivery stop can
 * reference a Customer instead of the office retyping the same address every
 * day. Internal only — no customer login or portal (CLAUDE.md scope).
 */
export function CustomersPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | undefined>();
  const [archiving, setArchiving] = useState<Customer | undefined>();
  const [viewingHistory, setViewingHistory] = useState<Customer | undefined>();
  const [viewingDeliveries, setViewingDeliveries] = useState<Customer | undefined>();

  const list = usePaginatedList<Customer>({ queryKey: QUERY_KEY, queryFn: listCustomers });

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Customer created', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not create customer', description: describeApiError(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & CustomerFormValues) => updateCustomer(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Customer updated', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not update customer', description: describeApiError(err), variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: 'Customer archived', variant: 'success' });
      setArchiving(undefined);
    },
    onError: (err) => toast({ title: 'Could not archive customer', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleFormSubmit(values: CustomerFormValues) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Customers</PanelTitle>
          <PanelDescription>Your saved delivery addresses — reference one on a stop instead of retyping it, and see each customer's delivery history.</PanelDescription>
        </div>
        {can(PERMISSIONS.CUSTOMERS_CREATE) && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New customer
            </Button>
          </div>
        )}
      </PanelHeader>

      <div className="mb-4">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--text-tertiary)" />
          <Input placeholder="Search name, address, contact…" value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} className="pl-8" />
        </div>
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
          icon={BookUser}
          title={list.search ? 'No customers match your search' : 'No customers yet'}
          description={list.search ? undefined : 'Save your first delivery address so stops can reference it instead of retyping it.'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell className="text-(--text-tertiary)">{customer.address ?? '—'}</TableCell>
                <TableCell className="text-(--text-tertiary)">
                  {customer.contactName ?? '—'}
                  {customer.phone && <span className="ml-1">· {customer.phone}</span>}
                </TableCell>
                <TableCell>
                  <ArchivedStatusBadge archivedAt={customer.archivedAt} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {can(PERMISSIONS.CUSTOMERS_EDIT) && !customer.archivedAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(customer);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {can(PERMISSIONS.CUSTOMERS_ARCHIVE) && !customer.archivedAt && (
                      <Button variant="ghost" size="sm" onClick={() => setArchiving(customer)}>
                        Archive
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => setViewingDeliveries(customer)}>
                      Deliveries
                    </Button>
                    {can(PERMISSIONS.TIMELINE_VIEW) && (
                      <Button variant="ghost" size="sm" onClick={() => setViewingHistory(customer)}>
                        History
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
        itemLabel="customers"
        isFetching={list.isFetching}
      />

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this customer?"
        description={`"${archiving?.name}" will no longer appear in active lists or be selectable for new stops. This can't be undone from here.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        isConfirming={archiveMutation.isPending}
      />

      <TimelinePanel
        entityType="CUSTOMER"
        entityId={viewingHistory?.id}
        title={viewingHistory?.name ?? ''}
        onOpenChange={(open) => !open && setViewingHistory(undefined)}
      />

      <CustomerDeliveriesPanel
        customerId={viewingDeliveries?.id}
        customerName={viewingDeliveries?.name ?? ''}
        onOpenChange={(open) => !open && setViewingDeliveries(undefined)}
      />

      <ImportWizardDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entityLabel="Customer"
        fields={IMPORT_FIELDS}
        importFn={importCustomers}
        onImported={() => queryClient.invalidateQueries({ queryKey: QUERY_KEY })}
      />
    </Panel>
  );
}
