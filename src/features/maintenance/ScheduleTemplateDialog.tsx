import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { getSchedulePresets, type ScheduleItem, type ScheduleTemplate } from '@/api/maintenance-schedules';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ScheduleTemplate;
  onSubmit: (values: { name: string; items: ScheduleItem[]; isDefault: boolean }) => Promise<void>;
  isSubmitting: boolean;
}

/** Create/edit a maintenance schedule template — a named, reusable set of
 *  recurring service items (label + interval in days). Seed from a preset. */
export function ScheduleTemplateDialog({ open, onOpenChange, template, onSubmit, isSubmitting }: Props) {
  const isEdit = !!template;
  const [name, setName] = useState('');
  const [items, setItems] = useState<ScheduleItem[]>([{ label: '', intervalDays: 180 }]);
  const [isDefault, setIsDefault] = useState(false);

  const presetsQuery = useQuery({ queryKey: ['schedule-presets'], queryFn: getSchedulePresets, enabled: open && !isEdit });

  useEffect(() => {
    if (open) {
      setName(template?.name ?? '');
      setItems(template?.items?.length ? template.items.map((i) => ({ ...i })) : [{ label: '', intervalDays: 180 }]);
      setIsDefault(template?.isDefault ?? false);
    }
  }, [open, template]);

  const validItems = items.filter((i) => i.label.trim() && i.intervalDays > 0);
  const canSubmit = name.trim().length > 0 && validItems.length > 0;

  async function submit() {
    if (!canSubmit) return;
    await onSubmit({ name: name.trim(), items: validItems.map((i) => ({ label: i.label.trim(), intervalDays: Number(i.intervalDays) })), isDefault });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit schedule template' : 'New schedule template'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!isEdit && presetsQuery.data && (
            <div className="space-y-1.5">
              <Label>Start from a preset (optional)</Label>
              <Select
                onValueChange={(v) => {
                  const preset = presetsQuery.data.items.find((p) => p.name === v);
                  if (preset) {
                    setItems(preset.items.map((i) => ({ ...i })));
                    if (!name.trim()) setName(preset.name);
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Choose a preset…" /></SelectTrigger>
                <SelectContent>
                  {presetsQuery.data.items.map((p) => (
                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-name">Name</Label>
            <Input id="tmpl-name" placeholder="e.g. Heavy vehicle schedule" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Service items</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setItems((it) => [...it, { label: '', intervalDays: 180 }])}>
                <Plus className="h-3.5 w-3.5" /> Add item
              </Button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Label (e.g. Service)"
                  value={item.label}
                  onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="1"
                    className="w-20"
                    value={item.intervalDays}
                    onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? { ...x, intervalDays: Number(e.target.value) } : x)))}
                  />
                  <span className="text-xs text-(--text-tertiary)">days</span>
                </div>
                {items.length > 1 && (
                  <button type="button" aria-label="Remove schedule item" className="text-(--text-tertiary) hover:text-(--text-primary)" onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 accent-accent-500" />
            Mark as the default schedule template
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={isSubmitting || !canSubmit} onClick={submit}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
