import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, FileText, Plus, RotateCcw, Upload } from 'lucide-react';
import { addStopParcels, addStops, getJob, openStopReceipt, reattemptStop, reorderStops } from '@/api/dispatch';
import { listCustomers } from '@/api/customers';
import { importStops } from '@/api/imports';
import { ApiClientError } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AttachmentImage } from '@/components/ui/attachment-image';
import { BarcodeScanInput } from '@/features/dispatch/BarcodeScanInput';
import { ImportWizardDialog } from '@/features/imports/ImportWizardDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';

const STOP_IMPORT_FIELDS = [
  { key: 'customerName', label: 'Customer name', required: false },
  { key: 'label', label: 'Stop label', required: false },
  { key: 'address', label: 'Address', required: false },
  { key: 'contactName', label: 'Contact name', required: false },
];

const FREE_TEXT = '__free_text__';

interface JobStopsDialogProps {
  jobId?: string;
  onOpenChange: (open: boolean) => void;
}

/** Office view of a job's delivery run: ordered stops, each with its Proof of Delivery. */
export function JobStopsDialog({ jobId, onOpenChange }: JobStopsDialogProps) {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState(FREE_TEXT);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const jobQuery = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJob(jobId!),
    enabled: !!jobId,
  });
  const customersQuery = useQuery({
    queryKey: ['customers', 'list', 'for-stops'],
    queryFn: () => listCustomers({ pageSize: 200 }),
    enabled: !!jobId,
  });
  const customers = (customersQuery.data?.items ?? []).filter((c) => !c.archivedAt);

  const addMutation = useMutation({
    mutationFn: () =>
      addStops(jobId!, [
        {
          customerId: customerId === FREE_TEXT ? undefined : customerId,
          label: label.trim() || undefined,
          address: address.trim() || undefined,
          windowStart: windowStart ? new Date(windowStart).toISOString() : undefined,
          windowEnd: windowEnd ? new Date(windowEnd).toISOString() : undefined,
        },
      ]),
    onSuccess: () => {
      setCustomerId(FREE_TEXT);
      setLabel('');
      setAddress('');
      setWindowStart('');
      setWindowEnd('');
      jobQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err) =>
      toast({ title: 'Could not add stop', description: err instanceof ApiClientError ? err.message : 'Try again.', variant: 'destructive' }),
  });

  const reorderMutation = useMutation({
    mutationFn: (stopIds: string[]) => reorderStops(jobId!, stopIds),
    onSuccess: () => {
      jobQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err) =>
      toast({ title: 'Could not reorder stops', description: err instanceof ApiClientError ? err.message : 'Try again.', variant: 'destructive' }),
  });

  const reattemptMutation = useMutation({
    mutationFn: (stopId: string) => reattemptStop(jobId!, stopId),
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({ title: 'Reattempt created', description: `Carried over into "${newJob.title}".`, variant: 'success' });
    },
    onError: (err) =>
      toast({ title: 'Could not reattempt stop', description: err instanceof ApiClientError ? err.message : 'Try again.', variant: 'destructive' }),
  });

  const [parcelInputs, setParcelInputs] = useState<Record<string, string>>({});
  const addParcelMutation = useMutation({
    mutationFn: ({ stopId, reference }: { stopId: string; reference: string }) => addStopParcels(jobId!, stopId, [{ reference }]),
    onSuccess: (_res, { stopId }) => {
      setParcelInputs((prev) => ({ ...prev, [stopId]: '' }));
      jobQuery.refetch();
    },
    onError: (err) =>
      toast({ title: 'Could not add parcel', description: err instanceof ApiClientError ? err.message : 'Try again.', variant: 'destructive' }),
  });

  const stops = jobQuery.data?.stops ?? [];
  const canAddStop = customerId !== FREE_TEXT || label.trim().length > 0;
  // Only PENDING stops are reorderable — a completed/failed stop's position is
  // historical fact (see JobsService.reorderStops).
  const pendingStopIds = stops.filter((s) => s.outcome === 'PENDING').map((s) => s.id);

  function moveStop(stopId: string, direction: -1 | 1) {
    const idx = pendingStopIds.indexOf(stopId);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= pendingStopIds.length) return;
    const next = [...pendingStopIds];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    reorderMutation.mutate(next);
  }

  return (
    <Dialog open={!!jobId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0 pr-8">
          <DialogTitle>Delivery run{jobQuery.data ? ` — ${jobQuery.data.title}` : ''}</DialogTitle>
          {can(PERMISSIONS.DISPATCH_EDIT) && jobQuery.data && (
            <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
          )}
        </DialogHeader>

        {jobQuery.isLoading ? (
          <p className="text-sm text-(--text-tertiary)">Loading…</p>
        ) : (
          <div className="space-y-3">
            {stops.length === 0 && <p className="text-sm text-(--text-secondary)">No stops added yet.</p>}
            {stops.map((stop) => (
              <div key={stop.id} className="rounded-lg border border-(--border-subtle) p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    {can(PERMISSIONS.DISPATCH_EDIT) && stop.outcome === 'PENDING' && (
                      <div className="flex flex-col">
                        <button
                          type="button"
                          aria-label="Move stop earlier"
                          onClick={() => moveStop(stop.id, -1)}
                          disabled={pendingStopIds.indexOf(stop.id) === 0 || reorderMutation.isPending}
                          className="text-(--text-tertiary) hover:text-(--text-primary) disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move stop later"
                          onClick={() => moveStop(stop.id, 1)}
                          disabled={pendingStopIds.indexOf(stop.id) === pendingStopIds.length - 1 || reorderMutation.isPending}
                          className="text-(--text-tertiary) hover:text-(--text-primary) disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">
                        {stop.sequence}. {stop.label}
                      </span>
                      {stop.customer && <Badge variant="neutral" className="ml-2">{stop.customer.name}</Badge>}
                      {stop.address && <div className="text-sm text-(--text-tertiary)">{stop.address}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {stop.outcome === 'DELIVERED' ? (
                      <Badge variant="success">Delivered</Badge>
                    ) : stop.outcome === 'FAILED' ? (
                      <Badge variant="danger">Failed</Badge>
                    ) : (
                      <Badge variant="neutral">Pending</Badge>
                    )}
                    {stop.outcome === 'FAILED' && can(PERMISSIONS.DISPATCH_CREATE) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reattemptMutation.mutate(stop.id)}
                        disabled={reattemptMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4" /> Reattempt
                      </Button>
                    )}
                  </div>
                </div>
                {(stop.windowStart || stop.windowEnd) && (
                  <div className="mt-1 text-sm text-(--text-tertiary)">
                    Window: {stop.windowStart ? new Date(stop.windowStart).toLocaleString() : '—'}
                    {' – '}
                    {stop.windowEnd ? new Date(stop.windowEnd).toLocaleString() : '—'}
                  </div>
                )}
                {(stop.recipientName || stop.note || stop.completedAt || stop.failureReason) && (
                  <div className="mt-2 space-y-0.5 text-sm text-(--text-secondary)">
                    {stop.failureReason && <div>Failure reason: {formatFailureReason(stop.failureReason)}</div>}
                    {stop.recipientName && <div>Received by: {stop.recipientName}</div>}
                    {stop.note && <div>Note: {stop.note}</div>}
                    {stop.completedAt && (
                      <div className="text-(--text-tertiary)">{new Date(stop.completedAt).toLocaleString()}</div>
                    )}
                  </div>
                )}
                {jobId && stop.outcome !== 'PENDING' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 px-2"
                    onClick={() =>
                      openStopReceipt(jobId, stop.id).catch(() =>
                        toast({ title: 'Could not open receipt', description: 'Try again.', variant: 'destructive' }),
                      )
                    }
                  >
                    <FileText className="h-4 w-4" /> Download receipt
                  </Button>
                )}
                {(stop.podAttachment || stop.signatureAttachment) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {stop.podAttachment && (
                      <AttachmentImage id={stop.podAttachment.id} alt="Proof of delivery" className="max-h-56 rounded-lg border border-(--border-subtle)" />
                    )}
                    {stop.signatureAttachment && (
                      <AttachmentImage id={stop.signatureAttachment.id} alt="Recipient signature" className="max-h-40 rounded-lg border border-(--border-subtle) bg-white" />
                    )}
                  </div>
                )}
                {((stop.parcels && stop.parcels.length > 0) || can(PERMISSIONS.DISPATCH_EDIT)) && (
                  <div className="mt-2 rounded-lg border border-(--border-subtle) bg-(--surface-1) p-2">
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-(--text-secondary)">
                      <span>Parcels</span>
                      {stop.parcels && stop.parcels.length > 0 && (
                        <span className="text-(--text-tertiary)">
                          {stop.parcels.filter((p) => p.scannedAt).length}/{stop.parcels.length} scanned
                        </span>
                      )}
                    </div>
                    {stop.parcels?.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span>
                          {p.reference}
                          {p.label && <span className="text-(--text-tertiary)"> · {p.label}</span>}
                        </span>
                        <span className={p.scannedAt ? 'text-success-600' : 'text-(--text-tertiary)'}>{p.scannedAt ? '✓ Scanned' : 'Pending'}</span>
                      </div>
                    ))}
                    {can(PERMISSIONS.DISPATCH_EDIT) && jobId && (
                      <div className="mt-2 space-y-2">
                        {/* Scan (USB/Bluetooth wedge, camera, or manual entry — all the
                            same input) populates fields via the company's barcode config. */}
                        <BarcodeScanInput jobId={jobId} stopId={stop.id} onParcelAdded={() => jobQuery.refetch()} />
                        {/* Bare-reference quick add stays available as the simplest possible
                            fallback, independent of any barcode config existing at all. */}
                        <form
                          className="flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const reference = (parcelInputs[stop.id] ?? '').trim();
                            if (reference) addParcelMutation.mutate({ stopId: stop.id, reference });
                          }}
                        >
                          <Input
                            value={parcelInputs[stop.id] ?? ''}
                            onChange={(e) => setParcelInputs((prev) => ({ ...prev, [stop.id]: e.target.value }))}
                            placeholder="Or quick-add by reference only"
                            className="h-8"
                          />
                          <Button type="submit" size="sm" variant="secondary" disabled={addParcelMutation.isPending}>
                            Add
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {can(PERMISSIONS.DISPATCH_EDIT) && jobQuery.data && (
              <form
                className="space-y-2 rounded-lg border border-dashed border-(--border-subtle) p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canAddStop) addMutation.mutate();
                }}
              >
                <Select
                  value={customerId}
                  onValueChange={(value) => {
                    setCustomerId(value);
                    if (value !== FREE_TEXT) {
                      const c = customers.find((cust) => cust.id === value);
                      setLabel(c?.name ?? '');
                      setAddress(c?.address ?? '');
                    } else {
                      setLabel('');
                      setAddress('');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Saved customer or free text" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FREE_TEXT}>Free text (one-off stop)</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder={customerId === FREE_TEXT ? 'Stop label (e.g. 12 Smith St — ACME)' : 'Label (defaults from customer)'}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                <Input placeholder="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-(--text-tertiary)">
                    Window start (optional)
                    <input
                      type="datetime-local"
                      value={windowStart}
                      onChange={(e) => setWindowStart(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-(--border-subtle) bg-(--surface-1) px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs text-(--text-tertiary)">
                    Window end (optional)
                    <input
                      type="datetime-local"
                      value={windowEnd}
                      onChange={(e) => setWindowEnd(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-(--border-subtle) bg-(--surface-1) px-2 py-1 text-sm"
                    />
                  </label>
                </div>
                <Button type="submit" size="sm" disabled={!canAddStop || addMutation.isPending}>
                  <Plus className="h-4 w-4" /> Add stop
                </Button>
              </form>
            )}
          </div>
        )}
      </DialogContent>

      {jobId && (
        <ImportWizardDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          entityLabel="Stop"
          fields={STOP_IMPORT_FIELDS}
          importFn={(input) => importStops(jobId, input)}
          onImported={() => {
            jobQuery.refetch();
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
          }}
        />
      )}
    </Dialog>
  );
}

function formatFailureReason(reason: string): string {
  return reason
    .toLowerCase()
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}
