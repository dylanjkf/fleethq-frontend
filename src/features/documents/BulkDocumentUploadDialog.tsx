import { useState, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { batchFilesForUpload, bulkUploadDocuments, type BulkUploadFile, type BulkUploadRow } from '@/api/documents';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { describeApiError } from '@/lib/errors';

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

interface PickedFile extends BulkUploadFile {
  /** Bytes of the original file, for display — base64 is ~4/3 of this. */
  displayBytes: number;
}

interface BulkDocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Categories already in use, offered as suggestions. */
  categories: string[];
  /**
   * Creates a draft Knowledge Base article per file as well as the document.
   * Set by the Knowledge Base page; the Documents page leaves it off.
   */
  publishToKnowledgeBase?: boolean;
}

/**
 * Upload a whole folder of files in one go — the same dialog serves the
 * Documents library and the Knowledge Base, differing only in whether each file
 * also becomes a draft article. Two pages, one implementation.
 *
 * The API caps a request at 25 files inside a 15 MB body, so a large selection
 * is sent as several sequential batches (`batchFilesForUpload`) and the per-file
 * results are stitched back together. From the user's side that's simply "I
 * picked 60 PDFs and they uploaded" — the batching is not their problem.
 *
 * Failures are shown per file rather than as one error, because that's the
 * actual outcome: 58 files landed, two didn't, and the user needs to know which
 * two.
 */
export function BulkDocumentUploadDialog({
  open,
  onOpenChange,
  categories,
  publishToKnowledgeBase,
}: BulkDocumentUploadDialogProps) {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [category, setCategory] = useState('');
  const [rows, setRows] = useState<BulkUploadRow[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFiles([]);
    setCategory('');
    setRows(null);
    setProgress(null);
    setError(null);
  }

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    setError(null);
    setRows(null);
    const read = await Promise.all(
      picked.map(
        (file) =>
          new Promise<PickedFile>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                filename: file.name,
                contentType: file.type || 'application/octet-stream',
                dataBase64: String(reader.result),
                displayBytes: file.size,
              });
            reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
            reader.readAsDataURL(file);
          }),
      ),
    );
    setFiles(read);
  }

  const upload = useMutation({
    mutationFn: async () => {
      const batches = batchFilesForUpload(files);
      setProgress({ done: 0, total: files.length });
      const collected: BulkUploadRow[] = [];
      let offset = 0;
      for (const batch of batches) {
        const result = await bulkUploadDocuments({
          files: batch.map(({ displayBytes: _displayBytes, ...file }) => file),
          category: category.trim() || undefined,
          publishToKnowledgeBase,
        });
        // Re-base each batch's indexes onto the full selection, so a reported
        // row still points at the file the user actually picked.
        collected.push(...result.rows.map((row) => ({ ...row, index: row.index + offset })));
        offset += batch.length;
        setProgress({ done: offset, total: files.length });
      }
      return collected;
    },
    onSuccess: (collected) => {
      setRows(collected);
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (publishToKnowledgeBase) void queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
    },
    onError: (err) => setError(describeApiError(err)),
  });

  const createdCount = rows?.filter((r) => r.created).length ?? 0;
  const failed = rows?.filter((r) => !r.created) ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{publishToKnowledgeBase ? 'Import documents into the knowledge base' : 'Upload documents'}</DialogTitle>
        </DialogHeader>

        {rows ? (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">{createdCount}</span> of {rows.length} uploaded
              {publishToKnowledgeBase && createdCount > 0 && ' — each one is now a draft article'}.
            </p>
            {failed.length > 0 && (
              <div className="space-y-1.5 rounded-md border border-(--border-subtle) p-3">
                <p className="text-sm font-medium text-danger-500">{failed.length} could not be uploaded:</p>
                <ul className="space-y-1 text-sm text-(--text-secondary)">
                  {failed.map((row) => (
                    <li key={row.index}>
                      <span className="font-medium">{files[row.index]?.filename ?? `File ${row.index + 1}`}</span>
                      {' — '}
                      {row.errors.join(' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (files.length > 0) upload.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="bulk-files">Files</Label>
              <Input id="bulk-files" type="file" accept={ACCEPT} multiple onChange={(e) => void onPick(e)} />
              <p className="text-xs text-(--text-tertiary)">
                PDF, JPEG, PNG or WebP. Select as many as you like — they&apos;re sent in batches automatically. Titles
                come from the filenames unless you rename them afterwards.
              </p>
            </div>

            {files.length > 0 && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-(--border-subtle) p-2 text-sm">
                {files.map((file, index) => (
                  <div key={`${file.filename}-${index}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{file.filename}</span>
                    <span className="shrink-0 text-xs text-(--text-tertiary)">
                      {(file.displayBytes / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="bulk-category">Category for all of them (optional)</Label>
              <Input
                id="bulk-category"
                placeholder="e.g. Policies, SOPs"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="bulk-category-suggestions"
              />
              {categories.length > 0 && (
                <datalist id="bulk-category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              )}
            </div>

            {publishToKnowledgeBase && (
              <p className="text-xs text-(--text-tertiary)">
                Each file becomes a <span className="font-medium">draft</span> article. Review and publish the ones your
                team should see.
              </p>
            )}

            {error && <p className="text-sm text-danger-500">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={files.length === 0 || upload.isPending}>
                {upload.isPending
                  ? `Uploading ${progress?.done ?? 0} of ${progress?.total ?? files.length}…`
                  : `Upload ${files.length || ''} file${files.length === 1 ? '' : 's'}`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
