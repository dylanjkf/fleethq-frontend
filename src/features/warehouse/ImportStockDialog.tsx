import { useState } from 'react';
import type { ImportResult, StockInput } from '@/api/warehouse';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ImportStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: StockInput[]) => Promise<ImportResult>;
  isImporting: boolean;
}

/**
 * Bulk stock import — "move their entire stock over with ease". Paste a CSV
 * (with or without a header row): name, sku, quantity, unit, category,
 * location. Parsed client-side into rows and sent in one request; the server
 * reports per-row results.
 */
export function ImportStockDialog({ open, onOpenChange, onImport, isImporting }: ImportStockDialogProps) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  function parse(): StockInput[] {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return [];
    // Drop a header row if the first cell looks like "name".
    const first = lines[0].split(',')[0]?.trim().toLowerCase();
    const body = first === 'name' ? lines.slice(1) : lines;
    return body
      .map((line) => {
        const [name, sku, quantity, unit, category, location] = line.split(',').map((c) => c.trim());
        return { name, sku, quantity: quantity ? Number(quantity) : undefined, unit, category, location };
      })
      .filter((r) => r.name);
  }

  const rows = parse();

  async function run() {
    if (!rows.length) return;
    const res = await onImport(rows);
    setResult(res);
    if (res.failed === 0) setText('');
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setResult(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-(--text-tertiary)">
            Paste one item per line as{' '}
            <code className="rounded bg-(--surface-2) px-1 text-xs">name, sku, quantity, unit, category, location</code>. A
            header row is optional — everything but the name can be left blank.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="imp">Rows</Label>
            <Textarea
              id="imp"
              rows={9}
              className="font-mono text-xs"
              placeholder={'Pallet wrap 500mm, WRAP-500, 40, roll, Packaging, A3\nStretch film, FILM-12, 120, roll, Packaging, A3'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          {rows.length > 0 && !result && (
            <p className="text-xs text-(--text-tertiary)">{rows.length} row{rows.length === 1 ? '' : 's'} ready to import.</p>
          )}
          {result && (
            <div className="rounded-md border border-(--border-subtle) p-3 text-sm">
              <p className="font-medium text-success-500">Imported {result.created} of {result.total}.</p>
              {result.failed > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs text-danger-500">
                  {result.errors.slice(0, 5).map((e) => (
                    <li key={e.index}>Row {e.index + 1}: {e.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {result ? 'Done' : 'Cancel'}
          </Button>
          <Button type="button" disabled={isImporting || rows.length === 0} onClick={run}>
            {isImporting ? 'Importing…' : `Import ${rows.length || ''}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
