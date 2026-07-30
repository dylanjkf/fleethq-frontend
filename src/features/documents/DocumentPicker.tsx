import { useQuery } from '@tanstack/react-query';
import { FileText, X } from 'lucide-react';
import { listDocuments } from '@/api/documents';
import { Label } from '@/components/ui/label';

interface DocumentPickerProps {
  id: string;
  label: string;
  /** Why this document matters here — the two callers mean different things by it. */
  hint?: string;
  value: string | null;
  onChange: (documentId: string | null) => void;
  /** Shown when the picker already has a selection that isn't in the loaded page. */
  selectedTitle?: string | null;
}

/**
 * Pick an existing document from the library.
 *
 * One component for both callers — a Knowledge Base article's source document
 * and a form template's reference material — because in both cases the question
 * is the same ("which file in our library?") and duplicating a select plus its
 * loading and empty states twice would guarantee they drift.
 *
 * Deliberately a `<select>` of already-uploaded documents rather than a second
 * file input: the file has one home, and the point of referencing it is that it
 * isn't uploaded again. Upload happens on the Documents page.
 */
export function DocumentPicker({ id, label, hint, value, onChange, selectedTitle }: DocumentPickerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['documents', 'picker'],
    // A picker doesn't page: 200 covers any realistic library, and the office can
    // always attach from a document's own page if it somehow doesn't.
    queryFn: () => listDocuments({ pageSize: 200 }),
  });

  const documents = data?.items ?? [];
  // A selected document that isn't in the fetched page still has to render, or
  // editing an old article would silently appear to have no document attached.
  const missingSelected = value && !documents.some((d) => d.id === value);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <select
          id={id}
          className="h-9 flex-1 rounded-md border border-(--border-subtle) bg-(--surface-1) px-3 text-sm"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={isLoading}
        >
          <option value="">{isLoading ? 'Loading documents…' : 'None'}</option>
          {missingSelected && <option value={value}>{selectedTitle ?? 'Currently attached document'}</option>}
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
              {doc.category ? ` — ${doc.category}` : ''}
            </option>
          ))}
        </select>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-md p-2 text-(--text-tertiary) hover:bg-(--surface-2)"
            aria-label="Remove document"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-(--text-tertiary)">{hint}</p>}
      {!isLoading && documents.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-(--text-tertiary)">
          <FileText className="h-3 w-3" /> No documents yet — upload one on the Documents page first.
        </p>
      )}
    </div>
  );
}
