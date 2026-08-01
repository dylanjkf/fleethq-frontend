import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { listAssetCategories } from '@/api/asset-classes';
import { listAssets } from '@/api/assets';
import type { ChecklistTemplate } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PickerError } from '@/components/ui/picker-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const itemSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Required').max(200),
  type: z.enum(['pass_fail', 'pass_fail_na', 'text']),
  requireNoteOnFail: z.boolean(),
  createsFaultOnFail: z.boolean(),
});

const schema = z.object({
  name: z.string().min(1, 'Required').max(200),
  appliesToAssetClass: z.string(),
  assignedAssetIds: z.array(z.string()),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});
export type ChecklistTemplateFormValues = z.infer<typeof schema>;

function newItem(): ChecklistTemplateFormValues['items'][number] {
  return { id: crypto.randomUUID(), label: '', type: 'pass_fail', requireNoteOnFail: false, createsFaultOnFail: false };
}

interface ChecklistTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ChecklistTemplate;
  onSubmit: (values: ChecklistTemplateFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function ChecklistTemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
  isSubmitting,
}: ChecklistTemplateFormDialogProps) {
  const form = useForm<ChecklistTemplateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', appliesToAssetClass: 'LAND', assignedAssetIds: [], items: [newItem()] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const categoriesQuery = useQuery({ queryKey: ['asset-categories'], queryFn: () => listAssetCategories(), enabled: open });
  const categories = categoriesQuery.data?.items ?? [];
  const assetsQuery = useQuery({ queryKey: ['assets', 'for-checklist-assign'], queryFn: () => listAssets({ pageSize: 200 }), enabled: open });
  const assets = (assetsQuery.data?.items ?? []).filter((a) => !a.archivedAt);
  const assignedAssetIds = form.watch('assignedAssetIds');

  useEffect(() => {
    if (open) {
      form.reset({
        name: template?.name ?? '',
        appliesToAssetClass: template?.appliesToAssetClass?.key ?? (template ? 'ANY' : 'LAND'),
        assignedAssetIds: template?.assignments?.map((a) => a.assetId) ?? [],
        items:
          template?.items && template.items.length > 0
            ? template.items.map((i) => ({
                id: i.id,
                label: i.label,
                type: i.type,
                requireNoteOnFail: i.requireNoteOnFail,
                createsFaultOnFail: i.createsFaultOnFail,
              }))
            : [newItem()],
      });
    }
  }, [open, template, form]);

  function toggleAssignedAsset(assetId: string, checked: boolean) {
    const current = form.getValues('assignedAssetIds');
    form.setValue(
      'assignedAssetIds',
      checked ? [...current, assetId] : current.filter((id) => id !== assetId),
      { shouldDirty: true },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit checklist template' : 'New checklist template'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
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
                    <Input placeholder="e.g. Daily Pre-Start" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="appliesToAssetClass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Applies to</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ANY">Any category</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.key}>
                          {c.name}{c.isBuiltIn ? '' : ' (custom)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <PickerError query={categoriesQuery} noun="categories" />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Assign to specific assets</Label>
              <p className="text-xs text-(--text-tertiary)">
                Assigned once, it applies to these assets every day — on top of the category rule above. Leave blank to
                rely on the category.
              </p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-(--border-subtle) p-2">
                {assetsQuery.isLoading ? (
                  <p className="p-1 text-sm text-(--text-tertiary)">Loading assets…</p>
                ) : assetsQuery.isError ? (
                  <div className="p-1">
                    <PickerError query={assetsQuery} noun="assets" />
                  </div>
                ) : assets.length === 0 ? (
                  <p className="p-1 text-sm text-(--text-tertiary)">No assets yet.</p>
                ) : (
                  assets.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-(--surface-2)">
                      <Checkbox
                        checked={assignedAssetIds.includes(a.id)}
                        onCheckedChange={(checked) => toggleAssignedAsset(a.id, checked === true)}
                      />
                      {a.name}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Checklist items</Label>
                <Button type="button" variant="secondary" size="sm" onClick={() => append(newItem())}>
                  <Plus className="h-4 w-4" /> Add item
                </Button>
              </div>
              {form.formState.errors.items?.root && (
                <p className="text-sm text-danger-500">{form.formState.errors.items.root.message}</p>
              )}

              {fields.map((fieldItem, index) => (
                <div key={fieldItem.id} className="space-y-3 rounded-lg border border-(--border-subtle) p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2 w-5 text-sm text-(--text-tertiary)">{index + 1}.</span>
                    <FormField
                      control={form.control}
                      name={`items.${index}.label`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="What the operator checks (e.g. Tyres undamaged)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 pl-7">
                    <FormField
                      control={form.control}
                      name={`items.${index}.type`}
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 w-44">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pass_fail">Pass / Fail</SelectItem>
                              <SelectItem value="pass_fail_na">Pass / Fail / N/A</SelectItem>
                              <SelectItem value="text">Written answer</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    {/* The fail-driven options only make sense for pass/fail items. */}
                    {form.watch(`items.${index}.type`) !== 'text' && (
                      <>
                        <FormField
                          control={form.control}
                          name={`items.${index}.requireNoteOnFail`}
                          render={({ field }) => (
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              Note required on fail
                            </label>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.createsFaultOnFail`}
                          render={({ field }) => (
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              Raise workshop job on fail
                            </label>
                          )}
                        />
                      </>
                    )}
                    {form.watch(`items.${index}.type`) === 'text' && (
                      <span className="text-xs text-(--text-tertiary)">Operator types an answer</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : template ? 'Save changes' : 'Create template'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
