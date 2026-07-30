import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, RadioTower } from 'lucide-react';
import { archiveGpsDevice, listGpsDevices, registerGpsDevice, rotateGpsDeviceKey, updateGpsDevice, type GpsDevice } from '@/api/gps';
import { listAssets } from '@/api/assets';
import { GpsSetupGuide } from './GpsSetupGuide';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const KEY = ['gps-devices'];
const NO_ASSET = '__none__';
/**
 * The ingest URL a tracker must POST to. Derived from the current origin rather
 * than a build-time env var: the SPA proxies `/v1` to the API on its own origin
 * (see api/client.ts), so the host serving this page is by construction the
 * right host for fixes. A bare path was the single biggest reason tracker setup
 * was hard to follow — a device needs the absolute URL.
 */
const INGEST_URL = `${typeof window === 'undefined' ? '' : window.location.origin}/v1/gps/ingest`;
function ageLabel(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

/**
 * GPS trackers: register a hardware device, bind it to an asset, and configure
 * it to POST positions to the universal ingest endpoint with its device key.
 * The key is shown once at registration (and on rotation) — copy it into the
 * device or telematics provider.
 */
export function GpsDevicesTab() {
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.GPS_DEVICE_MANAGE);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  // Poll while this tab is open: the whole point of "Last fix" is watching a
  // tracker you just configured come alive, which shouldn't need a manual reload.
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: KEY,
    queryFn: listGpsDevices,
    refetchInterval: 15_000,
  });
  const assetsQuery = useQuery({ queryKey: ['assets', 'list', 'for-gps'], queryFn: () => listAssets({ pageSize: 200 }) });
  const assets = (assetsQuery.data?.items ?? []).filter((a) => !a.archivedAt);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [assetId, setAssetId] = useState(NO_ASSET);
  const [revealed, setRevealed] = useState<{ name: string; deviceKey: string } | null>(null);
  const [archiving, setArchiving] = useState<GpsDevice | undefined>();

  const registerM = useMutation({
    mutationFn: registerGpsDevice,
    onSuccess: (res) => { invalidate(); setRegisterOpen(false); setRevealed({ name: res.name, deviceKey: res.deviceKey }); },
    onError: (e) => toast({ title: 'Could not register', description: describeApiError(e), variant: 'destructive' }),
  });
  const bindM = useMutation({
    mutationFn: ({ id, assetId }: { id: string; assetId: string | null }) => updateGpsDevice(id, { assetId }),
    onSuccess: () => { invalidate(); toast({ title: 'Device updated', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not update', description: describeApiError(e), variant: 'destructive' }),
  });
  const rotateM = useMutation({
    mutationFn: (id: string) => rotateGpsDeviceKey(id),
    onSuccess: (res) => { const d = devices.find((x) => x.id === res.id); setRevealed({ name: d?.name ?? 'Device', deviceKey: res.deviceKey }); },
    onError: (e) => toast({ title: 'Could not rotate key', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveGpsDevice,
    onSuccess: () => { invalidate(); setArchiving(undefined); toast({ title: 'Device removed', variant: 'success' }); },
    onError: (e) => { setArchiving(undefined); toast({ title: 'Could not remove', description: describeApiError(e), variant: 'destructive' }); },
  });

  const devices = data?.items ?? [];
  const ingestUrl = INGEST_URL;
  const revealedCurl = [
    `curl -X POST ${ingestUrl} \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '{"deviceKey":"${revealed?.deviceKey ?? ''}","lat":-33.8688,"lng":151.2093}'`,
  ].join('\n');

  function copy(text: string) {
    void navigator.clipboard?.writeText(text);
    toast({ title: 'Copied to clipboard', variant: 'success' });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-(--text-tertiary)">
          Fit an asset with a GPS tracker and it shows on the live map without a driver's phone. Expand{' '}
          <span className="font-medium">How to connect a GPS tracker</span> below for the exact URL, payload, and a
          test command.
        </p>
        {canManage && <Button onClick={() => { setName(''); setProvider(''); setAssetId(NO_ASSET); setRegisterOpen(true); }}><Plus className="h-4 w-4" /> Register device</Button>}
      </div>

      <GpsSetupGuide onCopy={copy} />

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : devices.length === 0 ? (
        <EmptyState icon={RadioTower} title="No GPS trackers" description="Register a tracker and bind it to an asset to see hardware positions on the map." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Last fix</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  {d.name}
                  {d.provider && <p className="text-xs font-normal text-(--text-tertiary)">{d.provider}</p>}
                </TableCell>
                <TableCell>
                  {canManage ? (
                    <Select value={d.asset?.id ?? NO_ASSET} onValueChange={(v) => bindM.mutate({ id: d.id, assetId: v === NO_ASSET ? null : v })}>
                      <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_ASSET}>— Unbound —</SelectItem>
                        {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    d.asset?.name ?? '—'
                  )}
                </TableCell>
                <TableCell>
                  {d.lastLocationAt ? <Badge variant="success">{ageLabel(d.lastLocationAt)}</Badge> : <Badge variant="neutral">never</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => rotateM.mutate(d.id)} disabled={rotateM.isPending}>Rotate key</Button>
                      <Button variant="ghost" size="sm" onClick={() => setArchiving(d)}>Remove</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Register */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Register GPS tracker</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="gps-name">Name</Label>
              <Input id="gps-name" placeholder="e.g. Truck 7 tracker" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gps-provider">Provider / model (optional)</Label>
              <Input id="gps-provider" placeholder="e.g. Teltonika FMB920" value={provider} onChange={(e) => setProvider(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Bind to asset (optional)</Label>
              <Select value={assetId} onValueChange={setAssetId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ASSET}>— None —</SelectItem>
                  {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            <Button disabled={registerM.isPending || !name.trim()} onClick={() => registerM.mutate({ name: name.trim(), provider: provider.trim() || undefined, assetId: assetId === NO_ASSET ? undefined : assetId })}>
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time key reveal */}
      <Dialog open={!!revealed} onOpenChange={(o) => !o && setRevealed(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Device key for “{revealed?.name}”</DialogTitle></DialogHeader>
          <p className="text-sm text-(--text-tertiary)">
            Copy this now — it won't be shown again (only its hash is stored). Configure your tracker to send it in
            the <code className="rounded bg-(--surface-2) px-1">deviceKey</code> field when it POSTs to{' '}
            <code className="rounded bg-(--surface-2) px-1">{ingestUrl}</code>.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-2) p-2">
            <code className="flex-1 break-all text-xs">{revealed?.deviceKey}</code>
            <Button variant="ghost" size="icon" aria-label="Copy device key" onClick={() => revealed && copy(revealed.deviceKey)}><Copy className="h-4 w-4" /></Button>
          </div>
          {/* Ready to run, with the real key already in it — the fastest way to
              confirm the pipeline works before configuring any hardware. */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Test it right now</p>
            <div className="flex items-start gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-2) p-2">
              <code className="flex-1 whitespace-pre-wrap break-all font-mono text-xs">{revealedCurl}</code>
              <Button variant="ghost" size="icon" aria-label="Copy test command" onClick={() => copy(revealedCurl)}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-(--text-tertiary)">
              A <code className="rounded bg-(--surface-2) px-1">{'{"accepted":true}'}</code> response means it worked —
              this tracker's “Last fix” will turn green within a few seconds.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealed(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Remove this tracker?"
        description={`"${archiving?.name ?? ''}" will stop reporting and its key stops working.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => archiving && archiveM.mutate(archiving.id)}
        isConfirming={archiveM.isPending}
      />
    </div>
  );
}
