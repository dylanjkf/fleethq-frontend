import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, History, Link2, Truck } from 'lucide-react';
import { getAttachedUnitDetail } from '@/api/attached-units';
import { listTimeline } from '@/api/timeline';
import { Badge } from '@/components/ui/badge';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { ArchivedStatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { describeApiError } from '@/lib/errors';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

/** Renders a label/value row only when there's a value — an empty spec list stays quiet. */
function SpecRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between gap-4 border-b border-(--border-subtle) py-2 last:border-0">
      <dt className="text-sm text-(--text-tertiary)">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

/**
 * Attached-unit detail: the full record behind a row in the units list.
 *
 * Mirrors AssetDetailPage's structure deliberately — a trailer and a prime mover
 * are the same kind of thing to an operator, and two different layouts for the
 * same job would be a worse product than one familiar one. The genuinely new
 * content here is the **hitch history**, read back from the timed fleet-graph
 * pairings, which answers "what has this trailer been behind, and when".
 */
export function AttachedUnitDetailPage() {
  const { attachedUnitId } = useParams<{ attachedUnitId: string }>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['attached-unit', attachedUnitId, 'detail'],
    queryFn: () => getAttachedUnitDetail(attachedUnitId!),
    enabled: !!attachedUnitId,
  });
  const timelineQuery = useQuery({
    queryKey: ['timeline', 'ATTACHED_UNIT', attachedUnitId],
    queryFn: () => listTimeline('ATTACHED_UNIT', attachedUnitId!),
    enabled: !!attachedUnitId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isError || !data) {
    return <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />;
  }

  const customFields = Object.entries(data.customFields ?? {});
  const timelineEvents = timelineQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/fleet" className="flex items-center gap-1 text-sm text-(--text-tertiary) hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to fleet
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{data.name}</h1>
        <ArchivedStatusBadge archivedAt={data.archivedAt} />
        {data.currentAsset ? (
          <Badge variant="success">
            Hitched to{' '}
            <Link to={`/fleet/${data.currentAsset.id}`} className="underline">
              {data.currentAsset.name}
            </Link>
          </Badge>
        ) : (
          <Badge variant="neutral">Not hitched</Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Identity + specs */}
        <Panel>
          <PanelHeader>
            <PanelTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4" /> Details
            </PanelTitle>
            <PanelDescription>Identity and specifications for this unit.</PanelDescription>
          </PanelHeader>
          <dl className="px-4 pb-4">
            <SpecRow label="Reference" value={data.externalReference} />
            <SpecRow label="Registration" value={data.registration} />
            <SpecRow label="VIN" value={data.vin} />
            <SpecRow label="Make" value={data.make} />
            <SpecRow label="Model" value={data.model} />
            <SpecRow label="Year" value={data.year} />
            {customFields.map(([key, value]) => (
              <SpecRow key={key} label={key} value={String(value)} />
            ))}
            {data.notes && (
              <div className="pt-3">
                <dt className="mb-1 text-sm text-(--text-tertiary)">Notes</dt>
                <dd className="whitespace-pre-wrap text-sm">{data.notes}</dd>
              </div>
            )}
            {!data.externalReference &&
              !data.registration &&
              !data.vin &&
              !data.make &&
              !data.model &&
              !data.year &&
              !data.notes &&
              customFields.length === 0 && (
                <p className="py-2 text-sm text-(--text-tertiary)">
                  No specifications recorded yet. Edit this unit to add its registration, VIN, make and year.
                </p>
              )}
          </dl>
        </Panel>

        {/* Hitch history — the reason this page exists */}
        <Panel>
          <PanelHeader>
            <PanelTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Hitch history
            </PanelTitle>
            <PanelDescription>Every asset this unit has been attached to, most recent first.</PanelDescription>
          </PanelHeader>
          <div className="px-4 pb-4">
            {data.hitchHistory.length === 0 ? (
              <EmptyState
                icon={Link2}
                title="Never hitched"
                description="Hitch this unit to an asset and the pairing will be recorded here."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Hitched</TableHead>
                    <TableHead>Unhitched</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.hitchHistory.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">
                        <Link to={`/fleet/${h.assetId}`} className="hover:underline">
                          {h.assetName}
                        </Link>
                        {h.isCurrent && (
                          <Badge variant="success" className="ml-2">
                            Current
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{formatDateTime(h.hitchedAt)}</TableCell>
                      <TableCell className="text-xs">{h.isCurrent ? '—' : formatDateTime(h.unhitchedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Panel>
      </div>

      {/* Timeline — every entity has one (Core_Principles.md) */}
      <Panel>
        <PanelHeader>
          <PanelTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Timeline
          </PanelTitle>
          <PanelDescription>Immutable history for this unit.</PanelDescription>
        </PanelHeader>
        <div className="px-4 pb-4">
          {timelineEvents.length === 0 ? (
            <p className="py-2 text-sm text-(--text-tertiary)">No events recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {timelineEvents.map((e) => (
                <li key={e.id} className="flex justify-between gap-4 border-b border-(--border-subtle) py-2 last:border-0">
                  <span className="text-sm">{e.summary}</span>
                  <span className="shrink-0 text-xs text-(--text-tertiary)">{formatDateTime(e.occurredAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>
    </div>
  );
}
