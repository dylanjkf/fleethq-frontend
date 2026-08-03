import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { listInspections } from '@/api/inspections';
import { listMaintenance, type MaintenanceStatus } from '@/api/maintenance';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState, EmptyState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

const PAGE_SIZE = 15;

/** This organisation's checklist inspections (the cross-tenant inspection endpoint scoped by companyId). */
export function OrgInspectionsTab({ companyId }: { companyId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['org-inspections', companyId, page],
    queryFn: () => listInspections({ companyId, page, pageSize: PAGE_SIZE }),
  });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError) return <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not load inspections.'} />;
  if (query.data!.items.length === 0) return <EmptyState title="No inspections" description="This organisation has no checklist inspections yet." />;

  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
            <th className="px-5 py-3 font-medium">Inspection</th>
            <th className="px-5 py-3 font-medium">Asset</th>
            <th className="px-5 py-3 font-medium">Result</th>
            <th className="px-5 py-3 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {query.data!.items.map((i) => (
            <tr key={i.id} className="border-b border-(--border-subtle) last:border-0">
              <td className="px-5 py-3">
                <Link to={`/inspections/${i.id}`} className="font-medium hover:text-accent-400">
                  {i.templateName}
                </Link>
              </td>
              <td className="px-5 py-3 text-(--text-secondary)">{i.asset.name}</td>
              <td className="px-5 py-3">{i.hasFailures ? <Badge tone="danger">Failed</Badge> : <Badge tone="success">Passed</Badge>}</td>
              <td className="px-5 py-3 text-(--text-secondary)">{new Date(i.submittedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} pageSize={PAGE_SIZE} total={query.data!.total} onPageChange={setPage} />
    </Card>
  );
}

function statusBadge(status: MaintenanceStatus) {
  if (status === 'COMPLETE') return <Badge tone="success">Complete</Badge>;
  if (status === 'IN_PROGRESS') return <Badge tone="accent">In progress</Badge>;
  if (status === 'PARTS_PENDING') return <Badge tone="warning">Parts pending</Badge>;
  return <Badge tone="danger">Open</Badge>;
}

/** This organisation's maintenance jobs / defects. */
export function OrgMaintenanceTab({ companyId }: { companyId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['org-maintenance', companyId, page],
    queryFn: () => listMaintenance({ companyId, page, pageSize: PAGE_SIZE }),
  });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError) return <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not load maintenance jobs.'} />;
  if (query.data!.items.length === 0) return <EmptyState title="No maintenance jobs" description="This organisation has no defects recorded." />;

  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
            <th className="px-5 py-3 font-medium">Defect</th>
            <th className="px-5 py-3 font-medium">Asset</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Reported</th>
          </tr>
        </thead>
        <tbody>
          {query.data!.items.map((m) => (
            <tr key={m.id} className="border-b border-(--border-subtle) last:border-0">
              <td className="px-5 py-3">
                <Link to={`/maintenance/${m.id}`} className="font-medium hover:text-accent-400">
                  {m.title}
                </Link>
              </td>
              <td className="px-5 py-3 text-(--text-secondary)">{m.asset.name}</td>
              <td className="px-5 py-3">{statusBadge(m.status)}</td>
              <td className="px-5 py-3 text-(--text-secondary)">{new Date(m.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} pageSize={PAGE_SIZE} total={query.data!.total} onPageChange={setPage} />
    </Card>
  );
}
