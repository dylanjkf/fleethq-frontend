import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Download, PackageCheck, ShieldCheck, TrendingUp, Wrench } from 'lucide-react';
import { getImpactReport, type ImpactReport } from '@/api/reports';
import { ApiClientError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTH_OPTIONS = [
  { value: '3', label: 'Last 3 months' },
  { value: '6', label: 'Last 6 months' },
  { value: '12', label: 'Last 12 months' },
];

/**
 * Impact — "how beneficial has FleetOS been for the company." A month-by-month
 * value story from GET /v1/reports/impact: deliveries proven, service quality
 * (on-time), safety compliance (pre-start checks digitised), and workshop cost
 * tracked. Charts are hand-rolled SVG (this app ships no charting library) and
 * theme-aware via the design tokens.
 */
export function ImpactPage() {
  const [months, setMonths] = useState('6');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports', 'impact', months],
    queryFn: () => getImpactReport({ months: Number(months) }),
  });

  const hasActivity = !!data && data.series.some((m) => m.delivered + m.failed + m.checklists > 0 || m.maintenanceCost > 0);

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>
            <span className="inline-flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent-500" /> Impact
            </span>
          </PanelTitle>
          <PanelDescription>
            The value FleetOS has delivered for your business — deliveries proven, on-time service, safety compliance, and
            maintenance under control.
          </PanelDescription>
        </div>
        <div className="flex items-end gap-2">
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {data && <Button variant="secondary" onClick={() => exportCsv(data)}><Download className="h-4 w-4" /> Export</Button>}
        </div>
      </PanelHeader>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          <Skeleton className="h-56 w-full" />
        </div>
      ) : isError ? (
        <ErrorState message={error instanceof ApiClientError ? error.message : 'Could not load the impact report.'} onRetry={() => refetch()} />
      ) : !data || !hasActivity ? (
        <EmptyState
          icon={TrendingUp}
          title="Not enough activity yet"
          description="Once deliveries, checklists and maintenance start flowing through FleetOS, this page charts the value it's delivering."
        />
      ) : (
        <div className="space-y-8">
          {data.firstActivityAt && (
            <p className="text-sm text-(--text-tertiary)">
              Running on FleetOS since{' '}
              <span className="font-medium text-(--text-secondary)">
                {new Date(data.firstActivityAt).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
              </span>
              . Here's what it's done over the {data.range.months === 1 ? 'month' : `last ${data.range.months} months`}.
            </p>
          )}

          {/* Headline value */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Headline icon={PackageCheck} label="Deliveries proven" value={data.headline.deliveriesProven.toLocaleString()} sub="with a digital proof-of-completion record" tone="accent" />
            <Headline icon={Clock} label="On-time rate" value={pct(data.headline.onTimeRatePct)} sub="of deliveries with a promised window" tone={rateTone(data.headline.onTimeRatePct)} />
            <Headline icon={ShieldCheck} label="Pre-start checks" value={data.headline.checklistsCompleted.toLocaleString()} sub={`${pct(data.headline.checklistPassRatePct)} passed clean`} tone="accent" />
            <Headline icon={CheckCircle2} label="Delivery success" value={pct(data.headline.deliveryRatePct)} sub={`${data.headline.failedDeliveries} failed & followed up`} tone={rateTone(data.headline.deliveryRatePct)} />
            <Headline icon={Wrench} label="Faults tracked to closure" value={data.headline.faultsTrackedToClosure.toLocaleString()} sub="repairs logged, costed & resolved" tone="accent" />
            <Headline icon={Wrench} label="Maintenance cost tracked" value={currency(data.headline.maintenanceCostTracked)} sub="visible spend, no lost paperwork" tone="accent" />
            <Headline icon={PackageCheck} label="Fleet under management" value={`${data.headline.activeAssets}`} sub={`${data.headline.activeOperators} operators coordinated`} tone="accent" />
          </div>

          {/* Deliveries throughput */}
          <ChartBlock title="Deliveries handled each month" hint="Delivered vs failed — every parcel with a recorded, provable outcome.">
            <StackedBars
              series={data.series.map((m) => ({ label: m.label, segments: [
                { value: m.delivered, className: 'fill-accent-500' },
                { value: m.failed, className: 'fill-danger-500' },
              ] }))}
              formatTotal={(n) => n.toLocaleString()}
            />
            <Legend items={[{ label: 'Delivered', className: 'bg-accent-500' }, { label: 'Failed', className: 'bg-danger-500' }]} />
          </ChartBlock>

          {/* Service quality trend */}
          <ChartBlock title="Service quality trend" hint="On-time and delivery-success rates over time — the numbers you show a customer.">
            <TrendLines
              months={data.series.map((m) => m.label)}
              lines={[
                { name: 'On-time %', className: 'stroke-success-500', dot: 'fill-success-500', values: data.series.map((m) => m.onTimeRatePct) },
                { name: 'Delivery success %', className: 'stroke-accent-500', dot: 'fill-accent-500', values: data.series.map((m) => m.deliveryRatePct) },
              ]}
            />
          </ChartBlock>

          {/* Compliance */}
          <ChartBlock title="Pre-start safety checks completed" hint="Digital pre-start inspections replacing paper — a compliance record for every shift.">
            <StackedBars
              series={data.series.map((m) => ({ label: m.label, segments: [{ value: m.checklists, className: 'fill-accent-500' }] }))}
              formatTotal={(n) => n.toLocaleString()}
            />
          </ChartBlock>

          {/* Maintenance cost */}
          <ChartBlock title="Maintenance spend, tracked" hint="Every repair costed against its asset — spend you can see and control.">
            <StackedBars
              series={data.series.map((m) => ({ label: m.label, segments: [{ value: m.maintenanceCost, className: 'fill-accent-500' }] }))}
              formatTotal={(n) => currency(n)}
            />
          </ChartBlock>
        </div>
      )}
    </Panel>
  );
}

