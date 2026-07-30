import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ListParams, Paginated } from '@/api/types';

const DEFAULT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

interface UsePaginatedListArgs<T> {
  /** Stable base key; the page/search are appended internally. */
  queryKey: readonly unknown[];
  queryFn: (params: ListParams) => Promise<Paginated<T>>;
  pageSize?: number;
}

export interface PaginatedListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** 1-based index of the first row shown (0 when empty). */
  rangeStart: number;
  /** 1-based index of the last row shown. */
  rangeEnd: number;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  /** Raw (un-debounced) search box value, for a controlled input. */
  searchInput: string;
  setSearchInput: (value: string) => void;
  /** The debounced term actually sent to the server. */
  search: string;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  canPrev: boolean;
  canNext: boolean;
}

/**
 * The one place list pagination + server-side search live. Every registry list
 * page uses this instead of fetching a fixed 100 rows and filtering in memory
 * — which silently truncates the list and makes search miss anything past the
 * first page. Debounces the search box, resets to page 1 when the term changes,
 * and keeps the previous page visible while the next loads (no flash).
 */
export function usePaginatedList<T>({ queryKey, queryFn, pageSize = DEFAULT_PAGE_SIZE }: UsePaginatedListArgs<T>): PaginatedListResult<T> {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Debounce the search box, and snap back to page 1 whenever the term changes
  // (staying on page 5 of the old result set would show nothing).
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch((prev) => {
        const next = searchInput.trim();
        if (next !== prev) setPage(1);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const query = useQuery({
    queryKey: [...queryKey, { page, pageSize, search }],
    queryFn: () => queryFn({ page, pageSize, search: search || undefined }),
    placeholderData: keepPreviousData,
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Clamp if the current page fell out of range (e.g. rows archived away).
  const safePage = Math.min(page, totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, total);

  return {
    items: query.data?.items ?? [],
    total,
    page: safePage,
    pageSize,
    totalPages,
    rangeStart,
    rangeEnd,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
    searchInput,
    setSearchInput,
    search,
    goToPage: (p: number) => setPage(Math.max(1, p)),
    nextPage: () => setPage((p) => p + 1),
    prevPage: () => setPage((p) => Math.max(1, p - 1)),
    canPrev: safePage > 1,
    canNext: safePage < totalPages,
  };
}
