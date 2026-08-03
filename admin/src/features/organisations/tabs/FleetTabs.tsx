import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchAssets, searchOperators } from '@/api/fleet';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState, EmptyState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

const PAGE_SIZE = 15;

/** Vehicles registered to this organisation (the cross-tenant fleet endpoint scoped by companyId). */
export function VehiclesTab({ companyId }: { companyId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['org-vehicles', companyId, page],
    queryFn: () => searchAssets({ companyId, page, pageSize: PAGE_SIZE }),
  });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError) return <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not load vehicles.'} />;
  if (query.data!.items.length === 0) return <EmptyState title="No vehicles" description="This organisation has no assets recorded." />;

  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Make / model</th>
            <th className="px-5 py-3 font-medium">Registration</th>
          </tr>
        </thead>
        <tbody>
          {query.data!.items.map((a) => (
            <tr key={a.id} className="border-b border-(--border-subtle) last:border-0">
              <td className="px-5 py-3 font-medium">{a.name}</td>
              <td className="px-5 py-3 text-(--text-secondary)">{[a.make, a.model, a.year].filter(Boolean).join(' ') || '—'}</td>
              <td className="px-5 py-3 text-(--text-secondary)">{a.registration ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} pageSize={PAGE_SIZE} total={query.data!.total} onPageChange={setPage} />
    </Card>
  );
}

/** Drivers/operators belonging to this organisation. */
export function DriversTab({ companyId }: { companyId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['org-drivers', companyId, page],
    queryFn: () => searchOperators({ companyId, page, pageSize: PAGE_SIZE }),
  });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError) return <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not load drivers.'} />;
  if (query.data!.items.length === 0) return <EmptyState title="No drivers" description="This organisation has no operators recorded." />;

  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Email</th>
            <th className="px-5 py-3 font-medium">Phone</th>
          </tr>
        </thead>
        <tbody>
          {query.data!.items.map((o) => (
            <tr key={o.id} className="border-b border-(--border-subtle) last:border-0">
              <td className="px-5 py-3 font-medium">{o.fullName}</td>
              <td className="px-5 py-3 text-(--text-secondary)">{o.email ?? '—'}</td>
              <td className="px-5 py-3 text-(--text-secondary)">{o.phone ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} pageSize={PAGE_SIZE} total={query.data!.total} onPageChange={setPage} />
    </Card>
  );
}
