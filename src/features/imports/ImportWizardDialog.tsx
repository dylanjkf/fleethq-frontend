import { useState } from 'react';
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import type { ImportRowsInput } from '@/api/imports';
import type { ImportResult } from '@/api/types';
import { parseCsvFile, type ParsedCsv } from '@/lib/csv';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { describeApiError } from '@/lib/errors';

const NONE = '__none__';

export interface ImportField {
  key: string;
  label: string;
  required: boolean;
}

interface ImportWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: string;
  fields: ImportField[];
  importFn: (input: ImportRowsInput) => Promise<ImportResult>;
  onImported: () => void;
}

type Step = 'upload' | 'map' | 'preview' | 'done';

/**
 * Generic bulk-import wizard (01-Product/Onboarding_Import.md): upload a CSV,
 * map its columns to target fields, preview validation (dryRun, nothing
 * written), then commit. Reused for both Assets and Operators via `fields`
 * and `importFn` — the wizard itself has no entity-specific logic.
 */
export function ImportWizardDialog({
  open,
  onOpenChange,
  entityLabel,
  fields,
  importFn,
  onImported,
}: ImportWizardDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  function reset() {
    setStep('upload');
    setParsed(null);
    setMapping({});
    setResult(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const csv = await parseCsvFile(file);
      const guessed: Record<string, string> = {};
      for (const field of fields) {
        const match = csv.headers.find(
          (h) => h.trim().toLowerCase().replace(/[\s_-]/g, '') === field.key.toLowerCase(),
        );
        if (match) guessed[field.key] = match;
      }
      setParsed(csv);
      setMapping(guessed);
      setStep('map');
    } catch {
      toast({ title: 'Could not read that file', description: 'Make sure it\'s a valid CSV.', variant: 'destructive' });
    }
  }

  function buildRows(): Record<string, unknown>[] {
    if (!parsed) return [];
    return parsed.rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const field of fields) {
        const header = mapping[field.key];
        if (!header) continue;
        const value = row[header]?.trim();
        if (value) mapped[field.key] = field.key === 'assetClass' ? value.toUpperCase() : value;
      }
      return mapped;
    });
  }

  async function handlePreview() {
    setIsBusy(true);
    try {
      const res = await importFn({ rows: buildRows(), dryRun: true });
      setResult(res);
      setStep('preview');
    } catch (err) {
      toast({ title: 'Could not validate rows', description: describeApiError(err), variant: 'destructive' });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCommit() {
    setIsBusy(true);
    try {
      const res = await importFn({ rows: buildRows(), dryRun: false });
      setResult(res);
      setStep('done');
      onImported();
    } catch (err) {
      toast({ title: 'Could not import rows', description: describeApiError(err), variant: 'destructive' });
    } finally {
      setIsBusy(false);
    }
  }

  const requiredFieldsMapped = fields.filter((f) => f.required).every((f) => mapping[f.key]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {entityLabel}s from CSV</DialogTitle>
          <DialogDescription>
            {step === 'upload' && `Upload a CSV export of your ${entityLabel.toLowerCase()}s to get started.`}
            {step === 'map' && 'Map each CSV column to a field, then preview before anything is created.'}
            {step === 'preview' && 'Nothing has been created yet — review the results below.'}
            {step === 'done' && 'Import complete.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-(--radius-panel) border border-dashed border-(--border-subtle) p-10 text-center hover:bg-(--surface-1)">
            <Upload className="h-6 w-6 text-(--text-tertiary)" />
            <span className="text-sm font-medium">Click to choose a CSV file</span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
          </label>
        )}

        {step === 'map' && parsed && (
          <div className="space-y-4">
            <p className="text-sm text-(--text-tertiary)">{parsed.rows.length} rows found in your file.</p>
            <div className="space-y-3">
              {fields.map((field) => (
                <div key={field.key} className="grid grid-cols-2 items-center gap-3">
                  <span className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-danger-600"> *</span>}
                  </span>
                  <Select
                    value={mapping[field.key] ?? NONE}
                    onValueChange={(value) =>
                      setMapping((prev) => ({ ...prev, [field.key]: value === NONE ? '' : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not mapped" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not mapped</SelectItem>
                      {parsed.headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'preview' && result && (
          <ImportSummary result={result} />
        )}

        {step === 'done' && result && (
          <ImportSummary result={result} />
        )}

        <DialogFooter>
          {step === 'map' && (
            <>
              <Button variant="secondary" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handlePreview} disabled={!requiredFieldsMapped || isBusy}>
                {isBusy ? 'Validating…' : 'Preview'}
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="secondary" onClick={() => setStep('map')}>
                Back
              </Button>
              <Button onClick={handleCommit} disabled={isBusy || !result?.validCount}>
                {isBusy ? 'Importing…' : `Import ${result?.validCount ?? 0} valid row${result?.validCount === 1 ? '' : 's'}`}
              </Button>
            </>
          )}
          {step === 'done' && <Button onClick={() => handleOpenChange(false)}>Done</Button>}
          {step === 'upload' && (
            <Button variant="secondary" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportSummary({ result }: { result: ImportResult }) {
  const invalidRows = result.rows.filter((r) => !r.valid);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Badge variant="success">{result.dryRun ? result.validCount : result.createdCount} {result.dryRun ? 'valid' : 'created'}</Badge>
        {result.invalidCount > 0 && <Badge variant="danger">{result.invalidCount} skipped</Badge>}
      </div>
      {invalidRows.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded-(--radius-panel) border border-(--border-subtle)">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Problem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invalidRows.map((row) => (
                <TableRow key={row.index}>
                  <TableCell className="text-(--text-tertiary)">#{row.index + 1}</TableCell>
                  <TableCell className="flex items-start gap-1.5 text-danger-600">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{row.errors.join('; ')}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {invalidRows.length === 0 && (
        <p className="flex items-center gap-1.5 text-sm text-success-600">
          <CheckCircle2 className="h-4 w-4" /> Every row looks good.
        </p>
      )}
    </div>
  );
}
