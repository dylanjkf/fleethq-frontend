import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { listAssets } from '@/api/assets';
import { listOperators } from '@/api/operators';
import { openFormReferenceDocument, submitForm } from '@/api/forms';
import type { FormField, FormTemplate } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PickerError } from '@/components/ui/picker-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

interface FormRunnerDialogProps {
  template: FormTemplate | undefined;
  onOpenChange: (open: boolean) => void;
}

/** A field is shown unless a conditional (`showIf`) hides it — mirrors the DriverOS runner. */
function isVisible(field: FormField, answers: Record<string, unknown>): boolean {
  if (!field.showIfFieldId) return true;
  const controller = answers[field.showIfFieldId];
  if (controller === undefined) return false;
  if (Array.isArray(controller)) return controller.includes(field.showIfValue);
  return String(controller) === field.showIfValue;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

/**
 * Runs one form template in FleetHQ (the office side of Universal Forms).
 * Office staff had no way to *fill in* a template built for "FleetHQ (office)"
 * or "DriverOS + FleetHQ" — the builder created them but only DriverOS had a
 * runner. This is the missing office runner: same visibility + required-field
 * rules as the DriverOS FormRunner, submitting through the shared
 * `POST /form-submissions` endpoint (`forms:submit`).
 *
 * asset_ref/operator_ref fields become searchable pickers here (FleetHQ has the
 * full directory, unlike DriverOS where they auto-resolve from job context).
 */
export function FormRunnerDialog({ template, onOpenChange }: FormRunnerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  // Reset answers whenever a different form is opened.
  useEffect(() => {
    setAnswers({});
    setError(null);
    setReferenceError(null);
  }, [template?.id]);

  const needsAssets = useMemo(() => !!template?.fields.some((f) => f.type === 'asset_ref'), [template]);
  const needsOperators = useMemo(() => !!template?.fields.some((f) => f.type === 'operator_ref'), [template]);

  const assetsQuery = useQuery({ queryKey: ['assets', 'for-form'], queryFn: () => listAssets({ pageSize: 200 }), enabled: needsAssets });
  const operatorsQuery = useQuery({ queryKey: ['operators', 'for-form'], queryFn: () => listOperators({ pageSize: 200 }), enabled: needsOperators });

  const submitMutation = useMutation({
    mutationFn: submitForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-submissions', 'list'] });
      toast({ title: 'Form submitted', variant: 'success' });
      onOpenChange(false);
    },
    onError: (err) => setError(describeApiError(err)),
  });

  if (!template) return null;

  const visibleFields = template.fields.filter((f) => isVisible(f, answers));

  function setValue(fieldId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setError(null);
  }

  function toggleMulti(fieldId: string, option: string) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[fieldId]) ? (prev[fieldId] as string[]) : [];
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
      return { ...prev, [fieldId]: next };
    });
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    for (const field of visibleFields) {
      if (field.required && isEmpty(answers[field.id])) {
        setError(`Answer "${field.label}" before submitting.`);
        return;
      }
    }
    submitMutation.mutate({
      templateId: template!.id,
      templateVersion: template!.version,
      templateSnapshot: template!.fields,
      answers: visibleFields.filter((f) => !isEmpty(answers[f.id])).map((f) => ({ fieldId: f.id, value: answers[f.id] })),
    });
  }

  async function openReference() {
    setReferenceError(null);
    try {
      await openFormReferenceDocument(template!.id);
    } catch (err) {
      setReferenceError(describeApiError(err));
    }
  }

  return (
    <Dialog open={!!template} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          {template.description && <DialogDescription>{template.description}</DialogDescription>}
        </DialogHeader>

        {template.referenceDocument && (
          <button
            type="button"
            onClick={() => void openReference()}
            className="flex w-full items-center gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-1) px-3 py-2 text-left text-sm"
          >
            <FileText className="h-4 w-4 text-accent-600" />
            <span>
              <span className="block font-medium">{template.referenceDocument.title}</span>
              <span className="block text-xs text-(--text-tertiary)">{referenceError ?? 'Reference document — click to open'}</span>
            </span>
          </button>
        )}

        <div className="space-y-4">
          {visibleFields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label>
                {field.label}
                {field.required && <span className="text-danger-500"> *</span>}
              </Label>

              {field.type === 'text' && (
                <Textarea
                  rows={2}
                  value={(answers[field.id] as string) ?? ''}
                  onChange={(e) => setValue(field.id, e.target.value)}
                />
              )}

              {field.type === 'number' && (
                <Input
                  type="number"
                  value={(answers[field.id] as number | undefined) ?? ''}
                  onChange={(e) => setValue(field.id, e.target.value === '' ? undefined : Number(e.target.value))}
                />
              )}

              {field.type === 'date' && (
                <Input type="date" value={(answers[field.id] as string) ?? ''} onChange={(e) => setValue(field.id, e.target.value)} />
              )}

              {field.type === 'single_select' && (
                <Select value={(answers[field.id] as string) ?? ''} onValueChange={(v) => setValue(field.id, v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.type === 'multi_select' && (
                <div className="space-y-1.5">
                  {(field.options ?? []).map((option) => {
                    const selected = Array.isArray(answers[field.id]) && (answers[field.id] as string[]).includes(option);
                    return (
                      <label key={option} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={selected} onCheckedChange={() => toggleMulti(field.id, option)} />
                        {option}
                      </label>
                    );
                  })}
                </div>
              )}

              {field.type === 'asset_ref' && (
                <Select value={(answers[field.id] as string) ?? ''} onValueChange={(v) => setValue(field.id, v)} disabled={assetsQuery.isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={assetsQuery.isLoading ? 'Loading assets…' : 'Select an asset…'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(assetsQuery.data?.items ?? []).map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {field.type === 'asset_ref' && <PickerError query={assetsQuery} noun="assets" />}

              {field.type === 'operator_ref' && (
                <Select value={(answers[field.id] as string) ?? ''} onValueChange={(v) => setValue(field.id, v)} disabled={operatorsQuery.isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={operatorsQuery.isLoading ? 'Loading operators…' : 'Select an operator…'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(operatorsQuery.data?.items ?? []).map((operator) => (
                      <SelectItem key={operator.id} value={operator.id}>
                        {operator.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {field.type === 'operator_ref' && <PickerError query={operatorsQuery} noun="operators" />}
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-danger-500">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
            {submitMutation.isPending ? 'Submitting…' : 'Submit form'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