// ---- headline cards ---------------------------------------------------------

function Headline({ icon: Icon, label, value, sub, tone }: { icon: typeof PackageCheck; label: string; value: string; sub: string; tone: 'accent' | 'ok' | 'warn' | 'bad' }) {
  const valueClass = tone === 'bad' ? 'text-danger-500' : tone === 'warn' ? 'text-warning-500' : tone === 'ok' ? 'text-success-500' : 'text-(--text-primary)';
  return (
    <div className="rounded-(--radius-panel) border border-(--border-subtle) bg-(--surface-1) p-4">
      <div className="flex items-center gap-2 text-(--text-tertiary)">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</div>
      <div className="mt-0.5 text-xs text-(--text-tertiary)">{sub}</div>
    </div>
  );
}

// ---- chart scaffolding ------------------------------------------------------

function ChartBlock({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-(--text-secondary)">{title}</p>
      <p className="mb-3 text-xs text-(--text-tertiary)">{hint}</p>
      <div className="rounded-(--radius-panel) border border-(--border-subtle) bg-(--surface-1) p-4">{children}</div>
    </div>
  );
}

function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-4">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-xs text-(--text-tertiary)">
          <span className={`h-2.5 w-2.5 rounded-sm ${i.className}`} /> {i.label}
        </span>
      ))}
    </div>
  );
}

