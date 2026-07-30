import { useEffect, useState } from 'react';
import type { ArticleStatus, KnowledgeArticle } from '@/api/knowledge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Markdown } from '@/components/ui/markdown';
import { Textarea } from '@/components/ui/textarea';
import { DocumentPicker } from '@/features/documents/DocumentPicker';

export interface ArticleEditorValues {
  title: string;
  category?: string;
  summary?: string;
  body: string;
  /** `null` detaches the imported document; only legal if a body remains. */
  sourceDocumentId: string | null;
  status: ArticleStatus;
}

interface ArticleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: KnowledgeArticle;
  categories: string[];
  onSubmit: (values: ArticleEditorValues) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Write or edit a knowledge-base article. Body is markdown with a live
 * Write/Preview toggle so authors can see how their SOP will render. "Save as
 * draft" keeps it private to authors; "Publish" makes it visible to every
 * viewer.
 *
 * An article can also *be* an existing document — the common case being a policy
 * that already exists as a PDF. Attaching one makes the body optional: a written
 * introduction in front of the official document is welcome but not required.
 */
export function ArticleEditorDialog({ open, onOpenChange, article, categories, onSubmit, isSubmitting }: ArticleEditorDialogProps) {
  const isEdit = !!article;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [sourceDocumentId, setSourceDocumentId] = useState<string | null>(null);
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  useEffect(() => {
    if (open) {
      setTitle(article?.title ?? '');
      setCategory(article?.category ?? '');
      setSummary(article?.summary ?? '');
      setBody(article?.body ?? '');
      setSourceDocumentId(article?.sourceDocumentId ?? null);
      setTab('write');
    }
  }, [open, article]);

  // A body OR a document — the same rule the API enforces, checked here so the
  // buttons disable instead of the save failing.
  const canSubmit = title.trim().length > 0 && (body.trim().length > 0 || !!sourceDocumentId);

  async function submit(status: ArticleStatus) {
    if (!canSubmit) return;
    await onSubmit({
      title: title.trim(),
      category: category.trim() || undefined,
      summary: summary.trim() || undefined,
      body,
      sourceDocumentId,
      status,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit article' : 'New article'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="kb-title">Title</Label>
            <Input id="kb-title" placeholder="e.g. Cold Chain Standard Operating Procedure" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="kb-category">Category (optional)</Label>
              <Input
                id="kb-category"
                placeholder="e.g. Operations, Safety"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="kb-category-suggestions"
              />
              {categories.length > 0 && (
                <datalist id="kb-category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kb-summary">Summary (optional)</Label>
              <Input id="kb-summary" placeholder="One line shown in the list" value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
          </div>

          <DocumentPicker
            id="kb-source-document"
            label="Imported document (optional)"
            hint="Present an existing PDF from the document library as this article. Readers can open it even without access to the library itself."
            value={sourceDocumentId}
            onChange={setSourceDocumentId}
            selectedTitle={article?.sourceDocument?.title}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{sourceDocumentId ? 'Body (optional)' : 'Body'}</Label>
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  className={tabClass(tab === 'write')}
                  onClick={() => setTab('write')}
                >
                  Write
                </button>
                <button
                  type="button"
                  className={tabClass(tab === 'preview')}
                  onClick={() => setTab('preview')}
                >
                  Preview
                </button>
              </div>
            </div>
            {tab === 'write' ? (
              <Textarea
                placeholder={'Markdown supported.\n\n# Heading\n- Bullet point\n**bold**, *italic*, `code`'}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
            ) : (
              <div className="min-h-[16rem] rounded-md border border-(--border-subtle) p-3">
                {body.trim() ? <Markdown content={body} /> : <p className="text-sm text-(--text-tertiary)">Nothing to preview yet.</p>}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" disabled={isSubmitting || !canSubmit} onClick={() => submit('draft')}>
            Save as draft
          </Button>
          <Button type="button" disabled={isSubmitting || !canSubmit} onClick={() => submit('published')}>
            {isSubmitting ? 'Saving…' : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function tabClass(active: boolean): string {
  return [
    'rounded px-2 py-1 font-medium transition-colors',
    active ? 'bg-accent-500/10 text-accent-600' : 'text-(--text-tertiary) hover:text-(--text-primary)',
  ].join(' ');
}
