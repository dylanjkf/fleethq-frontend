import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { listInspections } from '@/api/inspections';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState, EmptyState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

const PAGE_SIZE = 25;

/** Cross-tenant Inspection Centre — every checklist inspection across every organisation. */
export function InspectionsPage() {
  const [page, setPage] = useState(1);
  const [failedOnly, setFailedOnly] = useState(false);

  const query = useQuery({
    queryKey: ['inspections', page, failedOnly],
    queryFn: () => listInspections({ page, pageSize: PAGE_SIZE, failedOnly: failedOnly || undefined }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Inspection centre</h1>

      <label className="flex items-center gap-2 text-sm text-(--text-secondary)">
        <input
          type="checkbox"
          checked={failedOnly}
          onChange={(e) => {
            setFailedOnly(e.target.checked);
            setPage(1);
          }}
        />
        Failed inspections only
      </label>

      <Card>
        {query.isLoading ? (
          <PageSpinner />
        ) : query.isError ? (
          <div className="p-5">
            <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not load inspections.'} />
          </div>
        ) : query.data!.items.length === 0 ? (
          <EmptyState title="No inspections found" description="No checklist inspections match this filter yet." />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
                  <th className="px-5 py-3 font-medium">Inspection</th>
                  <th className="px-5 py-3 font-medium">Organisation</th>
                  <th className="px-5 py-3 font-medium">Asset</th>
                  <th className="px-5 py-3 font-medium">Operator</th>
                  <th className="px-5 py-3 font-medium">Result</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {query.data!.items.map((i) => (
                  <tr key={i.id} className="border-b border-(--border-subtle) last:border-0 hover:bg-(--surface-2)">
                    <td className="px-5 py-3">
                      <Link to={`/inspections/${i.id}`} className="font-medium hover:text-accent-400">
                        {i.templateName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-(--text-secondary)">
                      <Link to={`/organisations/${i.company.id}`} className="hover:text-accent-400">
                        {i.company.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-(--text-secondary)">{i.asset.name}</td>
                    <td className="px-5 py-3 text-(--text-secondary)">{i.operator?.fullName ?? '—'}</td>
                    <td className="px-5 py-3">{i.hasFailures ? <Badge tone="danger">Failed</Badge> : <Badge tone="success">Passed</Badge>}</td>
                    <td className="px-5 py-3 text-(--text-secondary)">{new Date(i.submittedAt).toLocaleString()}</td>
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
