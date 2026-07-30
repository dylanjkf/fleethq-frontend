import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import {
  archiveFieldMapping,
  archiveSearchableField,
  createFieldMapping,
  createSearchableField,
  getBarcodeConfig,
  updateBarcodeConfig,
  updateFieldMapping,
  updateSearchableField,
  type BarcodeFieldMapping,
  type BarcodeFieldTarget,
  type BarcodeScanMode,
  type BarcodeSearchableField,
} from '@/api/barcode';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

const KEY = ['barcode-config'];

const SCAN_MODES: { value: BarcodeScanMode; label: string; description: string }[] = [
  { value: 'DATABASE_LOOKUP', label: 'Database lookup', description: 'The barcode is only an identifier — every other field comes from an existing matching record.' },
  { value: 'ENCODED_BARCODE', label: 'Encoded barcode', description: 'The barcode payload itself carries the fields (JSON or key:value pairs).' },
  { value: 'HYBRID', label: 'Hybrid', description: 'Decode what the barcode contains, then look up a database match for anything it didn’t.' },
];

const FIELD_TARGETS: { value: BarcodeFieldTarget; label: string }[] = [
  { value: 'TRACKING_NUMBER', label: 'Tracking Number' },
  { value: 'CONSIGNMENT_NUMBER', label: 'Consignment Number' },
  { value: 'MANIFEST_NUMBER', label: 'Manifest Number' },
  { value: 'INTERNAL_ID', label: 'Internal ID' },
  { value: 'CUSTOMER_REFERENCE', label: 'Customer Reference' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'DELIVERY_ADDRESS', label: 'Delivery Address' },
  { value: 'CONTACT', label: 'Contact' },
  { value: 'DELIVERY_NOTES', label: 'Delivery Notes' },
  { value: 'SERVICE_TYPE', label: 'Service Type' },
  { value: 'PARCEL_COUNT', label: 'Parcel Count' },
  { value: 'WEIGHT', label: 'Weight' },
  { value: 'CUBIC', label: 'Cubic' },
  { value: 'DANGEROUS_GOODS', label: 'Dangerous Goods' },
  { value: 'CUSTOM_FIELD', label: 'Custom Field' },
];

function targetLabel(t: string): string {
  return FIELD_TARGETS.find((f) => f.value === t)?.label ?? t;
}

/**
 * Admin config for configurable barcode scanning: overall scan mode/behaviour,
 * the fields a scan searches (built-in StopParcel columns + custom
 * customFields keys), and the rules that populate other fields once a scan
 * resolves. See apps/fleethq/src/features/dispatch/BarcodeScanInput.tsx for
 * where all this is actually exercised during a run.
 */
