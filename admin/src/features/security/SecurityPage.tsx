import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { getSecurityOverview } from '@/api/security';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState, EmptyState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-(--text-tertiary)">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-(--text-tertiary)">{sub}</p>}
      </CardBody>
    </Card>
  );
}

/** Platform-wide Security Centre — MFA adoption, locked accounts, sign-in risk. */
export function SecurityPage() {
  const query = useQuery({ queryKey: ['security-overview'], queryFn: getSecurityOverview });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError) {
    return <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not load the security centre.'} />;
  }
  const s = query.data!;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Security centre</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Customer MFA adoption" value={`${s.customerMfa.adoptionPct}%`} sub={`${s.customerMfa.enabled} / ${s.customerMfa.total} accounts`} />
        <StatCard label="Staff MFA adoption" value={`${s.adminMfa.adoptionPct}%`} sub={`${s.adminMfa.enabled} / ${s.adminMfa.total} staff`} />
        <StatCard label="Locked accounts" value={s.lockedCustomerAccounts} />
        <StatCard label="With failed logins" value={s.customersWithFailedLogins} />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Currently locked customer accounts</h2>
        </CardHeader>
        {s.lockedAccounts.length === 0 ? (
          <EmptyState title="No locked accounts" description="No customer accounts are locked right now." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Organisation</th>
                <th className="px-5 py-3 font-medium">Failed attempts</th>
                <th className="px-5 py-3 font-medium">Locked until</th>
              </tr>
            </thead>
            <tbody>
              {s.lockedAccounts.map((u) => (
                <tr key={u.id} className="border-b border-(--border-subtle) last:border-0 hover:bg-(--surface-2)">
                  <td className="px-5 py-3">
                    <Link to={`/customer-users/${u.id}`} className="font-medium hover:text-accent-400">
                      {u.fullName}
                    </Link>
                    <p className="text-xs text-(--text-tertiary)">{u.email ?? u.username}</p>
                  </td>
                  <td className="px-5 py-3 text-(--text-secondary)">
                    {u.organisation ? (
                      <Link to={`/organisations/${u.organisation.id}`} className="hover:text-accent-400">
                        {u.organisation.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone="warning">{u.failedLoginCount}</Badge>
                  </td>
                  <td className="px-5 py-3 text-(--text-secondary)">{u.lockedUntil ? new Date(u.lockedUntil).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
