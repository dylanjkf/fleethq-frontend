import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { searchCustomerUsers } from '@/api/customer-users';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState, EmptyState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

const PAGE_SIZE = 25;

/**
 * The cross-tenant "who is this email?" entry point. A support ticket almost
 * always arrives as an email, not a company — this reaches any customer user
 * across every organisation, which the org list can't.
 */
export function CustomerUsersPage() {
  const [page, setPage] = useState(1);
  const [email, setEmail] = useState('');

  const query = useQuery({
    queryKey: ['customer-users', page, email],
    queryFn: () => searchCustomerUsers({ page, pageSize: PAGE_SIZE, email: email || undefined }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Customer users</h1>

      <Input
        placeholder="Search by email…"
        className="max-w-sm"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setPage(1);
        }}
      />

      <Card>
        {query.isLoading ? (
          <PageSpinner />
        ) : query.isError ? (
          <div className="p-5">
            <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not search customer users.'} />
          </div>
        ) : query.data!.items.length === 0 ? (
          <EmptyState title="No customer users found" description="Search by email to find an account across every organisation." />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Organisations</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {query.data!.items.map((u) => (
                  <tr key={u.id} className="border-b border-(--border-subtle) last:border-0 hover:bg-(--surface-2)">
                    <td className="px-5 py-3">
                      <Link to={`/customer-users/${u.id}`} className="font-medium hover:text-accent-400">
                        {u.fullName}
                      </Link>
                      <p className="text-xs text-(--text-tertiary)">{u.email ?? u.username}</p>
                    </td>
                    <td className="px-5 py-3 text-(--text-secondary)">
                      {u.organisations.length === 0 ? (
                        <span className="text-(--text-tertiary)">No active memberships</span>
                      ) : (
                        u.organisations.map((o) => (
                          <Link key={o.companyId} to={`/organisations/${o.companyId}`} className="mr-2 hover:text-accent-400">
                            {o.companyName}
                            <span className="text-(--text-tertiary)"> ({o.role.name})</span>
                          </Link>
                        ))
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {u.accountDisabled && <Badge tone="neutral">Disabled</Badge>}
                        {u.locked && <Badge tone="danger">Locked</Badge>}
                        <Badge tone={u.emailVerified ? 'success' : 'warning'}>{u.emailVerified ? 'Verified' : 'Unverified'}</Badge>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-(--text-secondary)">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={query.data!.total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
