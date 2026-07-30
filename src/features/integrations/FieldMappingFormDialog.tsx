import { useEffect, useState } from 'react';
import type { FieldMappingInput, IntegrationFieldMapping, IntegrationTransform, TargetEntity } from '@/api/integrations';
import { TARGET_ENTITY_FIELDS } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const TRANSFORMS: { value: IntegrationTransform; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'UPPERCASE', label: 'Uppercase' },
  { value: 'LOWERCASE', label: 'Lowercase' },
  { value: 'TRIM', label: 'Trim whitespace' },
  { value: 'DATE_FORMAT', label: 'Date format' },
  { value: 'UNIT_CONVERSION', label: 'Unit conversion' },
  { value: 'DEFAULT_VALUE', label: 'Default value' },
  { value: 'LOOKUP_TABLE', label: 'Lookup table' },
];

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const UNITS = ['lb', 'kg', 'mi', 'km'];

interface FieldMappingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping?: IntegrationFieldMapping;
  targetEntity: TargetEntity;
  nextOrder: number;
  isSubmitting: boolean;
  onSubmit: (input: FieldMappingInput) => Promise<void>;
}

/** One row of the Data Mapping Designer: external column -> FleetHQ field, with an optional transform. */
export function FieldMappingFormDialog({ open, onOpenChange, mapping, targetEntity, nextOrder, isSubmitting, onSubmit }: FieldMappingFormDialogProps) {
  const [externalField, setExternalField] = useState('');
  const [fleetField, setFleetField] = useState('');
  const [customFleetField, setCustomFleetField] = useState(false);
  const [transform, setTransform] = useState<IntegrationTransform>('NONE');
  const [isRequired, setIsRequired] = useState(false);
  const [order, setOrder] = useState(0);
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [unitFrom, setUnitFrom] = useState('lb');
  const [unitTo, setUnitTo] = useState('kg');
  const [defaultValue, setDefaultValue] = useState('');
  const [lookupEntries, setLookupEntries] = useState('');
  const [lookupDefault, setLookupDefault] = useState('');

  const knownFields = TARGET_ENTITY_FIELDS[targetEntity];

  useEffect(() => {
    if (!open) return;
    setExternalField(mapping?.externalField ?? '');
    setFleetField(mapping?.fleetField ?? knownFields[0] ?? '');
    setCustomFleetField(!!mapping && !knownFields.includes(mapping.fleetField));
    setTransform(mapping?.transform ?? 'NONE');
    setIsRequired(mapping?.isRequired ?? false);
    setOrder(mapping?.order ?? nextOrder);
    const config = mapping?.transformConfig ?? {};
    setDateFormat(typeof config.format === 'string' ? config.format : 'YYYY-MM-DD');
    setUnitFrom(typeof config.from === 'string' ? config.from : 'lb');
    setUnitTo(typeof config.to === 'string' ? config.to : 'kg');
    setDefaultValue(typeof config.value === 'string' ? config.value : '');
    const entries = (config.entries as Record<string, unknown> | undefined) ?? {};
    setLookupEntries(Object.entries(entries).map(([k, v]) => `${k}=${v}`).join('\n'));
    setLookupDefault(typeof config.default === 'string' ? config.default : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mapping]);

  function buildTransformConfig(): Record<string, unknown> | undefined {
    switch (transform) {
      case 'DATE_FORMAT':
        return { format: dateFormat };
      case 'UNIT_CONVERSION':
        return { from: unitFrom, to: unitTo };
      case 'DEFAULT_VALUE':
        return { value: defaultValue };
      case 'LOOKUP_TABLE': {
        const entries: Record<string, string> = {};
        for (const line of lookupEntries.split('\n')) {
          const [key, ...rest] = line.split('=');
          if (key?.trim() && rest.length > 0) entries[key.trim()] = rest.join('=').trim();
        }
        return { entries, default: lookupDefault || undefined };
      }
      default:
        return undefined;
    }
  }

  const isEditing = !!mapping;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit field mapping' : 'New field mapping'}</DialogTitle>
          <DialogDescription>Maps one external column to one FleetHQ field, with an optional transform.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="ext-field">External field</Label>
            <Input id="ext-field" placeholder="e.g. CustomerName" value={externalField} onChange={(e) => setExternalField(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>FleetHQ field</Label>
            {customFleetField ? (
              <Input placeholder="Custom field name" value={fleetField} onChange={(e) => setFleetField(e.target.value)} />
            ) : (
              <Select value={fleetField} onValueChange={(v) => setFleetField(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {knownFields.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button type="button" className="text-xs text-accent-600 hover:underline" onClick={() => setCustomFleetField((v) => !v)}>
              {customFleetField ? 'Pick from known fields instead' : "Don't see it? Type a field name manually"}
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Transform</Label>
            <Select value={transform} onValueChange={(v) => setTransform(v as IntegrationTransform)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSFORMS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {transform === 'DATE_FORMAT' && (
            <div className="space-y-1.5">
              <Label>Source date format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {transform === 'UNIT_CONVERSION' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From unit</Label>
                <Select value={unitFrom} onValueChange={setUnitFrom}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>To unit</Label>
                <Select value={unitTo} onValueChange={setUnitTo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="col-span-2 text-xs text-(--text-tertiary)">Small fixed table (lb↔kg, mi↔km) — not exhaustive.</p>
            </div>
          )}

          {transform === 'DEFAULT_VALUE' && (
            <div className="space-y-1.5">
              <Label htmlFor="default-value">Default value (used when the source is empty)</Label>
              <Input id="default-value" value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} />
            </div>
          )}

          {transform === 'LOOKUP_TABLE' && (
            <div className="space-y-2">
              <Label htmlFor="lookup-entries">Lookup entries — one per line, "external=fleet"</Label>
              <Textarea id="lookup-entries" rows={4} placeholder={'Y=true\nN=false'} value={lookupEntries} onChange={(e) => setLookupEntries(e.target.value)} />
              <Label htmlFor="lookup-default">Default (used when no entry matches)</Label>
              <Input id="lookup-default" value={lookupDefault} onChange={(e) => setLookupDefault(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mapping-order">Order</Label>
              <Input id="mapping-order" type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
            </div>
            <div className="flex items-end justify-between rounded-lg border border-(--border-subtle) p-2">
              <div>
                <p className="text-sm font-medium text-(--text-primary)">Required</p>
              </div>
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isSubmitting || !externalField.trim() || !fleetField.trim()}
            onClick={() =>
              onSubmit({
                externalField: externalField.trim(),
                fleetField: fleetField.trim(),
                transform,
                transformConfig: buildTransformConfig(),
                isRequired,
                order,
              })
            }
          >
            {isSubmitting ? 'Saving…' : isEditing ? 'Save' : 'Add mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
