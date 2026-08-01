import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download } from 'lucide-react';
import { getOperationsReport, type OperationsReport } from '@/api/reports';
import { getShiftSummary } from '@/api/shifts';
import { ApiClientError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

/**
 * Operational reporting (05-Dispatch v1 "basic reporting"): the fleet manager's
 * daily view — deliveries, checklist activity, open workshop jobs, per-operator —
 * over a date range, with a CSV export. Pure read-model from GET /v1/reports.
 */
export function ReportsPage() {
  const { can } = usePermissions();
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(isoDate(new Date()));
  const [shiftDate, setShiftDate] = useState(isoDate(new Date()));

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports', 'operations', from, to],
    queryFn: () => getOperationsReport({ from, to }),
  });

  const shiftSummaryQuery = useQuery({
    queryKey: ['shifts', 'summary', shiftDate],
    queryFn: () => getShiftSummary({ date: shiftDate }),
    enabled: can(PERMISSIONS.SHIFTS_VIEW),
  });

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Reports</PanelTitle>
          <PanelDescription>How the fleet performed over the period — deliveries, checklists, and workshop load.</PanelDescription>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-xs text-(--text-tertiary)">
            From
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-md border border-(--border-subtle) bg-(--surface-1) px-2 py-1 text-sm" />
          </label>
          <label className="text-xs text-(--text-tertiary)">
            To
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-md border border-(--border-subtle) bg-(--surface-1) px-2 py-1 text-sm" />
          </label>
          {data && <Button variant="secondary" onClick={() => exportCsv(data)}><Download className="h-4 w-4" /> Export</Button>}
        </div>
      </PanelHeader>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : isError ? (
        <ErrorState message={error instanceof ApiClientError ? error.message : 'Could not load the report.'} onRetry={() => refetch()} />
      ) : data ? (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            <Stat label="Delivery rate" value={data.deliveries.deliveryRatePct === null ? '—' : `${data.deliveries.deliveryRatePct}%`} tone={rateTone(data.deliveries.deliveryRatePct)} />
            <Stat label="Delivered" value={data.deliveries.delivered} tone="ok" />
            <Stat label="Failed" value={data.deliveries.failed} tone={data.deliveries.failed > 0 ? 'bad' : 'ok'} />
            <Stat
              label="On-time rate"
              value={data.deliveries.onTime.onTimeRatePct === null ? '—' : `${data.deliveries.onTime.onTimeRatePct}%`}
              tone={rateTone(data.deliveries.onTime.onTimeRatePct)}
            />
            <Stat label="Checklists done" value={data.checklists.completed} />
            <Stat label="Open workshop jobs" value={data.workshop.openJobs} tone={data.workshop.openJobs > 0 ? 'warn' : 'ok'} />
            <Stat label="Fleet uptime" value={data.uptime.fleetUptimePct === null ? '—' : `${data.uptime.fleetUptimePct}%`} tone={rateTone(data.uptime.fleetUptimePct)} />
            <Stat label="Maintenance cost" value={formatCurrency(data.cost.totalCost)} />
          </div>

          {data.cost.trend.some((t) => t.cost > 0) && (
            <div className="mb-5">
              <p className="mb-2 text-sm font-medium text-(--text-secondary)">
                Maintenance cost trend {data.cost.jobsWithCost > 0 && <span className="text-(--text-tertiary)">· avg {formatCurrency(data.cost.averageCostPerJob ?? 0)}/job</span>}
              </p>
              <CostTrendChart trend={data.cost.trend} />
            </div>
          )}

          {data.uptime.assetsWithDowntime.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-sm font-medium text-(--text-secondary)">Assets with downtime this period</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Downtime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.uptime.assetsWithDowntime.map((a) => (
                    <TableRow key={a.assetId}>
                      <TableCell className="font-medium">{a.assetName}</TableCell>
                      <TableCell className={rateTone(a.uptimePct) === 'bad' ? 'text-danger-500' : rateTone(a.uptimePct) === 'warn' ? 'text-warning-500' : ''}>
                        {a.uptimePct}%
                      </TableCell>
                      <TableCell className="text-(--text-tertiary)">{a.downtimeHours}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {data.failureReasons.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-sm font-medium text-(--text-secondary)">Failure reasons</p>
              <div className="flex flex-wrap gap-2">
                {data.failureReasons.map((r) => (
                  <span key={r.reason} className="rounded-full border border-(--border-subtle) bg-(--surface-1) px-3 py-1 text-xs text-(--text-secondary)">
                    {formatReason(r.reason)} · {r.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.byOperator.length === 0 ? (
            <EmptyState icon={BarChart3} title="No activity in this period" description="Pick a wider date range, or check back once deliveries and checklists are recorded." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Checklists</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byOperator.map((row) => (
                  <TableRow key={row.operatorId ?? 'unassigned'}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="tabular-nums">{row.delivered}</TableCell>
                    <TableCell className="tabular-nums">{row.failed}</TableCell>
                    <TableCell className="tabular-nums">{row.checklists}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      ) : null}

      {can(PERMISSIONS.SHIFTS_VIEW) && (
        <div className="mt-8 border-t border-(--border-subtle) pt-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Shift day summary</h2>
              <p className="text-sm text-(--text-tertiary)">Who was on shift, and for how long.</p>
            </div>
            <label className="text-xs text-(--text-tertiary)">
              Date
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="mt-1 block rounded-md border border-(--border-subtle) bg-(--surface-1) px-2 py-1 text-sm"
              />
            </label>
          </div>

          {shiftSummaryQuery.isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : shiftSummaryQuery.isError ? (
            <ErrorState
              message={shiftSummaryQuery.error instanceof ApiClientError ? shiftSummaryQuery.error.message : 'Could not load the shift summary.'}
              onRetry={() => shiftSummaryQuery.refetch()}
            />
          ) : !shiftSummaryQuery.data || shiftSummaryQuery.data.operators.length === 0 ? (
            <EmptyState icon={BarChart3} title="No shifts that day" description="No operator started a shift on this date." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Shifts</TableHead>
                  <TableHead>Total time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftSummaryQuery.data.operators.map((row) => (
                  <TableRow key={row.operatorId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-(--text-tertiary)">
                      {row.shifts
                        .map(
                          (s) =>
                            `${new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${
                              s.status === 'ACTIVE' ? 'ongoing' : new Date(s.endedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }`,
                        )
                        .join(', ')}
                    </TableCell>
                    <TableCell className="tabular-nums">{formatMinutes(row.totalMinutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </Panel>
  );
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'ok' | 'warn' | 'bad' }) {
  const toneClass = tone === 'bad' ? 'text-danger-500' : tone === 'warn' ? 'text-warning-500' : tone === 'ok' ? 'text-success-500' : 'text-(--text-primary)';
  return (
    <div className="min-w-[130px] flex-1 rounded-lg border border-(--border-subtle) bg-(--surface-1) px-4 py-3">
      <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      <div className="mt-0.5 text-xs text-(--text-tertiary)">{label}</div>
    </div>
  );
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatReason(reason: string): string {
  return reason
    .toLowerCase()
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function rateTone(pct: number | null): 'neutral' | 'ok' | 'warn' | 'bad' {
  if (pct === null) return 'neutral';
  if (pct >= 95) return 'ok';
  if (pct >= 80) return 'warn';
  return 'bad';
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** A dependency-free per-day bar chart — this app has no charting library, and a handful of proportional bars is enough to show a cost trend. */
function CostTrendChart({ trend }: { trend: { date: string; cost: number }[] }) {
  const max = Math.max(...trend.map((t) => t.cost), 1);
  return (
    <div className="flex h-24 items-end gap-1 rounded-lg border border-(--border-subtle) bg-(--surface-1) p-3">
      {trend.map((t) => (
        <div key={t.date} className="group relative flex-1" title={`${t.date}: ${formatCurrency(t.cost)}`}>
          <div
            className="mx-auto w-full rounded-t bg-accent-500/70 transition-colors group-hover:bg-accent-500"
            style={{ height: `${Math.max(2, Math.round((t.cost / max) * 64))}px` }}
          />
        </div>
      ))}
    </div>
  );
}

function exportCsv(data: OperationsReport) {
  const lines = [
    ['FleetHQ operations report'],
    ['Period', data.range.from.slice(0, 10), 'to', data.range.to.slice(0, 10)],
    [],
    ['Deliveries total', String(data.deliveries.total)],
    ['Delivered', String(data.deliveries.delivered)],
    ['Failed', String(data.deliveries.failed)],
    ['Delivery rate %', data.deliveries.deliveryRatePct === null ? '' : String(data.deliveries.deliveryRatePct)],
    ['On-time rate %', data.deliveries.onTime.onTimeRatePct === null ? '' : String(data.deliveries.onTime.onTimeRatePct)],
    ['Checklists completed', String(data.checklists.completed)],
    ['Checklists with failures', String(data.checklists.withFailures)],
    ['Open workshop jobs', String(data.workshop.openJobs)],
    ['Fleet uptime %', data.uptime.fleetUptimePct === null ? '' : String(data.uptime.fleetUptimePct)],
    ['Total maintenance cost', String(data.cost.totalCost)],
    ['Average cost per job', data.cost.averageCostPerJob === null ? '' : String(data.cost.averageCostPerJob)],
    [],
    ['Failure reason', 'Count'],
    ...data.failureReasons.map((r) => [formatReason(r.reason), String(r.count)]),
    [],
    ['Operator', 'Delivered', 'Failed', 'Checklists'],
    ...data.byOperator.map((r) => [r.name, String(r.delivered), String(r.failed), String(r.checklists)]),
    [],
    ['Maintenance cost by day'],
    ...data.cost.trend.map((t) => [t.date, String(t.cost)]),
    [],
    ['Asset', 'Uptime %', 'Downtime hours'],
    ...data.uptime.assetsWithDowntime.map((a) => [a.assetName, String(a.uptimePct), String(a.downtimeHours)]),
  ];
  const csv = lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fleetos-operations-${data.range.from.slice(0, 10)}-to-${data.range.to.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