/** Vertical stacked-bar chart — one bar per month, segments stacked bottom-up. */
function StackedBars({ series, formatTotal }: { series: { label: string; segments: { value: number; className: string }[] }[]; formatTotal: (n: number) => string }) {
  const totals = series.map((s) => s.segments.reduce((sum, seg) => sum + seg.value, 0));
  const max = Math.max(...totals, 1);
  return (
    <div className="flex h-44 items-end gap-2">
      {series.map((s, i) => {
        const total = totals[i];
        return (
          <div key={s.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums text-(--text-tertiary) opacity-0 transition-opacity group-hover:opacity-100">
              {total > 0 ? formatTotal(total) : ''}
            </span>
            <div className="flex w-full max-w-10 flex-col justify-end" style={{ height: `${Math.round((total / max) * 100)}%`, minHeight: total > 0 ? 4 : 0 }}>
              {s.segments.map((seg, j) => (
                <div
                  key={j}
                  className={`w-full ${seg.className} ${j === 0 ? 'rounded-t' : ''}`}
                  style={{ height: total > 0 ? `${(seg.value / total) * 100}%` : 0 }}
                  title={`${s.label}: ${formatTotal(seg.value)}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-(--text-tertiary)">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Multi-line percentage trend (0–100). Nulls (no assessable data) break the line. */
function TrendLines({ months, lines }: { months: string[]; lines: { name: string; className: string; dot: string; values: (number | null)[] }[] }) {
  const W = 100;
  const H = 40;
  const n = months.length;
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - (v / 100) * H;

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-40 w-full overflow-visible">
          {/* gridlines at 0/50/100% */}
          {[0, 50, 100].map((g) => (
            <line key={g} x1={0} x2={W} y1={y(g)} y2={y(g)} className="stroke-(--border-subtle)" strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
          ))}
          {lines.map((line) => {
            // Build polyline segments across consecutive non-null points.
            const segs: string[] = [];
            let cur: string[] = [];
            line.values.forEach((v, i) => {
              if (v === null) { if (cur.length) { segs.push(cur.join(' ')); cur = []; } return; }
              cur.push(`${x(i)},${y(v)}`);
            });
            if (cur.length) segs.push(cur.join(' '));
            return segs.map((pts, si) => (
              <polyline key={`${line.name}-${si}`} points={pts} fill="none" className={line.className} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            ));
          })}
          {lines.flatMap((line) => line.values.map((v, i) => v === null ? null : (
            <circle key={`${line.name}-dot-${i}`} cx={x(i)} cy={y(v)} r={1.6} className={line.dot} vectorEffect="non-scaling-stroke" />
          )))}
        </svg>
        <div className="pointer-events-none absolute inset-y-0 -left-1 flex flex-col justify-between py-[2px] text-[9px] text-(--text-tertiary)">
          <span>100%</span><span>50%</span><span>0%</span>
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-(--text-tertiary)">
        {months.map((m) => <span key={m}>{m}</span>)}
      </div>
      <Legend items={lines.map((l) => ({ label: l.name, className: l.dot.replace('fill-', 'bg-') }))} />
    </div>
  );
}

// ---- formatting -------------------------------------------------------------

function pct(v: number | null): string {
  return v === null ? '—' : `${v}%`;
}
function currency(n: number): string {
  return `$${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function rateTone(pctValue: number | null): 'accent' | 'ok' | 'warn' | 'bad' {
  if (pctValue === null) return 'accent';
  if (pctValue >= 95) return 'ok';
  if (pctValue >= 80) return 'warn';
  return 'bad';
}

function exportCsv(data: ImpactReport) {
  const lines = [
    ['FleetOS impact report'],
    ['Period', data.range.from.slice(0, 10), 'to', data.range.to.slice(0, 10)],
    ['Running since', data.firstActivityAt ? data.firstActivityAt.slice(0, 10) : ''],
    [],
    ['Deliveries proven', String(data.headline.deliveriesProven)],
    ['Delivery success %', data.headline.deliveryRatePct === null ? '' : String(data.headline.deliveryRatePct)],
    ['On-time %', data.headline.onTimeRatePct === null ? '' : String(data.headline.onTimeRatePct)],
    ['Pre-start checks completed', String(data.headline.checklistsCompleted)],
    ['Checklist clean-pass %', data.headline.checklistPassRatePct === null ? '' : String(data.headline.checklistPassRatePct)],
    ['Faults tracked to closure', String(data.headline.faultsTrackedToClosure)],
    ['Maintenance cost tracked', String(data.headline.maintenanceCostTracked)],
    ['Active assets', String(data.headline.activeAssets)],
    ['Active operators', String(data.headline.activeOperators)],
    [],
    ['Month', 'Delivered', 'Failed', 'Delivery %', 'On-time %', 'Pre-start checks', 'Maintenance cost'],
    ...data.series.map((m) => [
      m.month,
      String(m.delivered),
      String(m.failed),
      m.deliveryRatePct === null ? '' : String(m.deliveryRatePct),
      m.onTimeRatePct === null ? '' : String(m.onTimeRatePct),
      String(m.checklists),
      String(m.maintenanceCost),
    ]),
  ];
  const csv = lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fleetos-impact-${data.range.from.slice(0, 10)}-to-${data.range.to.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
