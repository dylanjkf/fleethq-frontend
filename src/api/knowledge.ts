import { apiClient } from './client';
import type { ListParams } from './types';

export type ArticleStatus = 'draft' | 'published';

/** An imported document behind an article — metadata only; bytes on demand. */
export interface ArticleSourceDocument {
  id: string;
  title: string;
  fileAttachment: { filename: string; contentType: string; byteSize: number };
}

export interface KnowledgeArticleSummary {
  id: string;
  title: string;
  category: string | null;
  summary: string | null;
  status: ArticleStatus;
  authorUserId: string | null;
  authorUser: { id: string; fullName: string } | null;
  sourceDocumentId: string | null;
  sourceDocument: ArticleSourceDocument | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}

export interface KnowledgeArticle extends KnowledgeArticleSummary {
  /** Null when the article is purely an imported document. */
  body: string | null;
}

export interface KnowledgeList {
  items: KnowledgeArticleSummary[];
  total: number;
  categories: string[];
  canAuthor: boolean;
  page: number;
  pageSize: number;
}

export interface CreateArticleInput {
  title: string;
  category?: string;
  summary?: string;
  /** Either a body or a `sourceDocumentId` is required. */
  body?: string;
  sourceDocumentId?: string;
  status?: ArticleStatus;
}

export interface UpdateArticleInput {
  title?: string;
  category?: string;
  summary?: string;
  body?: string;
  /** `null` unlinks the imported document (only legal if a body remains). */
  sourceDocumentId?: string | null;
  status?: ArticleStatus;
}

export async function listKnowledgeArticles(
  params: ListParams & { category?: string; search?: string; status?: ArticleStatus } = {},
): Promise<KnowledgeList> {
  const { data } = await apiClient.get<KnowledgeList>('/v1/knowledge-articles', { params });
  return data;
}

export async function getKnowledgeArticle(id: string): Promise<KnowledgeArticle> {
  const { data } = await apiClient.get<KnowledgeArticle>(`/v1/knowledge-articles/${id}`);
  return data;
}

export async function createKnowledgeArticle(input: CreateArticleInput): Promise<KnowledgeArticle> {
  const { data } = await apiClient.post<KnowledgeArticle>('/v1/knowledge-articles', input);
  return data;
}

export async function updateKnowledgeArticle(id: string, input: UpdateArticleInput): Promise<KnowledgeArticle> {
  const { data } = await apiClient.patch<KnowledgeArticle>(`/v1/knowledge-articles/${id}`, input);
  return data;
}

export async function archiveKnowledgeArticle(id: string): Promise<KnowledgeArticleSummary> {
  const { data } = await apiClient.post<KnowledgeArticleSummary>(`/v1/knowledge-articles/${id}/archive`);
  return data;
}

/**
 * Opens an article's imported document. Served from the article's own route, so
 * a reader with only `knowledge:view` can open it — see the API's rationale.
 */
export async function openArticleDocument(id: string): Promise<void> {
  const { data } = await apiClient.get<Blob>(`/v1/knowledge-articles/${id}/document`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
