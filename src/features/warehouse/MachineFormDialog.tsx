import { useEffect, useState } from 'react';
import type { MachineInput, MachineStatus, WarehouseMachine } from '@/api/warehouse';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface MachineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine?: WarehouseMachine;
  onSubmit: (values: MachineInput) => Promise<void>;
  isSubmitting: boolean;
}

function toDateInput(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

export function MachineFormDialog({ open, onOpenChange, machine, onSubmit, isSubmitting }: MachineFormDialogProps) {
  const isEdit = !!machine;
  const [name, setName] = useState('');
  const [machineType, setMachineType] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [status, setStatus] = useState<MachineStatus>('OPERATIONAL');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [nextServiceDueAt, setNextServiceDueAt] = useState('');

  useEffect(() => {
    if (open) {
      setName(machine?.name ?? '');
      setMachineType(machine?.machineType ?? '');
      setSerialNumber(machine?.serialNumber ?? '');
      setStatus(machine?.status ?? 'OPERATIONAL');
      setLocation(machine?.location ?? '');
      setNotes(machine?.notes ?? '');
      setNextServiceDueAt(toDateInput(machine?.nextServiceDueAt));
    }
  }, [open, machine]);

  const canSubmit = name.trim().length > 0;

  async function submit() {
    if (!canSubmit) return;
    await onSubmit({
      name: name.trim(),
      machineType: machineType.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      status,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      nextServiceDueAt: nextServiceDueAt || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit machine' : 'Add machine'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="m-name">Name</Label>
            <Input id="m-name" placeholder="e.g. Forklift #2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-type">Type (optional)</Label>
              <Input id="m-type" placeholder="Forklift, wrapper…" value={machineType} onChange={(e) => setMachineType(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-serial">Serial (optional)</Label>
              <Input id="m-serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as MachineStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATIONAL">Operational</SelectItem>
                  <SelectItem value="NEEDS_ATTENTION">Needs attention</SelectItem>
                  <SelectItem value="DOWN">Down</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-next">Next service due</Label>
              <Input id="m-next" type="date" value={nextServiceDueAt} onChange={(e) => setNextServiceDueAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-loc">Location (optional)</Label>
            <Input id="m-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-notes">Notes (optional)</Label>
            <Textarea id="m-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSubmitting || !canSubmit} onClick={submit}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add machine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
