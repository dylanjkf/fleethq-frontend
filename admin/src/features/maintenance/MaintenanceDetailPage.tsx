import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getMaintenance, type MaintenanceStatus } from '@/api/maintenance';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

function statusBadge(status: MaintenanceStatus) {
  if (status === 'COMPLETE') return <Badge tone="success">Complete</Badge>;
  if (status === 'IN_PROGRESS') return <Badge tone="accent">In progress</Badge>;
  if (status === 'PARTS_PENDING') return <Badge tone="warning">Parts pending</Badge>;
  return <Badge tone="danger">Open</Badge>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-(--text-tertiary)">{label}</p>
      <p className="text-sm">{children}</p>
    </div>
  );
}

function money(n: number | null): string {
  return n == null ? '—' : `$${n.toFixed(2)}`;
}

export function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({ queryKey: ['maintenance-job', id], queryFn: () => getMaintenance(id!), enabled: !!id });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError) {
    return <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not load the maintenance job.'} />;
  }
  const m = query.data!;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/maintenance" className="text-sm text-(--text-tertiary) hover:text-accent-400">
            ← Defects &amp; maintenance
          </Link>
          <h1 className="text-xl font-semibold">{m.title}</h1>
        </div>
        {statusBadge(m.status)}
      </div>

      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Organisation">
            <Link to={`/organisations/${m.company.id}`} className="hover:text-accent-400">
              {m.company.name}
            </Link>
          </Field>
          <Field label="Asset">
            {m.asset.name}
            {m.asset.registration ? ` · ${m.asset.registration}` : ''}
          </Field>
          <Field label="Reported by">{m.reportedByOperator?.fullName ?? '—'}</Field>
          <Field label="Reported">{new Date(m.createdAt).toLocaleString()}</Field>
          <Field label="Completed">{m.completedAt ? new Date(m.completedAt).toLocaleString() : '—'}</Field>
          <Field label="Parts / labour">
            {money(m.partsCost)} / {money(m.laborCost)}
          </Field>
        </CardBody>
      </Card>

      {m.description && (
        <Card>
          <CardBody>
            <p className="text-xs text-(--text-tertiary)">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{m.description}</p>
          </CardBody>
        </Card>
      )}

      {m.resolutionNotes && (
        <Card>
          <CardBody>
            <p className="text-xs text-(--text-tertiary)">Resolution notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{m.resolutionNotes}</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