export function BarcodeConfigTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: KEY, queryFn: getBarcodeConfig });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const [fieldEditorOpen, setFieldEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<BarcodeSearchableField | undefined>();
  const [archivingField, setArchivingField] = useState<BarcodeSearchableField | undefined>();
  const [mappingEditorOpen, setMappingEditorOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<BarcodeFieldMapping | undefined>();
  const [archivingMapping, setArchivingMapping] = useState<BarcodeFieldMapping | undefined>();

  const configM = useMutation({
    mutationFn: updateBarcodeConfig,
    onSuccess: () => { invalidate(); toast({ title: 'Scan settings saved', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not save', description: describeApiError(e), variant: 'destructive' }),
  });

  const createFieldM = useMutation({
    mutationFn: createSearchableField,
    onSuccess: () => { invalidate(); toast({ title: 'Searchable field added', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not add field', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateFieldM = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { label?: string; order?: number } }) => updateSearchableField(id, input),
    onSuccess: () => { invalidate(); toast({ title: 'Field updated', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not update field', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveFieldM = useMutation({
    mutationFn: archiveSearchableField,
    onSuccess: () => { invalidate(); setArchivingField(undefined); toast({ title: 'Field archived', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not archive field', description: describeApiError(e), variant: 'destructive' }),
  });

  const createMappingM = useMutation({
    mutationFn: createFieldMapping,
    onSuccess: () => { invalidate(); toast({ title: 'Mapping added', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not add mapping', description: describeApiError(e), variant: 'destructive' }),
  });
  const updateMappingM = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateFieldMapping>[1] }) => updateFieldMapping(id, input),
    onSuccess: () => { invalidate(); toast({ title: 'Mapping updated', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not update mapping', description: describeApiError(e), variant: 'destructive' }),
  });
  const archiveMappingM = useMutation({
    mutationFn: archiveFieldMapping,
    onSuccess: () => { invalidate(); setArchivingMapping(undefined); toast({ title: 'Mapping archived', variant: 'success' }); },
    onError: (e) => toast({ title: 'Could not archive mapping', description: describeApiError(e), variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }
  if (isError || !data) {
    return <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />;
  }

  const { scanConfig, searchableFields, fieldMappings } = data;
  const sourceOptions = ['scan', ...searchableFields.map((f) => f.key)];

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-(--border-subtle) bg-(--surface-0)/80 p-4 elevation-1">
        <h3 className="font-medium text-(--text-primary)">Scan behaviour</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {SCAN_MODES.map((m) => (
            <label
              key={m.value}
              className={`cursor-pointer rounded-lg border p-3 text-sm ${scanConfig.scanMode === m.value ? 'border-accent-500 bg-accent-100/40' : 'border-(--border-subtle)'}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scanMode"
                  className="h-4 w-4 accent-accent-500"
                  checked={scanConfig.scanMode === m.value}
                  onChange={() => configM.mutate({ scanMode: m.value })}
                />
                <span className="font-medium">{m.label}</span>
              </div>
              <p className="mt-1 text-xs text-(--text-tertiary)">{m.description}</p>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-6 pt-1">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={scanConfig.allowManualEntry} onCheckedChange={(v) => configM.mutate({ allowManualEntry: v })} />
            Allow manual entry
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={scanConfig.blockOnMissingFields} onCheckedChange={(v) => configM.mutate({ blockOnMissingFields: v })} />
            Block on missing required fields
          </label>
        </div>
        {scanConfig.blockOnMissingFields && (
          <div className="space-y-1.5 pt-1">
            <Label>Required fields</Label>
            <div className="flex flex-wrap gap-2">
              {FIELD_TARGETS.filter((f) => f.value !== 'CUSTOM_FIELD').map((f) => {
                const checked = scanConfig.requiredFields.includes(f.value);
                return (
                  <label key={f.value} className="flex items-center gap-1.5 rounded-full border border-(--border-subtle) px-2 py-1 text-xs">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-accent-500"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...scanConfig.requiredFields, f.value]
                          : scanConfig.requiredFields.filter((v) => v !== f.value);
                        configM.mutate({ requiredFields: next });
                      }}
                    />
                    {f.label}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-(--text-primary)">Searchable fields</h3>
          <Button size="sm" onClick={() => { setEditingField(undefined); setFieldEditorOpen(true); }}>
            <Plus className="h-4 w-4" /> Add field
          </Button>
        </div>
        <div className="space-y-2">
          {searchableFields.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-(--border-subtle) p-3 text-sm">
              <div>
                <span className="font-medium">{f.label}</span>
                <span className="ml-2 text-(--text-tertiary)">key: {f.key}</span>
                {f.isCustom && <Badge variant="accent" className="ml-2">Custom field</Badge>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditingField(f); setFieldEditorOpen(true); }}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setArchivingField(f)}>Archive</Button>
              </div>
            </div>
          ))}
          {searchableFields.length === 0 && <p className="text-sm text-(--text-tertiary)">No searchable fields yet.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-(--text-primary)">Field mappings</h3>
          <Button size="sm" onClick={() => { setEditingMapping(undefined); setMappingEditorOpen(true); }}>
            <Plus className="h-4 w-4" /> Add mapping
          </Button>
        </div>
        <div className="space-y-2">
          {fieldMappings.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-(--border-subtle) p-3 text-sm">
              <div>
                <span className="font-medium">{m.sourceField}</span>
                <span className="mx-2 text-(--text-tertiary)">&rarr;</span>
                <span className="font-medium">
                  {targetLabel(m.targetField)}
                  {m.targetField === 'CUSTOM_FIELD' && m.customFieldKey ? ` (${m.customFieldKey})` : ''}
                </span>
                {m.isDatabaseLookup && <Badge variant="accent" className="ml-2">Database lookup</Badge>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditingMapping(m); setMappingEditorOpen(true); }}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setArchivingMapping(m)}>Archive</Button>
              </div>
            </div>
          ))}
          {fieldMappings.length === 0 && (
            <p className="text-sm text-(--text-tertiary)">
              No field mappings yet — without one, a matched scan won’t auto-populate anything beyond the match itself.
            </p>
          )}
        </div>
      </section>

      <SearchableFieldEditor
        open={fieldEditorOpen}
        onOpenChange={setFieldEditorOpen}
        field={editingField}
        isSubmitting={createFieldM.isPending || updateFieldM.isPending}
        onSubmit={async (v) => {
          if (editingField) await updateFieldM.mutateAsync({ id: editingField.id, input: { label: v.label, order: v.order } });
          else await createFieldM.mutateAsync(v);
        }}
      />
      <FieldMappingEditor
        open={mappingEditorOpen}
        onOpenChange={setMappingEditorOpen}
        mapping={editingMapping}
        sourceOptions={sourceOptions}
        isSubmitting={createMappingM.isPending || updateMappingM.isPending}
        onSubmit={async (v) => {
          if (editingMapping) await updateMappingM.mutateAsync({ id: editingMapping.id, input: v });
          else await createMappingM.mutateAsync(v);
        }}
      />

      <ConfirmDialog
        open={!!archivingField}
        onOpenChange={(o) => !o && setArchivingField(undefined)}
        title="Archive this searchable field?"
        description={`"${archivingField?.label ?? ''}" will no longer be searched or offered in mappings.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archivingField && archiveFieldM.mutate(archivingField.id)}
        isConfirming={archiveFieldM.isPending}
      />
      <ConfirmDialog
        open={!!archivingMapping}
        onOpenChange={(o) => !o && setArchivingMapping(undefined)}
        title="Archive this field mapping?"
        description="It will no longer populate its target field on future scans."
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archivingMapping && archiveMappingM.mutate(archivingMapping.id)}
        isConfirming={archiveMappingM.isPending}
      />
    </div>
  );
}

function SearchableFieldEditor({
  open,
  onOpenChange,
  field,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field?: BarcodeSearchableField;
  onSubmit: (values: { key: string; label: string; isCustom: boolean; order: number }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [order, setOrder] = useState(0);

  useEffect(() => {
    if (open) {
      setKey(field?.key ?? '');
      setLabel(field?.label ?? '');
      setIsCustom(field?.isCustom ?? false);
      setOrder(field?.order ?? 0);
    }
  }, [open, field]);

  const canSubmit = label.trim().length > 0 && (!!field || key.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{field ? 'Edit searchable field' : 'New searchable field'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {!field && (
            <div className="space-y-1.5">
              <Label htmlFor="bf-key">Key</Label>
              <Input id="bf-key" placeholder="e.g. poNumber" value={key} onChange={(e) => setKey(e.target.value)} />
              <p className="text-xs text-(--text-tertiary)">Alphanumeric/underscore only. Not a built-in StopParcel column? Mark it Custom below.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="bf-label">Label</Label>
            <Input id="bf-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          {!field && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-accent-500" checked={isCustom} onChange={(e) => setIsCustom(e.target.checked)} />
              Custom field (keys into StopParcel.customFields rather than a built-in column)
            </label>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="bf-order">Order</Label>
            <Input id="bf-order" type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!canSubmit || isSubmitting}
            onClick={async () => {
              await onSubmit({ key: key.trim(), label: label.trim(), isCustom, order });
              onOpenChange(false);
            }}
          >
            {isSubmitting ? 'Saving…' : field ? 'Save changes' : 'Add field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldMappingEditor({
  open,
  onOpenChange,
  mapping,
  sourceOptions,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping?: BarcodeFieldMapping;
  sourceOptions: string[];
  onSubmit: (values: { sourceField: string; targetField: BarcodeFieldTarget; customFieldKey?: string; isDatabaseLookup: boolean; order: number }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [sourceField, setSourceField] = useState('scan');
  const [targetField, setTargetField] = useState<BarcodeFieldTarget>('TRACKING_NUMBER');
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [isDatabaseLookup, setIsDatabaseLookup] = useState(false);
  const [order, setOrder] = useState(0);

  useEffect(() => {
    if (open) {
      setSourceField(mapping?.sourceField ?? sourceOptions[0] ?? 'scan');
      setTargetField(mapping?.targetField ?? 'TRACKING_NUMBER');
      setCustomFieldKey(mapping?.customFieldKey ?? '');
      setIsDatabaseLookup(mapping?.isDatabaseLookup ?? false);
      setOrder(mapping?.order ?? 0);
    }
  }, [open, mapping, sourceOptions]);

  const needsCustomKey = targetField === 'CUSTOM_FIELD';
  const canSubmit = sourceField.trim().length > 0 && (!needsCustomKey || customFieldKey.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mapping ? 'Edit field mapping' : 'New field mapping'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Source field</Label>
            <Select value={sourceField} onValueChange={setSourceField}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sourceOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s === 'scan' ? 'Raw/decoded scan payload (scan)' : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Target field</Label>
            <Select value={targetField} onValueChange={(v) => setTargetField(v as BarcodeFieldTarget)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TARGETS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsCustomKey && (
            <div className="space-y-1.5">
              <Label htmlFor="bm-custom-key">Custom field key</Label>
              <Input id="bm-custom-key" placeholder="e.g. poNumber" value={customFieldKey} onChange={(e) => setCustomFieldKey(e.target.value)} />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isDatabaseLookup} onCheckedChange={setIsDatabaseLookup} />
            Database lookup (pull the value from the matched existing parcel, rather than copying the scanned value directly)
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="bm-order">Order</Label>
            <Input id="bm-order" type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!canSubmit || isSubmitting}
            onClick={async () => {
              await onSubmit({ sourceField, targetField, customFieldKey: needsCustomKey ? customFieldKey.trim() : undefined, isDatabaseLookup, order });
              onOpenChange(false);
            }}
          >
            {isSubmitting ? 'Saving…' : mapping ? 'Save changes' : 'Add mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
