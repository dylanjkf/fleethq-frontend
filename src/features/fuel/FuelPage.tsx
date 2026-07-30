import { useQuery } from '@tanstack/react-query';
import { Fuel } from 'lucide-react';
import { getFuelSummary, listFuelEntries } from '@/api/fuel';
import { AttachmentImage } from '@/components/ui/attachment-image';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

/** NUMERIC comes back as a string; format at the display edge, never in the API layer. */
function money(value: string | null): string {
  if (value === null) return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '—';
}
function litres(value: string | null): string {
  if (value === null) return '—';
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(2)} L` : '—';
}

/**
 * What the drivers put in the trucks — the office side of DriverOS fuel capture.
 *
 * Shows the four things a driver records (odometer, receipt photo, card last-4,
 * licence plate) plus litres/cost, so a fuel-card statement can be reconciled
 * line by line against the fleet. The card column is deliberately last-4 only;
 * that's all FleetOS ever stores.
 */
export function FuelPage() {
  const { can } = usePermissions();
  const canView = can(PERMISSIONS.FUEL_VIEW);

  const entries = useQuery({ queryKey: ['fuel', 'entries'], queryFn: () => listFuelEntries({ pageSize: 100 }), enabled: canView });
  const summary = useQuery({ queryKey: ['fuel', 'summary'], queryFn: getFuelSummary, enabled: canView });

  if (!canView) {
    return <EmptyState icon={Fuel} title="No access" description="You need the fuel:view permission to see fuel purchases." />;
  }

  const items = entries.data?.items ?? [];

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader>
        <div>
          <PanelTitle>
            <span className="inline-flex items-center gap-2">
              <Fuel className="h-5 w-5 text-accent-500" /> Fuel
            </span>
          </PanelTitle>
          <PanelDescription>
            Every fuel-card purchase your drivers record in DriverOS — odometer, receipt photo, the last 4 digits of the
            card, and the plate on the receipt, so a card statement reconciles against the fleet.
          </PanelDescription>
        </div>
        {summary.data && (
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-2xl font-semibold" data-tabular>{summary.data.entryCount}</p>
              <p className="text-xs text-(--text-tertiary)">purchases</p>
            </div>
            <div>
              <p className="text-2xl font-semibold" data-tabular>{money(summary.data.totalCost)}</p>
              <p className="text-xs text-(--text-tertiary)">total spend</p>
            </div>
            <div>
              <p className="text-2xl font-semibold" data-tabular>{litres(summary.data.totalLitres)}</p>
              <p className="text-xs text-(--text-tertiary)">total fuel</p>
            </div>
          </div>
        )}
      </PanelHeader>

      {entries.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : entries.isError ? (
        <ErrorState message={describeApiError(entries.error)} onRetry={() => entries.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Fuel}
          title="No fuel purchases yet"
          description="Drivers record a fill-up in DriverOS (Today → Record fuel). Entries appear here as they sync — including ones captured with no signal."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filled</TableHead>
              <TableHead>Vehicle / plate</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead className="text-right">Odometer</TableHead>
              <TableHead className="text-right">Litres</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Card</TableHead>
              <TableHead>Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs" data-tabular>{new Date(e.filledAt).toLocaleString()}</TableCell>
                <TableCell>
                  <span className="font-medium">{e.asset?.name ?? 'Unmatched'}</span>
                  <p className="text-xs text-(--text-tertiary)">{e.licencePlate}</p>
                </TableCell>
                <TableCell className="text-xs">{e.operator?.fullName ?? '—'}</TableCell>
                <TableCell className="text-right" data-tabular>{e.odometerReading.toLocaleString()}</TableCell>
                <TableCell className="text-right" data-tabular>{litres(e.litres)}</TableCell>
                <TableCell className="text-right" data-tabular>{money(e.totalCost)}</TableCell>
                <TableCell>
                  {/* Last 4 only — presented as masked so it reads as a card reference,
                      not as though FleetOS holds the number. */}
                  <Badge variant="neutral">•••• {e.cardLast4}</Badge>
                </TableCell>
                <TableCell>
                  {e.receiptAttachment ? (
                    <AttachmentImage id={e.receiptAttachment.id} alt="Fuel receipt" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <span className="text-xs text-(--text-tertiary)">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
