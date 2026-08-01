import { useEffect, useState, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { listAssets } from '@/api/assets';
import { listOperators } from '@/api/operators';
import type { ComplianceDocument } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PickerError } from '@/components/ui/picker-error';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function toDateInputValue(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

type TargetType = 'asset' | 'operator';

const schema = z.object({
  documentType: z.enum(['REGISTRATION', 'INSURANCE', 'ROADWORTHY', 'LICENCE', 'MEDICAL_CERTIFICATE']),
  documentNumber: z.string().max(200).optional(),
  issuedAt: z.string().optional(),
  expiresAt: z.string().min(1, 'Required'),
  notes: z.string().max(2000).optional(),
});
export type ComplianceDocumentFormValues = z.infer<typeof schema> & {
  assetId?: string;
  operatorId?: string;
  filePhotoBase64?: string;
  filePhotoContentType?: string;
  filePhotoFilename?: string;
};

interface ComplianceDocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: ComplianceDocument;
  onSubmit: (values: ComplianceDocumentFormValues) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Log/edit a compliance document — either against an Asset (registration,
 * insurance, roadworthy) or an Operator (licence, medical certificate); the
 * server enforces exactly one target. The target can't change once created,
 * same as a job's asset/operator assignment has its own dedicated flow.
 */
export function ComplianceDocumentFormDialog({ open, onOpenChange, document, onSubmit, isSubmitting }: ComplianceDocumentFormDialogProps) {
  const assetsQuery = useQuery({ queryKey: ['assets', 'list', 'for-compliance'], queryFn: () => listAssets({ pageSize: 200 }), enabled: open });
  const operatorsQuery = useQuery({ queryKey: ['operators', 'list', 'for-compliance'], queryFn: () => listOperators({ pageSize: 200 }), enabled: open });

  const [targetType, setTargetType] = useState<TargetType>('asset');
  const [assetId, setAssetId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [filePhoto, setFilePhoto] = useState<{ dataUrl: string; contentType: string; filename: string } | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { documentType: 'REGISTRATION', documentNumber: '', issuedAt: '', expiresAt: '', notes: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        documentType: document?.documentType ?? 'REGISTRATION',
        documentNumber: document?.documentNumber ?? '',
        issuedAt: toDateInputValue(document?.issuedAt),
        expiresAt: toDateInputValue(document?.expiresAt),
        notes: document?.notes ?? '',
      });
      setTargetType(document?.operatorId ? 'operator' : 'asset');
      setAssetId(document?.assetId ?? '');
      setOperatorId(document?.operatorId ?? '');
      setFilePhoto(null);
    }
  }, [open, document, form]);

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFilePhoto({ dataUrl: String(reader.result), contentType: file.type || 'application/octet-stream', filename: file.name });
    reader.readAsDataURL(file);
  }

  const assets = (assetsQuery.data?.items ?? []).filter((a) => !a.archivedAt);
  const operators = (operatorsQuery.data?.items ?? []).filter((o) => !o.archivedAt);
  const canSubmit = targetType === 'asset' ? !!assetId : !!operatorId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{document ? 'Edit compliance document' : 'Log a compliance document'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              if (!canSubmit) return;
              await onSubmit({
                ...values,
                assetId: targetType === 'asset' ? assetId : undefined,
                operatorId: targetType === 'operator' ? operatorId : undefined,
                documentNumber: values.documentNumber || undefined,
                issuedAt: values.issuedAt || undefined,
                notes: values.notes || undefined,
                filePhotoBase64: filePhoto?.dataUrl,
                filePhotoContentType: filePhoto?.contentType,
                filePhotoFilename: filePhoto?.filename,
              });
              onOpenChange(false);
            })}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Applies to</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={targetType === 'asset' ? 'primary' : 'secondary'}
                  size="sm"
                  disabled={!!document}
                  onClick={() => setTargetType('asset')}
                >
                  Asset
                </Button>
                <Button
                  type="button"
                  variant={targetType === 'operator' ? 'primary' : 'secondary'}
                  size="sm"
                  disabled={!!document}
                  onClick={() => setTargetType('operator')}
                >
                  Operator
                </Button>
              </div>
            </div>

            {targetType === 'asset' ? (
              <div className="space-y-1.5">
                <Label>Asset</Label>
                <Select value={assetId} onValueChange={setAssetId} disabled={!!document}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <PickerError query={assetsQuery} noun="assets" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Operator</Label>
                <Select value={operatorId} onValueChange={setOperatorId} disabled={!!document}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator.id} value={operator.id}>
                        {operator.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <PickerError query={operatorsQuery} noun="operators" />
              </div>
            )}

            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {targetType === 'asset' ? (
                        <>
                          <SelectItem value="REGISTRATION">Registration</SelectItem>
                          <SelectItem value="INSURANCE">Insurance</SelectItem>
                          <SelectItem value="ROADWORTHY">Roadworthy</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="LICENCE">Licence</SelectItem>
                          <SelectItem value="MEDICAL_CERTIFICATE">Medical certificate</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="documentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document number (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. rego plate, policy number, licence number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issuedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issued (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Anything else worth recording" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-1.5">
              <Label>Scan/photo of the document (optional)</Label>
              {filePhoto ? (
                <div className="flex items-center justify-between rounded-md border border-(--border-subtle) px-3 py-2 text-sm">
                  <span>{filePhoto.filename}</span>
                  <button type="button" className="text-(--text-tertiary) underline" onClick={() => setFilePhoto(null)}>
                    Remove
                  </button>
                </div>
              ) : (
                <Input type="file" accept="image/*,application/pdf" onChange={onPickFile} />
              )}
              {document?.fileAttachment && !filePhoto && (
                <p className="text-xs text-(--text-tertiary)">Currently attached: {document.fileAttachment.filename}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !canSubmit}>
                {isSubmitting ? 'Saving…' : document ? 'Save changes' : 'Log document'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
