import { useEffect, useRef, useState } from 'react';
import { Camera, Plus, ScanLine, X } from 'lucide-react';
import { createParcelFromScan, scanBarcode, type BarcodeScanResult, type ScanFieldsInput } from '@/api/barcode';
import { ApiClientError } from '@/api/client';
import type { StopParcel } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface ScanHistoryEntry {
  scannedValue: string;
  outcome: BarcodeScanResult['outcome'];
  timestamp: number;
}

const HISTORY_CAP = 100;

/**
 * A USB/Bluetooth keyboard-wedge scanner just "types" fast and hits Enter —
 * a plain controlled input with an Enter handler captures it natively, no
 * scanner library needed. The optional camera button feature-detects the
 * browser's built-in `BarcodeDetector`; browsers without it (no polyfill,
 * per this codebase's no-unnecessary-dependencies convention) simply don't
 * get the button, manual/wedge entry still works either way.
 */
export function BarcodeScanInput({
  jobId,
  stopId,
  onParcelAdded,
}: {
  jobId: string;
  stopId: string;
  onParcelAdded?: (parcel: StopParcel) => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<BarcodeScanResult | undefined>();
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Refocus after every resolved scan so continuous scanning never needs a re-click.
  useEffect(() => {
    if (!scanning) inputRef.current?.focus();
  }, [scanning, result]);

  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  async function runScan(scannedValue: string) {
    const trimmed = scannedValue.trim();
    if (!trimmed) return;
    setScanning(true);
    setResult(undefined);
    try {
      const res = await scanBarcode({ jobId, stopId, scannedValue: trimmed });
      setResult(res);
      setHistory((prev) => [{ scannedValue: trimmed, outcome: res.outcome, timestamp: Date.now() }, ...prev].slice(0, HISTORY_CAP));
      if (res.outcome === 'MATCHED') {
        toast({ title: 'Barcode matched', description: res.matchedParcel?.reference, variant: 'success' });
      }
    } catch (err) {
      toast({ title: 'Scan failed', description: err instanceof ApiClientError ? err.message : 'Try again.', variant: 'destructive' });
    } finally {
      setScanning(false);
      setValue('');
    }
  }

  async function createFromResult(fields: ScanFieldsInput) {
    if (!result) return;
    setCreating(true);
    try {
      const parcel = await createParcelFromScan(result.scanEventId, { jobId, stopId, fields });
      toast({ title: 'Parcel added', description: parcel.reference, variant: 'success' });
      onParcelAdded?.(parcel);
      setResult(undefined);
    } catch (err) {
      toast({ title: 'Could not add parcel', description: err instanceof ApiClientError ? err.message : 'Try again.', variant: 'destructive' });
    } finally {
      setCreating(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="space-y-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          runScan(value);
        }}
      >
        <div className="relative flex-1">
          <ScanLine className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-tertiary)" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Scan or type a barcode, then Enter"
            className="h-8 pl-7"
            disabled={scanning}
            autoFocus
          />
        </div>
        {hasBarcodeDetector && (
          <Button type="button" size="sm" variant="secondary" onClick={() => setCameraOpen(true)} disabled={scanning}>
            <Camera className="h-4 w-4" />
          </Button>
        )}
        <Button type="submit" size="sm" variant="secondary" disabled={scanning || !value.trim()}>
          {scanning ? 'Scanning…' : 'Scan'}
        </Button>
      </form>

      {cameraOpen && (
        <CameraScanPanel
          onDetected={(text) => {
            setCameraOpen(false);
            runScan(text);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {result && (
        <ScanResultCard
          result={result}
          creating={creating}
          onCreate={createFromResult}
          onIgnore={() => { setResult(undefined); inputRef.current?.focus(); }}
        />
      )}

      {history.length > 0 && (
        <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-(--border-subtle) bg-(--surface-1) p-2 text-xs">
          <div className="font-medium text-(--text-secondary)">Scan history (this session)</div>
          {history.slice(0, 10).map((h, i) => (
            <div key={i} className="flex items-center justify-between text-(--text-tertiary)">
              <span>{h.scannedValue}</span>
              <OutcomeBadge outcome={h.outcome} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: BarcodeScanResult['outcome'] }) {
  switch (outcome) {
    case 'MATCHED':
      return <Badge variant="success">Matched</Badge>;
    case 'DUPLICATE_BLOCKED':
      return <Badge variant="danger">Duplicate</Badge>;
    case 'MISSING_FIELDS':
      return <Badge variant="warning">Missing fields</Badge>;
    case 'IGNORED':
      return <Badge variant="neutral">Ignored</Badge>;
    default:
      return <Badge variant="neutral">Unrecognised</Badge>;
  }
}

function ScanResultCard({
  result,
  creating,
  onCreate,
  onIgnore,
}: {
  result: BarcodeScanResult;
  creating: boolean;
  onCreate: (fields: ScanFieldsInput) => void;
  onIgnore: () => void;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const pf = result.populatedFields;

  if (result.outcome === 'DUPLICATE_BLOCKED') {
    return (
      <div className="rounded-lg border border-danger-500/40 bg-danger-500/10 p-3 text-sm">
        <div className="font-medium text-danger-600">Already on this run / can't add</div>
        <div className="text-(--text-secondary)">
          {result.matchedParcel?.reference} — {result.matchedParcel?.jobTitle}
        </div>
        <Button variant="ghost" size="sm" className="mt-1" onClick={onIgnore}>Dismiss</Button>
      </div>
    );
  }

  if (result.outcome === 'MATCHED') {
    return (
      <div className="rounded-lg border border-success-500/40 bg-success-500/10 p-3 text-sm">
        <div className="font-medium text-success-600">Matched an existing consignment</div>
        <div className="text-(--text-secondary)">{result.matchedParcel?.reference}</div>
        <PopulatedFieldsPreview fields={pf} />
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            disabled={creating}
            onClick={() => onCreate({ reference: result.matchedParcel!.reference, ...populatedToScanFields(pf) })}
          >
            <Plus className="h-4 w-4" /> Add to this run
          </Button>
          <Button variant="ghost" size="sm" onClick={onIgnore}>Ignore</Button>
        </div>
      </div>
    );
  }

  // UNKNOWN / MISSING_FIELDS
  return (
    <div className="rounded-lg border border-warning-500/40 bg-warning-500/10 p-3 text-sm">
      <div className="font-medium text-warning-600">
        {result.outcome === 'MISSING_FIELDS' ? 'Recognised, but missing required fields' : 'Barcode not recognised'}
      </div>
      {result.missingFields && result.missingFields.length > 0 && (
        <div className="text-(--text-secondary)">Missing: {result.missingFields.join(', ')}</div>
      )}
      <PopulatedFieldsPreview fields={pf} />
      {!showCreateForm ? (
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => setShowCreateForm(true)}><Plus className="h-4 w-4" /> Create new</Button>
          <Button variant="ghost" size="sm" onClick={onIgnore}>Ignore</Button>
        </div>
      ) : (
        <CreateFromScanForm defaults={populatedToScanFields(pf)} creating={creating} onSubmit={onCreate} onCancel={() => setShowCreateForm(false)} />
      )}
    </div>
  );
}

function PopulatedFieldsPreview({ fields }: { fields: BarcodeScanResult['populatedFields'] }) {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {entries.map(([k, v]) => (
        <Badge key={k} variant="neutral">
          {k}: {typeof v === 'object' ? (v as { name?: string })?.name ?? JSON.stringify(v) : String(v)}
        </Badge>
      ))}
    </div>
  );
}

function populatedToScanFields(pf: BarcodeScanResult['populatedFields']): Partial<ScanFieldsInput> {
  return {
    trackingNumber: pf.trackingNumber,
    consignmentNumber: pf.consignmentNumber,
    manifestNumber: pf.manifestNumber,
    internalId: pf.internalId,
    customerReference: pf.customerReference,
    deliveryAddress: pf.deliveryAddress,
    contactName: pf.contactName,
    deliveryNotes: pf.deliveryNotes,
    serviceType: pf.serviceType,
    parcelCount: pf.parcelCount,
    weightKg: pf.weightKg,
    cubicM3: pf.cubicM3,
    dangerousGoods: pf.dangerousGoods,
    customFields: pf.customFields,
  };
}

function CreateFromScanForm({
  defaults,
  creating,
  onSubmit,
  onCancel,
}: {
  defaults: Partial<ScanFieldsInput>;
  creating: boolean;
  onSubmit: (fields: ScanFieldsInput) => void;
  onCancel: () => void;
}) {
  const [reference, setReference] = useState('');
  const [trackingNumber, setTrackingNumber] = useState(defaults.trackingNumber ?? '');

  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!reference.trim()) return;
        onSubmit({ ...defaults, reference: reference.trim(), trackingNumber: trackingNumber.trim() || undefined });
      }}
    >
      <Input placeholder="Reference (required)" value={reference} onChange={(e) => setReference(e.target.value)} className="h-8" />
      <Input placeholder="Tracking number (optional)" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="h-8" />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={creating || !reference.trim()}>{creating ? 'Adding…' : 'Add parcel'}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

/** Minimal live-camera BarcodeDetector loop — closes itself once a code is found. */
function CameraScanPanel({ onDetected, onClose }: { onDetected: (value: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let stream: MediaStream | undefined;
    let stopped = false;
    let rafId: number | undefined;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const DetectorCtor = (window as any).BarcodeDetector;
        const detector = new DetectorCtor();
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onDetected(codes[0].rawValue);
              return;
            }
          } catch {
            // transient decode errors are expected between frames — keep polling
          }
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      } catch {
        setError('Could not access the camera.');
      }
    }
    start();

    return () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-(--border-subtle) bg-black">
      {error ? (
        <div className="p-3 text-sm text-danger-500">{error}</div>
      ) : (
        <video ref={videoRef} className="max-h-48 w-full object-cover" muted playsInline />
      )}
      <Button type="button" variant="secondary" size="sm" className="absolute right-2 top-2" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
