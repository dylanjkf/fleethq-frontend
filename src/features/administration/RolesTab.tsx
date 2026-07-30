import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, ShieldCheck } from 'lucide-react';
import { archiveRole, cloneRole, createRole, listRoles, updateRole } from '@/api/roles';
import type { RoleView } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoleFormDialog } from '@/features/administration/RoleFormDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const QUERY_KEY = ['roles', 'list'];

export function RolesTab() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleView | undefined>();
  const [archiving, setArchiving] = useState<RoleView | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listRoles({ pageSize: 100 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Role created', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not create role', description: describeApiError(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string; name: string; description?: string; permissionKeys: string[] }) =>
      updateRole(id, input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Role updated', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not update role', description: describeApiError(err), variant: 'destructive' }),
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => cloneRole(id, name),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Role cloned', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not clone role', description: describeApiError(err), variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveRole,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Role archived', variant: 'success' });
      setArchiving(undefined);
    },
    onError: (err) =>
      toast({
        title: 'Could not archive role',
        // Surfaces the exact reassignment-required message from the backend
        // (409 ROLE_IN_USE, with activeMemberCount) rather than a generic error.
        description: describeApiError(err),
        variant: 'destructive',
      }),
  });

  async function handleFormSubmit(values: { name: string; description?: string; permissionKeys: string[] }) {
    if (editingRole) {
      await updateMutation.mutateAsync({ id: editingRole.id, ...values });
    } else {
      await createMutation.mutateAsync(values);
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />;

  const roles = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {can(PERMISSIONS.ROLES_CREATE) && (
          <Button
            onClick={() => {
              setEditingRole(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New role
          </Button>
        )}
      </div>

      {roles.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No roles yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Type</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">
                  {role.name}
                  {role.description && (
                    <p className="text-xs font-normal text-(--text-tertiary)">{role.description}</p>
                  )}
                </TableCell>
                <TableCell className="text-(--text-tertiary)">
                  {role.permissionKeys.length} granted
                </TableCell>
                <TableCell>
                  {role.isSystemTemplate ? <Badge variant="accent">Template</Badge> : <Badge>Custom</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {can(PERMISSIONS.ROLES_EDIT) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRole(role);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {can(PERMISSIONS.ROLES_CREATE) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cloneMutation.mutate({ id: role.id, name: `${role.name} (copy)` })}
                      >
                        <Copy className="h-3.5 w-3.5" /> Clone
                      </Button>
                    )}
                    {can(PERMISSIONS.ROLES_ARCHIVE) && (
                      <Button variant="ghost" size="sm" onClick={() => setArchiving(role)}>
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

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        role={editingRole}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this role?"
        description={`If anyone is still assigned to "${archiving?.name}", you'll need to reassign them first.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        isConfirming={archiveMutation.isPending}
      />
    </div>
  );
}
