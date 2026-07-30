import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff } from 'lucide-react';
import type { WidgetCatalogEntry, WidgetSlot } from '@/api/dashboard-layouts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Reorder and show/hide dashboard widgets. Order is the list order; visibility
 * is the eye toggle. Saves the whole arrangement back as the user's layout.
 */
export function CustomizeDashboardDialog({
  open,
  onOpenChange,
  layout,
  catalog,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: WidgetSlot[];
  catalog: WidgetCatalogEntry[];
  onSave: (widgets: WidgetSlot[]) => Promise<void>;
  isSaving: boolean;
}) {
  const [slots, setSlots] = useState<WidgetSlot[]>(layout);

  useEffect(() => {
    if (open) setSlots(layout);
  }, [open, layout]);

  const label = (key: string) => catalog.find((c) => c.key === key)?.label ?? key;

  function move(i: number, dir: -1 | 1) {
    setSlots((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function toggle(i: number) {
    setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, visible: !s.visible } : s)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          {slots.map((s, i) => (
            <div key={s.key} className={`flex items-center gap-2 rounded-lg border border-(--border-subtle) px-3 py-2 ${s.visible ? '' : 'opacity-60'}`}>
              <span className="flex-1 text-sm text-(--text-primary)">{label(s.key)}</span>
              <button type="button" className="text-(--text-tertiary) hover:text-(--text-primary) disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" className="text-(--text-tertiary) hover:text-(--text-primary) disabled:opacity-30" disabled={i === slots.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button type="button" className="text-(--text-tertiary) hover:text-accent-500" onClick={() => toggle(i)} aria-label={s.visible ? 'Hide' : 'Show'}>
                {s.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={isSaving} onClick={() => onSave(slots)}>{isSaving ? 'Saving…' : 'Save layout'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
