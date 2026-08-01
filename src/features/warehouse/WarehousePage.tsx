import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Cog, Plus, Search, Sparkles, Upload } from 'lucide-react';
import {
  addMachineLog,
  archiveMachine,
  archiveStock,
  adjustStock,
  createMachine,
  createStock,
  importStock,
  listMachineLogs,
  listMachines,
  listStock,
  listStockAdjustments,
  updateMachine,
  updateStock,
  type MachineInput,
  type StockInput,
  type StockItem,
  type WarehouseMachine,
} from '@/api/warehouse';
import { getEntitlements } from '@/api/billing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { StockFormDialog } from '@/features/warehouse/StockFormDialog';
import { ImportStockDialog } from '@/features/warehouse/ImportStockDialog';
import { MachineFormDialog } from '@/features/warehouse/MachineFormDialog';
import { MachineScheduleSection } from '@/features/warehouse/MachineScheduleSection';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const STOCK_KEY = ['warehouse', 'stock'];
const MACHINE_KEY = ['warehouse', 'machines'];

const MACHINE_STATUS_META = {
  OPERATIONAL: { label: 'Operational', variant: 'success' as const },
  NEEDS_ATTENTION: { label: 'Needs attention', variant: 'warning' as const },
  DOWN: { label: 'Down', variant: 'danger' as const },
};

/**
 * The Warehouse add-on: customer stock inventory + warehouse machines with
 * maintenance/monitoring. The paid add-on is *promoted* (a subtle banner when
 * the plan doesn't include it) but never blocks data entry — every control
 * works from day one, per the brief.
 */
