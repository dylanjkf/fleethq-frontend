import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { listMaintenance, type MaintenanceStatus } from '@/api/maintenance';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState, EmptyState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

const PAGE_SIZE = 25;

function statusBadge(status: MaintenanceStatus) {
  if (status === 'COMPLETE') return <Badge tone="success">Complete</Badge>;
  if (status === 'IN_PROGRESS') return <Badge tone="accent">In progress</Badge>;
  if (status === 'PARTS_PENDING') return <Badge tone="warning">Parts pending</Badge>;
  return <Badge tone="danger">Open</Badge>;
}

function ageDays(createdAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
}

/** Cross-tenant Defect / Maintenance dashboard — every reported defect across every organisation. */
export function MaintenancePage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | MaintenanceStatus>('');

  const query = useQuery({
    queryKey: ['maintenance', page, status],
    queryFn: () => listMaintenance({ page, pageSize: PAGE_SIZE, status: status || undefined }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Defects &amp; maintenance</h1>

      <Select
        className="w-48"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value as '' | MaintenanceStatus);
          setPage(1);
        }}
      >
        <option value="">All statuses</option>
        <option value="OPEN">Open</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="PARTS_PENDING">Parts pending</option>
        <option value="COMPLETE">Complete</option>
      </Select>

      <Card>
        {query.isLoading ? (
          <PageSpinner />
        ) : query.isError ? (
          <div className="p-5">
            <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not load maintenance jobs.'} />
          </div>
        ) : query.data!.items.length === 0 ? (
          <EmptyState title="No maintenance jobs found" description="No defects match this filter yet." />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
                  <th className="px-5 py-3 font-medium">Defect</th>
                  <th className="px-5 py-3 font-medium">Organisation</th>
                  <th className="px-5 py-3 font-medium">Asset</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Age</th>
                </tr>
              </thead>
              <tbody>
                {query.data!.items.map((m) => (
                  <tr key={m.id} className="border-b border-(--border-subtle) last:border-0 hover:bg-(--surface-2)">
                    <td className="px-5 py-3">
                      <Link to={`/maintenance/${m.id}`} className="font-medium hover:text-accent-400">
                        {m.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-(--text-secondary)">
                      <Link to={`/organisations/${m.company.id}`} className="hover:text-accent-400">
                        {m.company.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-(--text-secondary)">{m.asset.name}</td>
                    <td className="px-5 py-3">{statusBadge(m.status)}</td>
                    <td className="px-5 py-3 text-(--text-secondary)">{m.status === 'COMPLETE' ? '—' : `${ageDays(m.createdAt)}d`}</td>
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
