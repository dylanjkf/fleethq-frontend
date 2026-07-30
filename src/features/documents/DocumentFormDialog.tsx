import { useEffect, useState, type ChangeEvent } from 'react';
import type { CompanyDocument } from '@/api/documents';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

export interface DocumentFormValues {
  title: string;
  category?: string;
  description?: string;
  filename?: string;
  contentType?: string;
  dataBase64?: string;
}

interface DocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits metadata only — the file can't be swapped. */
  document?: CompanyDocument;
  /** Categories already in use, offered as quick-pick suggestions. */
  categories: string[];
  onSubmit: (values: DocumentFormValues) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Upload a new company document (title + category + file) or edit an existing
 * one's metadata. Files reuse the shared attachment store, sent as a base64
 * data URL the API decodes — the same convention Compliance/Glovebox use.
 */
export function DocumentFormDialog({
  open,
  onOpenChange,
  document,
  categories,
  onSubmit,
  isSubmitting,
}: DocumentFormDialogProps) {
  const isEdit = !!document;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<{ dataUrl: string; contentType: string; filename: string } | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(document?.title ?? '');
      setCategory(document?.category ?? '');
      setDescription(document?.description ?? '');
      setFile(null);
    }
  }, [open, document]);

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    const reader = new FileReader();
    reader.onload = () =>
      setFile({ dataUrl: String(reader.result), contentType: picked.type || 'application/octet-stream', filename: picked.name });
    reader.readAsDataURL(picked);
  }

  const canSubmit = title.trim().length > 0 && (isEdit || !!file);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit document' : 'Upload a document'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!canSubmit) return;
            await onSubmit({
              title: title.trim(),
              category: category.trim() || undefined,
              description: description.trim() || undefined,
              filename: file?.filename,
              contentType: file?.contentType,
              dataBase64: file?.dataUrl,
            });
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              placeholder="e.g. Driver Handbook 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-category">Category (optional)</Label>
            <Input
              id="doc-category"
              placeholder="e.g. Policies, Contracts, Templates"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="doc-category-suggestions"
            />
            {categories.length > 0 && (
              <datalist id="doc-category-suggestions">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-description">Description (optional)</Label>
            <Textarea
              id="doc-description"
              placeholder="What is this document, and when should it be used?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label>File</Label>
              {file ? (
                <div className="flex items-center justify-between rounded-md border border-(--border-subtle) px-3 py-2 text-sm">
                  <span className="truncate">{file.filename}</span>
                  <button type="button" className="text-(--text-tertiary) underline" onClick={() => setFile(null)}>
                    Remove
                  </button>
                </div>
              ) : (
                <Input type="file" accept={ACCEPT} onChange={onPickFile} />
              )}
              <p className="text-xs text-(--text-tertiary)">PDF, JPEG, PNG or WebP.</p>
            </div>
          )}

          {isEdit && document && (
            <p className="text-xs text-(--text-tertiary)">
              Attached file: {document.fileAttachment.filename}. Upload a new document to replace it.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
