import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserPlus, Users as UsersIcon } from 'lucide-react';
import { createUser, deactivateUser, linkExistingUser, listUsers, updateUserRole } from '@/api/users';
import { listRoles } from '@/api/roles';
import type { MembershipView } from '@/api/types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArchivedStatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  LinkExistingUserDialog,
  type LinkExistingUserFormValues,
} from '@/features/administration/LinkExistingUserDialog';
import { UserFormDialog, type UserFormValues } from '@/features/administration/UserFormDialog';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const USERS_KEY = ['users', 'list'];
const ROLES_KEY = ['roles', 'list'];

export function UsersTab() {
  const { user: currentUser } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<MembershipView | undefined>();

  const usersQuery = useQuery({ queryKey: USERS_KEY, queryFn: () => listUsers({ pageSize: 100 }) });
  const rolesQuery = useQuery({ queryKey: ROLES_KEY, queryFn: () => listRoles({ pageSize: 100 }) });

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: USERS_KEY });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      invalidateUsers();
      toast({ title: 'User invited', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not invite user', description: describeApiError(err), variant: 'destructive' }),
  });

  const linkMutation = useMutation({
    mutationFn: linkExistingUser,
    onSuccess: () => {
      invalidateUsers();
      toast({ title: 'User granted access', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not link user', description: describeApiError(err), variant: 'destructive' }),
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({ membershipId, roleId }: { membershipId: string; roleId: string }) =>
      updateUserRole(membershipId, roleId),
    onSuccess: () => {
      invalidateUsers();
      toast({ title: 'Role updated', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not change role', description: describeApiError(err), variant: 'destructive' }),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      invalidateUsers();
      toast({ title: 'User deactivated', variant: 'success' });
      setDeactivating(undefined);
    },
    onError: (err) => toast({ title: 'Could not deactivate user', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleInvite(values: UserFormValues) {
    await createMutation.mutateAsync(values);
  }

  async function handleLink(values: LinkExistingUserFormValues) {
    await linkMutation.mutateAsync(values);
  }

  if (usersQuery.isLoading || rolesQuery.isLoading) return <Skeleton className="h-64 w-full" />;
  if (usersQuery.isError) {
    return <ErrorState message={describeApiError(usersQuery.error)} onRetry={() => usersQuery.refetch()} />;
  }
  // Roles feed the invite/link role pickers — a silent empty list would look
  // like "this company has no roles" and make inviting anyone impossible with no
  // explanation. Surface the failure instead.
  if (rolesQuery.isError) {
    return <ErrorState message={describeApiError(rolesQuery.error)} onRetry={() => rolesQuery.refetch()} />;
  }

  const users = usersQuery.data?.items ?? [];
  const roles = rolesQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        {can(PERMISSIONS.USERS_CREATE) && (
          <>
            <Button variant="secondary" onClick={() => setLinkOpen(true)}>
              <UserPlus className="h-4 w-4" /> Link existing user
            </Button>
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4" /> Invite user
            </Button>
          </>
        )}
      </div>

      {users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((membership) => {
              const isSelf = membership.userId === currentUser?.userId;
              return (
                <TableRow key={membership.id}>
                  <TableCell className="font-medium">
                    {membership.fullName}
                    {isSelf && <span className="ml-2 text-xs text-(--text-tertiary)">(you)</span>}
                  </TableCell>
                  <TableCell className="text-(--text-tertiary)">{membership.username}</TableCell>
                  <TableCell>
                    {can(PERMISSIONS.USERS_EDIT) && !membership.archivedAt ? (
                      <Select
                        value={membership.role.id}
                        onValueChange={(roleId) =>
                          roleChangeMutation.mutate({ membershipId: membership.id, roleId })
                        }
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      membership.role.name
                    )}
                  </TableCell>
                  <TableCell>
                    <ArchivedStatusBadge archivedAt={membership.archivedAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    {can(PERMISSIONS.USERS_ARCHIVE) && !membership.archivedAt && !isSelf && (
                      <Button variant="ghost" size="sm" onClick={() => setDeactivating(membership)}>
                        Deactivate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <UserFormDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={roles}
        onSubmit={handleInvite}
        isSubmitting={createMutation.isPending}
      />

      <LinkExistingUserDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        roles={roles}
        onSubmit={handleLink}
        isSubmitting={linkMutation.isPending}
      />

      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(open) => !open && setDeactivating(undefined)}
        title="Deactivate this user?"
        description={`"${deactivating?.fullName}" will lose access to ${currentUser?.company.name}.`}
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={() => deactivating && deactivateMutation.mutate(deactivating.id)}
        isConfirming={deactivateMutation.isPending}
      />
    </div>
  );
}