export function WarehousePage() {
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.WAREHOUSE_MANAGE);

  const entitlementsQuery = useQuery({ queryKey: ['billing', 'entitlements'], queryFn: getEntitlements });
  const includedInPlan =
    !entitlementsQuery.data?.enforced || (entitlementsQuery.data?.features ?? []).includes('warehouse');

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>
            <span className="inline-flex items-center gap-2">
              <Boxes className="h-5 w-5 text-accent-500" /> Warehouse
            </span>
          </PanelTitle>
          <PanelDescription>
            Your stock inventory and floor machines in one place — fully customizable, with maintenance and monitoring.
          </PanelDescription>
        </div>
      </PanelHeader>

      {/* Paid add-on promotion — never blocks anything below it. */}
      {!includedInPlan && (
        <div className="flex items-center gap-3 rounded-(--radius-panel) border border-accent-500/30 bg-gradient-to-br from-accent-500/10 to-transparent p-4">
          <Sparkles className="h-5 w-5 shrink-0 text-accent-500" />
          <div className="text-sm">
            <p className="font-medium text-(--text-primary)">Warehouse is a paid add-on</p>
            <p className="text-(--text-tertiary)">
              You can add and import all your stock and machines right now — enabling the add-on on your plan unlocks it
              across your account. Manage this from Billing.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">
            <Boxes className="mr-1.5 h-4 w-4" /> Stock
          </TabsTrigger>
          <TabsTrigger value="machines">
            <Cog className="mr-1.5 h-4 w-4" /> Machines
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <StockTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="machines">
          <MachinesTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Stock tab
// ---------------------------------------------------------------------------
function StockTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | undefined>();
  const [archiving, setArchiving] = useState<StockItem | undefined>();
  const [adjusting, setAdjusting] = useState<StockItem | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...STOCK_KEY, { category, search, lowOnly }],
    queryFn: () =>
      listStock({ pageSize: 200, category: category ?? undefined, search: search.trim() || undefined, lowStock: lowOnly ? 'true' : undefined }),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: STOCK_KEY });

  const createM = useMutation({
    mutationFn: (v: StockInput) => createStock(v),
    onSuccess: () => { invalidate(); toast({ title: 'Stock item added', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not add item', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: StockInput }) => updateStock(id, v),
    onSuccess: () => { invalidate(); toast({ title: 'Stock item updated', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not update item', description: describeApiError(e), variant: 'destructive' }),
  });
  const adjustM = useMutation({
    mutationFn: ({ id, delta, reason }: { id: string; delta: number; reason?: string }) => adjustStock(id, delta, reason),
    onSuccess: () => { invalidate(); setAdjusting(undefined); toast({ title: 'Quantity adjusted', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not adjust', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveStock,
    onSuccess: () => { invalidate(); setArchiving(undefined); toast({ title: 'Stock item archived', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not archive', description: describeApiError(e), variant: 'destructive' }),
  });
  // A real pending flag: the import button was previously passed a hardcoded
  // `false`, so it never disabled and a double-click imported every row twice.
  const importM = useMutation({ mutationFn: importStock, onSuccess: () => invalidate() });

  const items = data?.items ?? [];
  const [chips, setChips] = useState<string[]>([]);
  if (data?.categories && data.categories.join('|') !== chips.join('|')) setChips(data.categories);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-tertiary)" />
          <Input aria-label="Search stock" placeholder="Search stock…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant={lowOnly ? 'primary' : 'secondary'} size="sm" onClick={() => setLowOnly((v) => !v)}>
          Low stock{data?.lowStockCount ? ` (${data.lowStockCount})` : ''}
        </Button>
        <div className="flex-1" />
        {canManage && (
          <>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCategory(null)} className={chipClass(category === null)}>All</button>
          {chips.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} className={chipClass(category === c)}>{c}</button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={search || category || lowOnly ? 'No matching stock' : 'No stock yet'}
          description={canManage ? 'Add your first item, or import your whole catalogue in one paste.' : 'Stock added by your team appears here.'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>On hand</TableHead>
              <TableHead>Location</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => {
              const low = it.minQuantity != null && it.quantity <= it.minQuantity;
              return (
                <TableRow key={it.id}>
                  <TableCell>
                    <div className="font-medium text-(--text-primary)">{it.name}</div>
                    {it.sku && <div className="text-xs text-(--text-tertiary)">{it.sku}</div>}
                  </TableCell>
                  <TableCell>{it.category ? <Badge variant="neutral">{it.category}</Badge> : <span className="text-(--text-tertiary)">—</span>}</TableCell>
                  <TableCell data-tabular>
                    <span className={low ? 'font-medium text-warning-500' : ''}>
                      {it.quantity}{it.unit ? ` ${it.unit}` : ''}
                    </span>
                    {low && <Badge variant="warning" className="ml-2">Low</Badge>}
                  </TableCell>
                  <TableCell className="text-(--text-tertiary)">{it.location ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setAdjusting(it)}>Adjust</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(it); setFormOpen(true); }}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => setArchiving(it)}>Archive</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <StockFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        categories={chips}
        isSubmitting={createM.isPending || updateM.isPending}
        onSubmit={async (v) => {
          if (editing) await updateM.mutateAsync({ id: editing.id, v });
          else await createM.mutateAsync(v);
        }}
      />
      <ImportStockDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        isImporting={importM.isPending}
        onImport={(rows) => importM.mutateAsync(rows)}
      />
      <AdjustDialog item={adjusting} onOpenChange={(o) => !o && setAdjusting(undefined)} isSubmitting={adjustM.isPending}
        onConfirm={(delta, reason) => adjusting && adjustM.mutate({ id: adjusting.id, delta, reason })} />
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Archive this stock item?"
        description={`"${archiving?.name ?? ''}" will no longer appear in the stock list.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveM.mutate(archiving.id)}
        isConfirming={archiveM.isPending}
      />
    </div>
  );
}

function AdjustDialog({
  item,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: {
  item?: StockItem;
  onOpenChange: (open: boolean) => void;
  onConfirm: (delta: number, reason?: string) => void;
  isSubmitting: boolean;
}) {
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');

  // History for this item — the ledger the reason now lands in. Only fetched
  // while the drawer for a given item is open.
  const historyQuery = useQuery({
    queryKey: ['stock-adjustments', item?.id],
    queryFn: () => listStockAdjustments(item!.id),
    enabled: !!item,
  });

  return (
    <Drawer open={!!item} onOpenChange={(o) => { if (!o) { setDelta(''); setReason(''); } onOpenChange(o); }}>
      <DrawerContent className="max-w-sm">
        <DrawerHeader>
          <DrawerTitle>Adjust quantity</DrawerTitle>
        </DrawerHeader>
        {item && (
          <div className="space-y-4">
            <p className="text-sm text-(--text-tertiary)">
              {item.name} — currently <span className="font-medium text-(--text-primary)" data-tabular>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span> on hand.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="delta">Change (use − to remove)</Label>
              <Input id="delta" type="number" placeholder="e.g. 50 received, -12 picked" value={delta} onChange={(e) => setDelta(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-reason">Reason (optional)</Label>
              <Input id="adjust-reason" placeholder="e.g. 5 damaged in transit" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button disabled={isSubmitting || !delta.trim() || Number.isNaN(Number(delta))} onClick={() => onConfirm(Number(delta), reason.trim() || undefined)}>
                {isSubmitting ? 'Saving…' : 'Apply'}
              </Button>
            </div>

            {(historyQuery.data?.items.length ?? 0) > 0 && (
              <div className="space-y-1.5 border-t border-(--border-subtle) pt-3">
                <p className="text-xs font-medium text-(--text-tertiary)">Recent adjustments</p>
                <ul className="space-y-1.5">
                  {historyQuery.data!.items.slice(0, 8).map((a) => (
                    <li key={a.id} className="text-sm">
                      <span className="font-medium tabular-nums text-(--text-primary)">{a.delta > 0 ? `+${a.delta}` : a.delta}</span>
                      <span className="text-(--text-tertiary)"> → {a.quantityAfter}{item.unit ? ` ${item.unit}` : ''}</span>
                      {a.reason && <span className="text-(--text-secondary)"> · {a.reason}</span>}
                      <span className="block text-xs text-(--text-tertiary)">
                        {new Date(a.createdAt).toLocaleString()}{a.actorUser ? ` · ${a.actorUser.fullName}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Machines tab
// ---------------------------------------------------------------------------
function MachinesTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseMachine | undefined>();
  const [archiving, setArchiving] = useState<WarehouseMachine | undefined>();
  const [logsFor, setLogsFor] = useState<WarehouseMachine | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...MACHINE_KEY, 'list'],
    queryFn: () => listMachines({ pageSize: 200 }),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: MACHINE_KEY });

  const createM = useMutation({
    mutationFn: (v: MachineInput) => createMachine(v),
    onSuccess: () => { invalidate(); toast({ title: 'Machine added', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not add machine', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, v }: { id: string; v: MachineInput }) => updateMachine(id, v),
    onSuccess: () => { invalidate(); toast({ title: 'Machine updated', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not update machine', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveMachine,
    onSuccess: () => { invalidate(); setArchiving(undefined); toast({ title: 'Machine archived', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not archive', description: describeApiError(e), variant: 'destructive' }),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--text-tertiary)">
          {data?.needsAttentionCount ? (
            <span className="font-medium text-warning-500">{data.needsAttentionCount} machine{data.needsAttentionCount === 1 ? '' : 's'} need attention</span>
          ) : (
            'All machines operational'
          )}
        </p>
        {canManage && (
          <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add machine
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Cog} title="No machines yet" description={canManage ? 'Add your first forklift, wrapper, or conveyor to start tracking service and monitoring.' : 'Machines added by your team appear here.'} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => {
            const meta = MACHINE_STATUS_META[m.status];
            return (
              <div key={m.id} className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-4 elevation-1">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-(--text-primary)">{m.name}</div>
                    {m.machineType && <div className="text-xs text-(--text-tertiary)">{m.machineType}</div>}
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                <div className="mt-2 space-y-0.5 text-xs text-(--text-tertiary)">
                  {m.location && <div>{m.location}</div>}
                  {m.nextServiceDueAt && <div>Next service {new Date(m.nextServiceDueAt).toLocaleDateString()}</div>}
                  <div>{m._count?.logs ?? 0} log entr{(m._count?.logs ?? 0) === 1 ? 'y' : 'ies'}</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <Button variant="secondary" size="sm" onClick={() => setLogsFor(m)}>Logs</Button>
                  {canManage && <Button variant="ghost" size="sm" onClick={() => { setEditing(m); setFormOpen(true); }}>Edit</Button>}
                  {canManage && <Button variant="ghost" size="sm" onClick={() => setArchiving(m)}>Archive</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MachineFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        machine={editing}
        isSubmitting={createM.isPending || updateM.isPending}
        onSubmit={async (v) => {
          if (editing) await updateM.mutateAsync({ id: editing.id, v });
          else await createM.mutateAsync(v);
        }}
      />
      <MachineLogsDrawer machine={logsFor} canManage={canManage} onOpenChange={(o) => !o && setLogsFor(null)} onChanged={invalidate} />
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Archive this machine?"
        description={`"${archiving?.name ?? ''}" and its history will no longer appear in the machine list.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveM.mutate(archiving.id)}
        isConfirming={archiveM.isPending}
      />
    </div>
  );
}

function MachineLogsDrawer({
  machine,
  canManage,
  onOpenChange,
  onChanged,
}: {
  machine: WarehouseMachine | null;
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<'SERVICE' | 'REPAIR' | 'READING' | 'NOTE'>('SERVICE');
  const [summary, setSummary] = useState('');
  const [meter, setMeter] = useState('');

  const logsQuery = useQuery({
    queryKey: ['warehouse', 'machine-logs', machine?.id],
    queryFn: () => listMachineLogs(machine!.id),
    enabled: !!machine,
  });

  const addM = useMutation({
    mutationFn: () => addMachineLog(machine!.id, { kind, summary: summary.trim(), meterValue: meter ? Number(meter) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', 'machine-logs', machine?.id] });
      onChanged();
      setSummary('');
      setMeter('');
      toast({ title: 'Log added', variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not add log', description: describeApiError(e), variant: 'destructive' }),
  });

  return (
    <Drawer open={!!machine} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-md overflow-y-auto">
        <DrawerHeader>
          <DrawerTitle>{machine?.name} — maintenance</DrawerTitle>
        </DrawerHeader>
        {machine && <MachineScheduleSection machine={machine} canManage={canManage} />}
        {canManage && (
          <div className="mb-4 space-y-2 rounded-lg border border-(--border-subtle) p-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SERVICE">Service</SelectItem>
                  <SelectItem value="REPAIR">Repair</SelectItem>
                  <SelectItem value="READING">Reading</SelectItem>
                  <SelectItem value="NOTE">Note</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Meter (optional)" type="number" value={meter} onChange={(e) => setMeter(e.target.value)} />
            </div>
            <Textarea rows={2} placeholder="What happened?" value={summary} onChange={(e) => setSummary(e.target.value)} />
            <Button size="sm" disabled={addM.isPending || !summary.trim()} onClick={() => addM.mutate()}>
              {addM.isPending ? 'Adding…' : 'Add log entry'}
            </Button>
          </div>
        )}
        <div className="flex-1 space-y-2">
          {logsQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (logsQuery.data?.items.length ?? 0) === 0 ? (
            <p className="py-4 text-center text-sm text-(--text-tertiary)">No log entries yet.</p>
          ) : (
            logsQuery.data!.items.map((log) => (
              <div key={log.id} className="rounded-lg border border-(--border-subtle) p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="neutral">{log.kind}</Badge>
                  <span className="text-xs text-(--text-tertiary)" data-tabular>{new Date(log.occurredAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-sm text-(--text-primary)">{log.summary}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-(--text-tertiary)">
                  {log.meterValue != null && <span data-tabular>{log.meterValue}{log.meterUnit ? ` ${log.meterUnit}` : ''}</span>}
                  {log.createdByUser && <span>· {log.createdByUser.fullName}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function chipClass(active: boolean): string {
  return [
    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
    active ? 'border-accent-500 bg-accent-500/10 text-accent-600' : 'border-(--border-subtle) text-(--text-secondary) hover:bg-(--surface-2)',
  ].join(' ');
}
