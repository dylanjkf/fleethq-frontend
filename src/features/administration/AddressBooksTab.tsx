import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Download, Plus, Upload } from 'lucide-react';
import {
  applyAddressBook,
  archiveAddressBook,
  createAddressBook,
  exportAddressBook,
  importAddressBook,
  listAddressBooks,
  type AddressBook,
  type AddressBookPayload,
} from '@/api/address-books';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

const KEY = ['address-books'];

/** Prompt a file download of the exported book payload. */
function downloadPayload(payload: AddressBookPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `address-book-${payload.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Best-effort validation that an uploaded file is an address-book payload. */
function parsePayload(text: string): AddressBookPayload {
  const parsed = JSON.parse(text) as unknown;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as AddressBookPayload).name !== 'string' ||
    !Array.isArray((parsed as AddressBookPayload).entries)
  ) {
    throw new Error('That file is not a FleetOS address book export.');
  }
  return parsed as AddressBookPayload;
}

/**
 * Depot/customer address books (Saved Layout): save this company's depots and
 * customers into a named, portable book. A multi-entity operator can export a
 * book and import it into another company, then apply it to populate that
 * company's depots/customers — idempotent by name, so nothing duplicates.
 */
export function AddressBooksTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [includeDepots, setIncludeDepots] = useState(true);
  const [includeCustomers, setIncludeCustomers] = useState(true);
  const [applying, setApplying] = useState<AddressBook | undefined>();
  const [archiving, setArchiving] = useState<AddressBook | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: KEY, queryFn: listAddressBooks });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const createM = useMutation({
    mutationFn: createAddressBook,
    onSuccess: () => { invalidate(); setCreateOpen(false); toast({ title: 'Address book saved', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not save', description: describeApiError(e), variant: 'destructive' }),
  });
  const importM = useMutation({
    mutationFn: importAddressBook,
    onSuccess: (b) => { invalidate(); toast({ title: `Imported “${b.name}”`, description: `${b.depotCount} depot(s), ${b.customerCount} customer(s). Use Apply to add them here.`, variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not import', description: describeApiError(e), variant: 'destructive' }),
  });
  const applyM = useMutation({
    mutationFn: (id: string) => applyAddressBook(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['depots'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setApplying(undefined);
      toast({ title: 'Applied to this company', description: `${res.depotsCreated} depot(s) + ${res.customersCreated} customer(s) added, ${res.skipped} already existed.`, variant: 'success' });
    },
    onError: (e) => toast({ title: 'Could not apply', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveM = useMutation({
    mutationFn: archiveAddressBook,
    onSuccess: () => { invalidate(); setArchiving(undefined); toast({ title: 'Address book archived', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not archive', description: describeApiError(e), variant: 'destructive' }),
  });

  const books = data?.items ?? [];

  async function onExport(book: AddressBook) {
    try {
      downloadPayload(await exportAddressBook(book.id));
    } catch (e) {
      toast({ title: 'Could not export', description: describeApiError(e), variant: 'destructive' });
    }
  }

  async function onFilePicked(file: File) {
    try {
      importM.mutate(parsePayload(await file.text()));
    } catch (e) {
      toast({ title: 'Could not read file', description: e instanceof Error ? e.message : 'Invalid file.', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-(--text-tertiary)">Save this company's depots and customers as a portable book, then move it into another company you run.</p>
        <div className="flex gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFilePicked(f); e.target.value = ''; }}
          />
          <Button variant="secondary" disabled={importM.isPending} onClick={() => fileInput.current?.click()}>
            <Upload className="h-4 w-4" /> Import file
          </Button>
          <Button onClick={() => { setName(''); setIncludeDepots(true); setIncludeCustomers(true); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" /> Save current
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : books.length === 0 ? (
        <EmptyState icon={BookMarked} title="No address books yet" description="Save this company's depots and customers as a reusable book, or import one exported from another company." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {books.map((b) => (
            <div key={b.id} className="rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-4 elevation-1">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="font-medium text-(--text-primary)">{b.name}</div>
                <div className="flex gap-1">
                  <Badge variant="neutral">{b.depotCount} depot{b.depotCount === 1 ? '' : 's'}</Badge>
                  <Badge variant="neutral">{b.customerCount} customer{b.customerCount === 1 ? '' : 's'}</Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Button variant="secondary" size="sm" onClick={() => setApplying(b)}>Apply here</Button>
                <Button variant="ghost" size="sm" onClick={() => void onExport(b)}><Download className="h-3.5 w-3.5" /> Export</Button>
                <Button variant="ghost" size="sm" onClick={() => setArchiving(b)}>Archive</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save current locations</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ab-name">Book name</Label>
              <Input id="ab-name" placeholder="e.g. Melbourne depot network" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Include</Label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-accent-500" checked={includeDepots} onChange={(e) => setIncludeDepots(e.target.checked)} /> Depots
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-accent-500" checked={includeCustomers} onChange={(e) => setIncludeCustomers(e.target.checked)} /> Customers
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={createM.isPending || !name.trim() || (!includeDepots && !includeCustomers)}
              onClick={() => createM.mutate({ name: name.trim(), includeDepots, includeCustomers })}
            >
              {createM.isPending ? 'Saving…' : 'Save book'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!applying}
        onOpenChange={(o) => !o && setApplying(undefined)}
        title="Apply this book here?"
        description={`Adds "${applying?.name ?? ''}" (${applying?.depotCount ?? 0} depot(s), ${applying?.customerCount ?? 0} customer(s)) to this company. Locations whose name already exists are skipped — no duplicates.`}
        confirmLabel="Apply"
        onConfirm={() => applying && applyM.mutate(applying.id)}
        isConfirming={applyM.isPending}
      />
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(undefined)}
        title="Archive this address book?"
        description={`"${archiving?.name ?? ''}" will be removed. Depots and customers already created from it stay put.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveM.mutate(archiving.id)}
        isConfirming={archiveM.isPending}
      />
    </div>
  );
}
