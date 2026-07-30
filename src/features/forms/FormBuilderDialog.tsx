import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import type { FormField as FormFieldModel, FormTargetContext, FormTemplate } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DocumentPicker } from '@/features/documents/DocumentPicker';

const FIELD_TYPES = ['text', 'number', 'single_select', 'multi_select', 'date', 'asset_ref', 'operator_ref'] as const;
const FIELD_TYPE_LABEL: Record<(typeof FIELD_TYPES)[number], string> = {
  text: 'Text',
  number: 'Number',
  single_select: 'Single select',
  multi_select: 'Multi select',
  date: 'Date',
  asset_ref: 'Asset reference',
  operator_ref: 'Operator reference',
};
const SELECT_TYPES = new Set(['single_select', 'multi_select']);
const NO_CONDITION = '__none__';

const fieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Required').max(200),
  type: z.enum(FIELD_TYPES),
  required: z.boolean(),
  /** Raw comma-separated editing input — converted to `options: string[]` on submit. */
  optionsText: z.string().optional(),
  showIfFieldId: z.string(),
  showIfValue: z.string().optional(),
});

const schema = z.object({
  name: z.string().min(1, 'Required').max(200),
  description: z.string().max(1000).optional(),
  targetContext: z.enum(['DRIVER', 'OFFICE', 'BOTH']),
  fields: z.array(fieldSchema).min(1, 'Add at least one field'),
  /** Empty string means "none" — kept as a string so the form control stays controlled. */
  referenceDocumentId: z.string(),
});
type FormValues = z.infer<typeof schema>;

function newField(): FormValues['fields'][number] {
  return { id: crypto.randomUUID(), label: '', type: 'text', required: false, optionsText: '', showIfFieldId: NO_CONDITION, showIfValue: '' };
}

function splitOptions(text?: string): string[] {
  return (text ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface FormBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: FormTemplate;
  onSubmit: (values: {
    name: string;
    description?: string;
    targetContext: FormTargetContext;
    fields: FormFieldModel[];
    referenceDocumentId: string | null;
  }) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * 01-Product/Universal_Forms.md's "drag-and-drop form builder" — built as
 * add/remove/reorder-via-buttons instead of literal drag-and-drop, the same
 * scope decision this codebase already made for Dispatch's stop reorder.
 * "Conditional logic" here is a single-level show/hide (a field's visibility
 * gated on one earlier field's value), not a branching tree — see the doc's
 * own Implementation notes.
 */
export function FormBuilderDialog({ open, onOpenChange, template, onSubmit, isSubmitting }: FormBuilderDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', targetContext: 'BOTH', fields: [newField()], referenceDocumentId: '' },
  });
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: 'fields' });
  const watchedFields = form.watch('fields');

  useEffect(() => {
    if (open) {
      form.reset({
        name: template?.name ?? '',
        description: template?.description ?? '',
        targetContext: template?.targetContext ?? 'BOTH',
        referenceDocumentId: template?.referenceDocumentId ?? '',
        fields:
          template?.fields && template.fields.length > 0
            ? template.fields.map((f) => ({
                id: f.id,
                label: f.label,
                type: f.type,
                required: f.required,
                optionsText: (f.options ?? []).join(', '),
                showIfFieldId: f.showIfFieldId ?? NO_CONDITION,
                showIfValue: f.showIfValue ?? '',
              }))
            : [newField()],
      });
    }
  }, [open, template, form]);

  async function handleSubmit(values: FormValues) {
    const mappedFields: FormFieldModel[] = values.fields.map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      required: f.required,
      options: SELECT_TYPES.has(f.type) ? splitOptions(f.optionsText) : null,
      showIfFieldId: f.showIfFieldId === NO_CONDITION ? null : f.showIfFieldId,
      showIfValue: f.showIfFieldId === NO_CONDITION ? null : (f.showIfValue?.trim() || null),
    }));
    await onSubmit({
      name: values.name,
      description: values.description,
      targetContext: values.targetContext,
      fields: mappedFields,
      // Null, not undefined, so clearing it actually detaches on an edit.
      referenceDocumentId: values.referenceDocumentId || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit form template' : 'New form template'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Incident Report" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="What this form is for" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned to</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BOTH">DriverOS and FleetHQ</SelectItem>
                      <SelectItem value="DRIVER">DriverOS only (operators)</SelectItem>
                      <SelectItem value="OFFICE">FleetHQ only (office)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referenceDocumentId"
              render={({ field }) => (
                <FormItem>
                  <DocumentPicker
                    id="form-reference-document"
                    label="Reference document (optional)"
                    hint="Shown to whoever fills this form in — the original paper version, a work instruction, a hazard sheet. Needs a connection to open, so don't put anything required to complete the form in it."
                    value={field.value || null}
                    onChange={(id) => field.onChange(id ?? '')}
                    selectedTitle={template?.referenceDocument?.title}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button type="button" variant="secondary" size="sm" onClick={() => append(newField())}>
                  <Plus className="h-4 w-4" /> Add field
                </Button>
              </div>
              {form.formState.errors.fields?.root && (
                <p className="text-sm text-danger-500">{form.formState.errors.fields.root.message}</p>
              )}

              {fields.map((fieldItem, index) => {
                const currentType = watchedFields?.[index]?.type;
                const earlierFields = watchedFields?.slice(0, index) ?? [];
                const hasCondition = watchedFields?.[index]?.showIfFieldId !== NO_CONDITION;
                return (
                  <div key={fieldItem.id} className="space-y-3 rounded-lg border border-(--border-subtle) p-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-2 w-5 text-sm text-(--text-tertiary)">{index + 1}.</span>
                      <FormField
                        control={form.control}
                        name={`fields.${index}.label`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Field label" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label="Move up">
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1} aria-label="Move down">
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} disabled={fields.length === 1} aria-label="Remove field">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pl-7">
                      <FormField
                        control={form.control}
                        name={`fields.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 w-48">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {FIELD_TYPES.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {FIELD_TYPE_LABEL[t]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`fields.${index}.required`}
                        render={({ field }) => (
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            Required
                          </label>
                        )}
                      />
                    </div>

                    {SELECT_TYPES.has(currentType ?? 'text') && (
                      <div className="pl-7">
                        <FormField
                          control={form.control}
                          name={`fields.${index}.optionsText`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Options (comma-separated)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Low, Medium, High" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {earlierFields.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pl-7">
                        <FormField
                          control={form.control}
                          name={`fields.${index}.showIfFieldId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Show only if</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-8 w-48">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={NO_CONDITION}>No condition</SelectItem>
                                  {earlierFields.map((f, i) => (
                                    <SelectItem key={f.id} value={f.id}>
                                      {f.label || `Field ${i + 1}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        {hasCondition && (
                          <FormField
                            control={form.control}
                            name={`fields.${index}.showIfValue`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">equals</FormLabel>
                                <FormControl>
                                  <Input className="h-8 w-40" placeholder="value" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
