import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { z } from 'zod';
import { listAssetCategories } from '@/api/asset-classes';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AUSTRALIAN_VEHICLE_MAKES, modelsForMake, vehicleYearOptions } from '@/features/assets/australian-vehicles';
import type { Asset } from '@/api/types';
import type { CreateAssetInput } from '@/api/assets';

const CURRENT_YEAR = new Date().getFullYear();

const schema = z.object({
  name: z.string().min(1, 'Required').max(200),
  externalReference: z.string().max(200).optional(),
  emergencyContact: z.string().max(200).optional(),
  make: z.string().max(120).optional(),
  model: z.string().max(120).optional(),
  year: z.string().optional(),
  vin: z.string().max(64).optional(),
  registration: z.string().max(64).optional(),
  odometer: z.string().optional(),
  odometerUnit: z.string().max(16).optional(),
});
type FormShape = z.infer<typeof schema>;

/** What the dialog hands back — the fields the create/update endpoints accept. */
export type AssetFormValues = Omit<CreateAssetInput, 'assetClass'>;

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Asset;
  onSubmit: (values: AssetFormValues) => Promise<void>;
  isSubmitting: boolean;
}

interface CustomField {
  key: string;
  value: string;
}

export function AssetFormDialog({ open, onOpenChange, asset, onSubmit, isSubmitting }: AssetFormDialogProps) {
  const form = useForm<FormShape>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', externalReference: '', emergencyContact: '', make: '', model: '', year: '', vin: '', registration: '', odometer: '', odometerUnit: 'km' },
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const categoriesQuery = useQuery({ queryKey: ['asset-categories'], queryFn: () => listAssetCategories(), enabled: open });
  const categories = categoriesQuery.data?.items ?? [];

  useEffect(() => {
    if (open) {
      setCategoryId(asset?.assetClassId ?? '');
      form.reset({
        name: asset?.name ?? '',
        externalReference: asset?.externalReference ?? '',
        emergencyContact: asset?.emergencyContact ?? '',
        make: asset?.make ?? '',
        model: asset?.model ?? '',
        year: asset?.year != null ? String(asset.year) : '',
        vin: asset?.vin ?? '',
        registration: asset?.registration ?? '',
        odometer: asset?.odometer != null ? String(asset.odometer) : '',
        odometerUnit: asset?.odometerUnit ?? 'km',
      });
      setCustomFields(
        asset?.customFields
          ? Object.entries(asset.customFields).map(([key, value]) => ({ key, value: value == null ? '' : String(value) }))
          : [],
      );
    }
  }, [open, asset, form]);

  const num = (s?: string) => {
    const t = s?.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  };

  // Quick-fill drives the free-text make/model/year fields; watching them keeps
  // the dropdowns in sync whether the value came from a pick or was typed.
  const watchedMake = form.watch('make') ?? '';
  const watchedModel = form.watch('model') ?? '';
  const watchedYear = form.watch('year') ?? '';
  const knownMake = AUSTRALIAN_VEHICLE_MAKES.includes(watchedMake) ? watchedMake : '';
  const makeModels = knownMake ? modelsForMake(knownMake) : [];
  const knownModel = makeModels.includes(watchedModel) ? watchedModel : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit asset' : 'New asset'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              const cleanCustom = customFields
                .filter((f) => f.key.trim())
                .reduce<Record<string, unknown>>((acc, f) => ({ ...acc, [f.key.trim()]: f.value }), {});
              await onSubmit({
                name: values.name,
                assetClassId: categoryId || undefined,
                externalReference: values.externalReference || undefined,
                emergencyContact: values.emergencyContact || undefined,
                make: values.make || undefined,
                model: values.model || undefined,
                year: num(values.year),
                vin: values.vin || undefined,
                registration: values.registration || undefined,
                odometer: num(values.odometer),
                odometerUnit: values.odometerUnit || undefined,
                customFields: cleanCustom,
              });
              onOpenChange(false);
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Truck 12, rego ABC123" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={categories.length ? 'Select a category' : 'Land (default)'} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.isBuiltIn ? '' : ' (custom)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-(--text-tertiary)">Manage categories under Fleet → Categories.</p>
            </div>

            {/* Quick-fill from the Australian vehicle list — populates make / model / year below. */}
            <div className="rounded-lg border border-(--border-subtle) bg-(--surface-1) p-3">
              <Label>Quick-fill vehicle (Australian market)</Label>
              <p className="mb-2 text-xs text-(--text-tertiary)">Pick a make and model to fill the fields below — or just type them in for anything not listed.</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Select
                  value={knownMake || undefined}
                  onValueChange={(v) => {
                    form.setValue('make', v, { shouldDirty: true });
                    form.setValue('model', '', { shouldDirty: true });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Make" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {AUSTRALIAN_VEHICLE_MAKES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={knownModel || undefined}
                  disabled={makeModels.length === 0}
                  onValueChange={(v) => form.setValue('model', v, { shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder={knownMake ? 'Model' : 'Pick a make first'} /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {makeModels.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={watchedYear || undefined}
                  onValueChange={(v) => form.setValue('year', v, { shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {vehicleYearOptions(CURRENT_YEAR).map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel>Make</FormLabel><FormControl><Input placeholder="e.g. Isuzu" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="e.g. NPR 45-150" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="year" render={({ field }) => (<FormItem><FormLabel>Year</FormLabel><FormControl><Input inputMode="numeric" placeholder="e.g. 2021" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="registration" render={({ field }) => (<FormItem><FormLabel>Registration</FormLabel><FormControl><Input placeholder="e.g. ABC123" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="vin" render={({ field }) => (<FormItem><FormLabel>VIN</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <div className="grid grid-cols-[1fr_80px] gap-2">
                <FormField control={form.control} name="odometer" render={({ field }) => (<FormItem><FormLabel>Odometer</FormLabel><FormControl><Input inputMode="numeric" placeholder="e.g. 84000" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="odometerUnit" render={({ field }) => (<FormItem><FormLabel>Unit</FormLabel><FormControl><Input placeholder="km" {...field} /></FormControl></FormItem>)} />
              </div>
            </div>

            <FormField
              control={form.control}
              name="externalReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External reference (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Fleet number, asset tag, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emergencyContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emergency contact (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Fleet Office: 1300 555 000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Custom fields (optional)</Label>
              <p className="text-xs text-(--text-tertiary)">Add any extra fields your fleet tracks — e.g. tyre size, GVM, insurer.</p>
              {customFields.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Field name"
                    value={f.key}
                    onChange={(e) => setCustomFields((prev) => prev.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                  />
                  <Input
                    placeholder="Value"
                    value={f.value}
                    onChange={(e) => setCustomFields((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  />
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove custom field" onClick={() => setCustomFields((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={() => setCustomFields((prev) => [...prev, { key: '', value: '' }])}>
                + Add field
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : asset ? 'Save changes' : 'Create asset'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
