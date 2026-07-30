import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Gauge, History, Wrench } from 'lucide-react';
import { getAssetDetail, updateAsset } from '@/api/assets';
import { listTimeline } from '@/api/timeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { ArchivedStatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetFormDialog, type AssetFormValues } from '@/features/assets/AssetFormDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';
function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-(--text-tertiary)">{label}</dt>
      <dd className="text-sm text-(--text-primary)">{value || '—'}</dd>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Wrench; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-4 elevation-1">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent-500" />
        <h3 className="text-sm font-medium text-(--text-primary)">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/**
 * The asset detail page — the app's first parameterized route. Opening an asset
 * surfaces its specs plus the tracked activity that already lives in related
 * tables (maintenance, compliance, checklists, and the full timeline), and lets
 * you edit its specs/odometer in place.
 */
export function AssetDetailPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const detailKey = ['asset-detail', assetId];
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: detailKey, queryFn: () => getAssetDetail(assetId!), enabled: !!assetId });
  const timelineQuery = useQuery({ queryKey: ['timeline', 'ASSET', assetId], queryFn: () => listTimeline('ASSET', assetId!), enabled: !!assetId });

  const updateM = useMutation({
    mutationFn: (input: AssetFormValues) => updateAsset(assetId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailKey });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['timeline', 'ASSET', assetId] });
      toast({ title: 'Asset updated', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not update', description: describeApiError(e), variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <Panel>
        <Skeleton className="mb-4 h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
      </Panel>
    );
  }
  if (isError || !data) {
    return (
      <Panel>
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      </Panel>
    );
  }

  const { asset, maintenance, compliance, checklists, summary } = data;
  const customEntries = asset.customFields ? Object.entries(asset.customFields) : [];

  return (
    <Panel>
      <PanelHeader>
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
            <Link to="/fleet"><ArrowLeft className="h-4 w-4" /> Fleet</Link>
          </Button>
          <PanelTitle>
            <span className="inline-flex items-center gap-2">
              {asset.name}
              <Badge variant="neutral">{asset.assetClass.name}</Badge>
              <ArchivedStatusBadge archivedAt={asset.archivedAt} />
            </span>
          </PanelTitle>
          <PanelDescription>
            {[asset.make, asset.model, asset.year].filter(Boolean).join(' ') || 'Asset detail — specs, service, compliance, and history.'}
          </PanelDescription>
        </div>
        {can(PERMISSIONS.ASSETS_EDIT) && !asset.archivedAt && <Button onClick={() => setEditing(true)}>Edit</Button>}
      </PanelHeader>

      {/* At-a-glance */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-3">
          <div className="flex items-center gap-1.5 text-xs text-(--text-tertiary)"><Gauge className="h-3.5 w-3.5" /> Odometer</div>
          <div className="text-lg font-semibold text-(--text-primary)" data-tabular>{asset.odometer != null ? `${asset.odometer.toLocaleString()} ${asset.odometerUnit ?? ''}`.trim() : '—'}</div>
        </div>
        <div className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-3">
          <div className="text-xs text-(--text-tertiary)">Open maintenance</div>
          <div className="text-lg font-semibold text-(--text-primary)" data-tabular>{summary.openMaintenanceCount}</div>
        </div>
        <div className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-3">
          <div className="text-xs text-(--text-tertiary)">Compliance docs</div>
          <div className="text-lg font-semibold text-(--text-primary)" data-tabular>{summary.complianceCount}</div>
        </div>
        <div className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-3">
          <div className="text-xs text-(--text-tertiary)">Checklists logged</div>
          <div className="text-lg font-semibold text-(--text-primary)" data-tabular>{summary.checklistCount}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Specifications" icon={Gauge}>
          <dl className="grid grid-cols-2 gap-3">
            <Spec label="Make" value={asset.make} />
            <Spec label="Model" value={asset.model} />
            <Spec label="Year" value={asset.year} />
            <Spec label="Registration" value={asset.registration} />
            <Spec label="VIN" value={asset.vin} />
            <Spec label="Reference" value={asset.externalReference} />
            {customEntries.map(([k, v]) => (
              <Spec key={k} label={k} value={v == null ? '' : String(v)} />
            ))}
          </dl>
        </Section>

        <Section title="Maintenance" icon={Wrench}>
          {maintenance.length === 0 ? (
            <p className="text-sm text-(--text-tertiary)">No maintenance jobs logged.</p>
          ) : (
            <ul className="space-y-2">
              {maintenance.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <div className="text-(--text-primary)">{m.title}</div>
                    <div className="text-xs text-(--text-tertiary)" data-tabular>{new Date(m.createdAt).toLocaleDateString()}</div>
                  </div>
                  <Badge variant={m.status === 'COMPLETE' ? 'success' : 'warning'}>{m.status.replace(/_/g, ' ').toLowerCase()}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Compliance" icon={Gauge}>
          {compliance.length === 0 ? (
            <p className="text-sm text-(--text-tertiary)">No compliance documents.</p>
          ) : (
            <ul className="space-y-2">
              {compliance.map((c) => {
                const days = daysUntil(c.expiresAt);
                const variant = days < 0 ? 'danger' : days <= 30 ? 'warning' : 'success';
                return (
                  <li key={c.id} className="flex items-start justify-between gap-2 text-sm">
                    <div>
                      <div className="text-(--text-primary)">{c.documentType.replace(/_/g, ' ').toLowerCase()}</div>
                      {c.documentNumber && <div className="text-xs text-(--text-tertiary)">{c.documentNumber}</div>}
                    </div>
                    <Badge variant={variant}>{days < 0 ? 'expired' : `${days}d`}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Recent checklists" icon={History}>
          {checklists.length === 0 ? (
            <p className="text-sm text-(--text-tertiary)">No checklist submissions.</p>
          ) : (
            <ul className="space-y-2">
              {checklists.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <div className="text-(--text-primary)">{c.template.name}</div>
                    <div className="text-xs text-(--text-tertiary)" data-tabular>{new Date(c.createdAt).toLocaleDateString()}</div>
                  </div>
                  <Badge variant={c.hasFailures ? 'danger' : 'success'}>{c.hasFailures ? 'failures' : 'passed'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-4">
        <Section title="History" icon={History}>
          {timelineQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !timelineQuery.data || timelineQuery.data.items.length === 0 ? (
            <EmptyState icon={History} title="No history yet" description="Events appear here as this asset changes." />
          ) : (
            <div className="space-y-3">
              {timelineQuery.data.items.map((event) => (
                <div key={event.id} className="border-l-2 border-(--border-subtle) pl-3">
                  <p className="text-sm">{event.summary}</p>
                  <p className="text-xs text-(--text-tertiary)">
                    {new Date(event.occurredAt).toLocaleString()}
                    {event.actorUser ? ` · ${event.actorUser.fullName}` : event.actorType === 'SYSTEM' ? ' · System' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <AssetFormDialog
        open={editing}
        onOpenChange={setEditing}
        asset={asset}
        onSubmit={async (v) => { await updateM.mutateAsync(v); }}
        isSubmitting={updateM.isPending}
      />
    </Panel>
  );
}
