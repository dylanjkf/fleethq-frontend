import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminUser,
  deactivateAdminUser,
  listAdminRoles,
  listAdminUsers,
  reactivateAdminUser,
  updateAdminUserRole,
  type AdminUserSummary,
  type CreateAdminUserInput,
} from '@/api/admin-users';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState, EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ApiClientError } from '@/api/client';

const PAGE_SIZE = 25;
const EMPTY_FORM: CreateAdminUserInput = { username: '', email: '', fullName: '', password: '', roleId: '' };

export function AdminUsersPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('admin_users:manage');
  const qc = useQueryClient();
  const { success, error } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateAdminUserInput>(EMPTY_FORM);
  const [pendingDeactivate, setPendingDeactivate] = useState<AdminUserSummary | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin-users', page, search, includeArchived],
    queryFn: () => listAdminUsers({ page, pageSize: PAGE_SIZE, search: search || undefined, includeArchived }),
  });
  const rolesQuery = useQuery({ queryKey: ['admin-roles'], queryFn: listAdminRoles, enabled: canManage });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin-users'] });

  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      success('Staff account created');
      setForm(EMPTY_FORM);
      setShowCreate(false);
      invalidate();
    },
    onError: (e) => error(e instanceof ApiClientError ? e.message : 'Could not create the account.'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, roleId }: { id: string; roleId: string }) => updateAdminUserRole(id, roleId),
    onSuccess: () => {
      success('Role updated');
      invalidate();
    },
    onError: (e) => error(e instanceof ApiClientError ? e.message : 'Could not change the role.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, deactivate }: { id: string; deactivate: boolean }) => (deactivate ? deactivateAdminUser(id) : reactivateAdminUser(id)),
    onSuccess: (_r, v) => {
      success(v.deactivate ? 'Account deactivated' : 'Account reactivated');
      invalidate();
    },
    onError: (e) => error(e instanceof ApiClientError ? e.message : 'Could not update the account.'),
  });

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Staff accounts</h1>
        {canManage && (
          <Button onClick={() => setShowCreate((v) => !v)} variant={showCreate ? 'secondary' : 'primary'}>
            {showCreate ? 'Cancel' : 'Add staff account'}
          </Button>
        )}
      </div>

      {canManage && showCreate && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">New FleetHQ staff account</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={submitCreate} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-(--text-tertiary)">Username</span>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </label>
              <label className="text-sm">
                <span className="text-(--text-tertiary)">Email</span>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </label>
              <label className="text-sm">
                <span className="text-(--text-tertiary)">Full name</span>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              </label>
              <label className="text-sm">
                <span className="text-(--text-tertiary)">Role</span>
                <Select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} required>
                  <option value="" disabled>
                    Select a role…
                  </option>
                  {rolesQuery.data?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-(--text-tertiary)">Temporary password (they should change it)</span>
                <Input
                  type="text"
                  autoComplete="off"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </label>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating…' : 'Create account'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name, email, username…"
          className="max-w-xs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <label className="flex items-center gap-2 text-sm text-(--text-secondary)">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => {
              setIncludeArchived(e.target.checked);
              setPage(1);
            }}
          />
          Show deactivated
        </label>
      </div>

      <Card>
        {usersQuery.isLoading ? (
          <PageSpinner />
        ) : usersQuery.isError ? (
          <div className="p-5">
            <ErrorState message={usersQuery.error instanceof ApiClientError ? usersQuery.error.message : 'Could not load staff accounts.'} />
          </div>
        ) : usersQuery.data!.items.length === 0 ? (
          <EmptyState title="No staff accounts found" description="Try a different search." />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {usersQuery.data!.items.map((u) => (
                  <tr key={u.id} className="border-b border-(--border-subtle) last:border-0 hover:bg-(--surface-2)">
                    <td className="px-5 py-3">
                      <p className="font-medium">{u.fullName}</p>
                      <p className="text-xs text-(--text-tertiary)">
                        {u.username} · {u.email}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      {canManage ? (
                        <Select
                          className="w-40"
                          value={u.role.id}
                          disabled={roleMutation.isPending}
                          onChange={(e) => roleMutation.mutate({ id: u.id, roleId: e.target.value })}
                        >
                          {(rolesQuery.data ?? [u.role]).map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        u.role.name
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {u.deactivated && <Badge tone="neutral">Deactivated</Badge>}
                        {u.locked && <Badge tone="danger">Locked</Badge>}
                        <Badge tone={u.mfaEnabled ? 'success' : 'warning'}>{u.mfaEnabled ? 'MFA on' : 'No MFA'}</Badge>
                        {u.mustResetPassword && <Badge tone="warning">Must reset</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-(--text-secondary)">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      {canManage &&
                        (u.deactivated ? (
                          <Button size="sm" variant="secondary" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: u.id, deactivate: false })}>
                            Reactivate
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setPendingDeactivate(u)}>
                            Deactivate
                          </Button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={usersQuery.data!.total} onPageChange={setPage} />
          </>
        )}
      </Card>

      {pendingDeactivate && (
        <ConfirmDialog
          title={`Deactivate ${pendingDeactivate.fullName}?`}
          description="They will no longer be able to sign in to the admin console. You can reactivate the account later."
          confirmLabel="Deactivate"
          danger
          onConfirm={() => {
            statusMutation.mutate({ id: pendingDeactivate.id, deactivate: true });
            setPendingDeactivate(null);
          }}
          onCancel={() => setPendingDeactivate(null)}
        />
      )}
    </div>
  );
}
