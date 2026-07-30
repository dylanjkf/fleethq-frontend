import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MaintenanceJob, Part } from '@/api/types';

interface LogPartsUsedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: MaintenanceJob;
  parts: Part[];
  onSubmit: (values: { partId: string; quantity: number }) => Promise<void>;
  isSubmitting: boolean;
}

/** Logs a part used against an open maintenance job — decrements the part's stock server-side. */
export function LogPartsUsedDialog({ open, onOpenChange, job, parts, onSubmit, isSubmitting }: LogPartsUsedDialogProps) {
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    if (open) {
      setPartId('');
      setQuantity('1');
    }
  }, [open]);

  const selectedPart = parts.find((p) => p.id === partId);
  const requestedQty = Number(quantity) || 0;
  const exceedsStock = !!selectedPart && requestedQty > selectedPart.quantityOnHand;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!partId || requestedQty < 1) return;
    await onSubmit({ partId, quantity: requestedQty });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log parts used on "{job?.title}"</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Part</Label>
            <Select value={partId} onValueChange={setPartId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a part…" />
              </SelectTrigger>
              <SelectContent>
                {parts.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.name} ({part.quantityOnHand} in stock)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {parts.length === 0 && <p className="text-xs text-(--text-tertiary)">No parts in the catalog yet — add one on the Parts tab first.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            {exceedsStock && <p className="text-xs text-danger-500">Only {selectedPart!.quantityOnHand} in stock.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !partId || requestedQty < 1 || exceedsStock}>
              {isSubmitting ? 'Logging…' : 'Log parts used'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
