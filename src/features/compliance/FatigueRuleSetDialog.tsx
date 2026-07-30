import { useEffect, useState } from 'react';
import type { FatigueRuleSet, FatigueRuleSetInput } from '@/api/fatigue-rule-sets';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleSet?: FatigueRuleSet;
  /** Preset values (built-in AU defaults) to seed a brand-new set. */
  preset?: Omit<FatigueRuleSetInput, 'isDefault'>;
  onSubmit: (values: FatigueRuleSetInput) => Promise<void>;
  isSubmitting: boolean;
}

/** Edit hours as decimals in the UI; store minutes on the wire. */
function toHours(min: number): string {
  return String(+(min / 60).toFixed(2));
}
function toMin(hours: string): number {
  return Math.round(Number(hours) * 60);
}

/**
 * Create or edit a fatigue rule set — the four work/rest limits plus the
 * "approaching" warning margin. Values are entered in hours for readability
 * and converted to minutes for the API.
 */
export function FatigueRuleSetDialog({ open, onOpenChange, ruleSet, preset, onSubmit, isSubmitting }: Props) {
  const isEdit = !!ruleSet;
  const [name, setName] = useState('');
  const [maxWork24h, setMaxWork24h] = useState('12');
  const [minRest24h, setMinRest24h] = useState('7');
  const [maxWork7d, setMaxWork7d] = useState('72');
  const [minRest7d, setMinRest7d] = useState('24');
  const [buffer, setBuffer] = useState('1');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (open) {
      const src = ruleSet ?? preset;
      setName(ruleSet?.name ?? '');
      setMaxWork24h(toHours(src?.maxWork24hMin ?? 720));
      setMinRest24h(toHours(src?.minRest24hMin ?? 420));
      setMaxWork7d(toHours(src?.maxWork7dMin ?? 4320));
      setMinRest7d(toHours(src?.minRest7dMin ?? 1440));
      setBuffer(toHours(src?.approachingBufferMin ?? 60));
      setIsDefault(ruleSet?.isDefault ?? false);
    }
  }, [open, ruleSet, preset]);

  const canSubmit = name.trim().length > 0;

  async function submit() {
    if (!canSubmit) return;
    await onSubmit({
      name: name.trim(),
      maxWork24hMin: toMin(maxWork24h),
      minRest24hMin: toMin(minRest24h),
      maxWork7dMin: toMin(maxWork7d),
      minRest7dMin: toMin(minRest7d),
      approachingBufferMin: toMin(buffer),
      isDefault,
    });
    onOpenChange(false);
  }

  const field = (id: string, label: string, value: string, set: (v: string) => void, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" step="0.25" min="0" value={value} onChange={(e) => set(e.target.value)} />
      {hint && <p className="text-xs text-(--text-tertiary)">{hint}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit fatigue rule set' : 'New fatigue rule set'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="frs-name">Name</Label>
            <Input id="frs-name" placeholder="e.g. Night shift — strict" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('frs-mw24', 'Max work / 24h (hours)', maxWork24h, setMaxWork24h)}
            {field('frs-mr24', 'Min rest / 24h (hours)', minRest24h, setMinRest24h)}
            {field('frs-mw7', 'Max work / 7 days (hours)', maxWork7d, setMaxWork7d)}
            {field('frs-mr7', 'Min rest / 7 days (hours)', minRest7d, setMinRest7d)}
          </div>
          {field('frs-buf', 'Warn when within (hours)', buffer, setBuffer, 'How close to a limit before an operator shows as “approaching”.')}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 accent-accent-500" />
            Make this the company default (applies to operators with no rule set assigned)
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={isSubmitting || !canSubmit} onClick={submit}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create rule set'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
