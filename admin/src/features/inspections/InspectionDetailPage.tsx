import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getInspection } from '@/api/inspections';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-(--text-tertiary)">{label}</p>
      <p className="text-sm">{children}</p>
    </div>
  );
}

/** Read-only inspection "replay": the submission's metadata plus the answered
 *  template snapshot. Any photo/signature/GPS payloads live inside `answers`. */
export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({ queryKey: ['inspection', id], queryFn: () => getInspection(id!), enabled: !!id });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError) {
    return <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not load the inspection.'} />;
  }
  const i = query.data!;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/inspections" className="text-sm text-(--text-tertiary) hover:text-accent-400">
            ← Inspection centre
          </Link>
          <h1 className="text-xl font-semibold">{i.template.name}</h1>
        </div>
        {i.hasFailures ? <Badge tone="danger">Failed</Badge> : <Badge tone="success">Passed</Badge>}
      </div>

      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Organisation">
            <Link to={`/organisations/${i.company.id}`} className="hover:text-accent-400">
              {i.company.name}
            </Link>
          </Field>
          <Field label="Asset">
            {i.asset.name}
            {i.asset.registration ? ` · ${i.asset.registration}` : ''}
          </Field>
          <Field label="Operator">{i.operator?.fullName ?? '—'}</Field>
          <Field label="Template version">v{i.templateVersion}</Field>
          <Field label="Started">{i.startedAt ? new Date(i.startedAt).toLocaleString() : '—'}</Field>
          <Field label="Submitted">{new Date(i.submittedAt).toLocaleString()}</Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Submitted answers</h2>
        </CardHeader>
        <CardBody>
          <pre className="max-h-[28rem] overflow-auto rounded-lg bg-(--surface-2) p-4 text-xs text-(--text-secondary)">
            {JSON.stringify(i.answers, null, 2)}
          </pre>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Template snapshot (as answered)</h2>
        </CardHeader>
        <CardBody>
          <pre className="max-h-[28rem] overflow-auto rounded-lg bg-(--surface-2) p-4 text-xs text-(--text-secondary)">
            {JSON.stringify(i.templateSnapshot, null, 2)}
          </pre>
        </CardBody>
      </Card>
    </div>
  );
}
