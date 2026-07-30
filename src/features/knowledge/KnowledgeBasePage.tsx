import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, FileText, FileUp, Plus, Search } from 'lucide-react';
import {
  archiveKnowledgeArticle,
  createKnowledgeArticle,
  getKnowledgeArticle,
  listKnowledgeArticles,
  openArticleDocument,
  updateKnowledgeArticle,
  type KnowledgeArticle,
  type KnowledgeArticleSummary,
} from '@/api/knowledge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Markdown } from '@/components/ui/markdown';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { ArticleEditorDialog, type ArticleEditorValues } from '@/features/knowledge/ArticleEditorDialog';
import { BulkDocumentUploadDialog } from '@/features/documents/BulkDocumentUploadDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const QUERY_KEY = ['knowledge', 'list'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The internal knowledge base: a searchable library of authored articles and
 * SOPs (markdown). Viewers read published articles; authors (knowledge:create)
 * additionally see and manage drafts, with a Write/Preview editor. Clicking a
 * card opens the full article in a reader drawer.
 */
export function KnowledgeBasePage() {
  const { can } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeArticle | undefined>();
  const [openId, setOpenId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<KnowledgeArticleSummary | undefined>();
  const [importOpen, setImportOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, { category, search }],
    queryFn: () => listKnowledgeArticles({ pageSize: 200, category: category ?? undefined, search: search.trim() || undefined }),
  });

  const openQuery = useQuery({
    queryKey: ['knowledge', 'article', openId],
    queryFn: () => getKnowledgeArticle(openId!),
    enabled: !!openId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: createKnowledgeArticle,
    onSuccess: (a) => {
      invalidate();
      toast({ title: a.status === 'published' ? 'Article published' : 'Draft saved', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not save article', description: describeApiError(err), variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ArticleEditorValues }) => updateKnowledgeArticle(id, values),
    onSuccess: (a) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['knowledge', 'article', a.id] });
      toast({ title: a.status === 'published' ? 'Article published' : 'Draft saved', variant: 'success' });
    },
    onError: (err) => toast({ title: 'Could not save article', description: describeApiError(err), variant: 'destructive' }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveKnowledgeArticle,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Article archived', variant: 'success' });
      setArchiving(undefined);
      setOpenId(null);
    },
    onError: (err) => toast({ title: 'Could not archive article', description: describeApiError(err), variant: 'destructive' }),
  });

  async function handleSubmit(values: ArticleEditorValues) {
    if (editing) {
      // On an edit, `null` is meaningful — it detaches the document.
      await updateMutation.mutateAsync({ id: editing.id, values });
    } else {
      await createMutation.mutateAsync({ ...values, sourceDocumentId: values.sourceDocumentId ?? undefined });
    }
  }

  async function openEditor(articleId?: string) {
    if (articleId) {
      try {
        const full = await getKnowledgeArticle(articleId);
        setEditing(full);
      } catch (err) {
        toast({ title: 'Could not load article', description: describeApiError(err), variant: 'destructive' });
        return;
      }
    } else {
      setEditing(undefined);
    }
    setEditorOpen(true);
  }

  const articles = data?.items ?? [];
  const canAuthor = data?.canAuthor ?? can(PERMISSIONS.KNOWLEDGE_CREATE);
  const canArchive = can(PERMISSIONS.KNOWLEDGE_ARCHIVE);
  const [chips, setChips] = useState<string[]>([]);
  if (data?.categories && data.categories.join('|') !== chips.join('|')) {
    setChips(data.categories);
  }

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Knowledge Base</PanelTitle>
          <PanelDescription>
            Your team's shared how-to guides, standard operating procedures and policies — written once, searchable
            by everyone.
          </PanelDescription>
        </div>
        {canAuthor && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" /> Import documents
            </Button>
            <Button onClick={() => openEditor()}>
              <Plus className="h-4 w-4" /> New article
            </Button>
          </div>
        )}
      </PanelHeader>

      <div className="mb-4 flex flex-col gap-3">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-tertiary)" />
          <Input placeholder="Search articles…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCategory(null)} className={chipClass(category === null)}>
              All
            </button>
            {chips.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} className={chipClass(category === c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={describeApiError(error)} onRetry={() => refetch()} />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={search || category ? 'No matching articles' : 'No articles yet'}
          description={
            search || category
              ? 'Try a different search or category.'
              : canAuthor
                ? 'Write your first SOP or how-to guide to start your team knowledge base.'
                : 'Published articles will appear here.'
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => setOpenId(article.id)}
              className="flex flex-col rounded-lg border border-(--border-subtle) bg-(--surface-0) p-4 text-left transition-colors hover:border-accent-500/50 hover:bg-(--surface-1)"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="font-medium text-(--text-primary)">{article.title}</span>
                {article.status === 'draft' && <Badge variant="warning">Draft</Badge>}
              </div>
              {article.summary && <p className="mb-2 line-clamp-2 text-sm text-(--text-tertiary)">{article.summary}</p>}
              <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-(--text-tertiary)">
                {article.category && <Badge variant="neutral">{article.category}</Badge>}
                {article.sourceDocument && (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Document
                  </span>
                )}
                <span>Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Reader drawer */}
      <Drawer open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
        <DrawerContent className="max-w-2xl overflow-y-auto">
          {openQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : openQuery.isError ? (
            <ErrorState message={describeApiError(openQuery.error)} onRetry={() => openQuery.refetch()} />
          ) : openQuery.data ? (
            <>
              <DrawerHeader>
                <DrawerTitle className="text-xl">{openQuery.data.title}</DrawerTitle>
                <div className="flex flex-wrap items-center gap-2 text-xs text-(--text-tertiary)">
                  {openQuery.data.status === 'draft' && <Badge variant="warning">Draft</Badge>}
                  {openQuery.data.category && <Badge variant="neutral">{openQuery.data.category}</Badge>}
                  {openQuery.data.authorUser && <span>By {openQuery.data.authorUser.fullName}</span>}
                  <span>Updated {new Date(openQuery.data.updatedAt).toLocaleDateString()}</span>
                </div>
              </DrawerHeader>
              {openQuery.data.sourceDocument && (
                <button
                  type="button"
                  onClick={() => void openArticleDocument(openQuery.data!.id)}
                  className="mb-4 flex w-full items-center gap-3 rounded-lg border border-(--border-subtle) bg-(--surface-1) px-4 py-3 text-left transition-colors hover:border-accent-500/50"
                >
                  <FileText className="h-5 w-5 shrink-0 text-accent-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-(--text-primary)">
                      {openQuery.data.sourceDocument.fileAttachment.filename}
                    </span>
                    <span className="block text-xs text-(--text-tertiary)">
                      {formatBytes(openQuery.data.sourceDocument.fileAttachment.byteSize)} — opens in a new tab
                    </span>
                  </span>
                </button>
              )}
              {/* An imported document may be the whole article, so there isn't
                  always a body to render. */}
              {openQuery.data.body && (
                <div className="flex-1">
                  <Markdown content={openQuery.data.body} />
                </div>
              )}
              {(canAuthor || canArchive) && (
                <div className="mt-4 flex gap-2 border-t border-(--border-subtle) pt-4">
                  {canAuthor && (
                    <Button variant="secondary" size="sm" onClick={() => openEditor(openQuery.data!.id)}>
                      Edit
                    </Button>
                  )}
                  {canArchive && (
                    <Button variant="ghost" size="sm" onClick={() => setArchiving(openQuery.data!)}>
                      Archive
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : null}
        </DrawerContent>
      </Drawer>

      <BulkDocumentUploadDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        categories={chips}
        publishToKnowledgeBase
      />

      <ArticleEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        article={editing}
        categories={chips}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => !open && setArchiving(undefined)}
        title="Archive this article?"
        description={`"${archiving?.title ?? ''}" will no longer appear in the knowledge base. This can't be undone from here.`}
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
