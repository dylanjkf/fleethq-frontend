import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MaintenanceJob } from '@/api/types';

export interface CloseMaintenanceJobValues {
  resolutionNotes?: string;
  partsCost?: number;
  laborCost?: number;
}

interface CloseMaintenanceJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: MaintenanceJob;
  onSubmit: (values: CloseMaintenanceJobValues) => Promise<void>;
  isSubmitting: boolean;
}

export function CloseMaintenanceJobDialog({
  open,
  onOpenChange,
  job,
  onSubmit,
  isSubmitting,
}: CloseMaintenanceJobDialogProps) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [laborCost, setLaborCost] = useState('');

  useEffect(() => {
    if (open) {
      setResolutionNotes('');
      setPartsCost('');
      setLaborCost('');
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({
      resolutionNotes: resolutionNotes || undefined,
      partsCost: partsCost === '' ? undefined : Number(partsCost),
      laborCost: laborCost === '' ? undefined : Number(laborCost),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close "{job?.title}"</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resolution-notes">Resolution notes (optional)</Label>
            <Input
              id="resolution-notes"
              placeholder="Parts used, labor performed, etc."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="parts-cost">Parts cost (optional)</Label>
              <Input
                id="parts-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={partsCost}
                onChange={(e) => setPartsCost(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="labor-cost">Labor cost (optional)</Label>
              <Input
                id="labor-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-(--text-tertiary)">
            This moves the job to a terminal state — it can no longer be edited or reopened. Cost feeds the Reports
            page's cost trend.
          </p>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Closing…' : 'Close job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
