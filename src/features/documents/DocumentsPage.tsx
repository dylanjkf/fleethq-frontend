import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, FileUp, Plus, Search } from 'lucide-react';
import {
  archiveDocument,
  listDocuments,
  openDocument,
  updateDocument,
  uploadDocument,
  type CompanyDocument,
} from '@/api/documents';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentFormDialog, type DocumentFormValues } from '@/features/documents/DocumentFormDialog';
import { BulkDocumentUploadDialog } from '@/features/documents/BulkDocumentUploadDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const QUERY_KEY = ['documents', 'list'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKindLabel(contentType: string): string {
  if (contentType === 'application/pdf') return 'PDF';
  if (contentType.startsWith('image/')) return contentType.slice(6).toUpperCase();
  return 'File';
}

/**
 * The company document library: a flat, categorised file store for the office
 * paperwork that isn't asset- or operator-scoped (policies, contracts,
 * templates, licences). Distinct from Compliance (expiry semantics) and the
 * per-asset Digital Glovebox. Upload a file with a title/category, filter by
 * category or search, open the bytes, edit metadata, or archive.
 */
export function DocumentsPage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyDocument | undefined>();
  const [archiving, setArchiving] = useState<CompanyDocument | undefined>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, { category, search }],
    queryFn: () => listDocuments({ pageSize: 200, category: category ?? undefined, search: search.trim() || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const uploadMutation = useMutation({
    mutationFn: (values: DocumentFormValues) =>
      uploadDocument({
        title: values.title,
        category: values.category,
        description: values.description,
        filename: values.filename!,
        contentType: values.contentType!,
        dataBase64: values.dataBase64!,
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Document uploaded', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not upload document', description: describeApiError(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: DocumentFormValues }) =>
      updateDocument(id, { title: values.title, category: values.category ?? '', description: values.description ?? '' }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Document updated', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not update document', description: describeApiError(err), variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveDocument,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Document archived', variant: 'success' });
      setArchiving(undefined);
    },
    onError: (err) => toast({ title: 'Could not archive document', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleSubmit(values: DocumentFormValues) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, values });
    } else {
      await uploadMutation.mutateAsync(values);
    }
  }

  async function handleOpen(doc: CompanyDocument) {
    try {
      await openDocument(doc.id);
    } catch (err) {
      toast({ title: 'Could not open document', description: describeApiError(err), variant: 'destructive' });
    }
  }

  const documents = data?.items ?? [];
  // The server computes categories over the whole unarchived set (a groupBy
  // independent of the active category/search filter), so the chip row stays
  // stable no matter what's filtered — the chip you're standing on never
  // vanishes. Keep the last non-empty set so an in-flight refetch doesn't
  // flash the chips away.
  const [chips, setChips] = useState<string[]>([]);
  if (data?.categories && data.categories.join('|') !== chips.join('|')) {
    setChips(data.categories);
  }
  const knownCategories = chips;

  const canCreate = can(PERMISSIONS.DOCUMENTS_CREATE);
  const canArchive = can(PERMISSIONS.DOCUMENTS_ARCHIVE);

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Documents</PanelTitle>
          <PanelDescription>
            Your company's shared file library — policies, contracts, templates and licences, organised by category
            and searchable in one place.
          </PanelDescription>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>
              <FileUp className="h-4 w-4" /> Bulk upload
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Upload document
            </Button>
          </div>
        )}
      </PanelHeader>

      <div className="mb-4 flex flex-col gap-3">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-tertiary)" />
          <Input
            aria-label="Search documents"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {knownCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={chipClass(category === null)}
            >
              All
            </button>
            {knownCategories.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} className={chipClass(category === c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search || category ? 'No matching documents' : 'No documents yet'}
          description={
            search || category
              ? 'Try a different search or category filter.'
              : canCreate
                ? 'Upload your first policy, contract, or template to build your shared library.'
                : 'Documents your company uploads will appear here.'
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Added</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="font-medium text-(--text-primary)">{doc.title}</div>
                  {doc.description && (
                    <div className="max-w-md truncate text-xs text-(--text-tertiary)">{doc.description}</div>
                  )}
                </TableCell>
                <TableCell>
                  {doc.category ? <Badge variant="neutral">{doc.category}</Badge> : <span className="text-(--text-tertiary)">—</span>}
                </TableCell>
                <TableCell className="text-(--text-tertiary)">
                  {fileKindLabel(doc.fileAttachment.contentType)} · {formatBytes(doc.fileAttachment.byteSize)}
                </TableCell>
                <TableCell className="text-(--text-tertiary)">{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpen(doc)}>
                      Open
                    </Button>
                    {canCreate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(doc);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {canArchive && (
                      <Button variant="ghost" size="sm" onClick={() => setArchiving(doc)}>
                        Archive
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <BulkDocumentUploadDialog open={bulkOpen} onOpenChange={setBulkOpen} categories={data?.categories ?? []} />

      <DocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        document={editing}
        categories={knownCategories}
        onSubmit={handleSubmit}
        isSubmitting={uploadMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this document?"
        description={`"${archiving?.title ?? ''}" will no longer appear in the library. This can't be undone from here.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={() => archiving && archiveMutation.mutate(archiving.id)}
        isConfirming={archiveMutation.isPending}
      />
    </Panel>
  );
}

function chipClass(active: boolean): string {
  return [
    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
    active
      ? 'border-accent-500 bg-accent-500/10 text-accent-600'
      : 'border-(--border-subtle) text-(--text-secondary) hover:bg-(--surface-2)',
  ].join(' ');
}
