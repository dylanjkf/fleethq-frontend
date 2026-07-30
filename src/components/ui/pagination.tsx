import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  rangeStart: number;
  rangeEnd: number;
  total: number;
  page: number;
  totalPages: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** The noun for the rows, e.g. "operators". */
  itemLabel?: string;
  /** True while a page change is in flight — disables the buttons briefly. */
  isFetching?: boolean;
}

/**
 * The list footer: an honest "Showing X–Y of N" count (so a truncated list can
 * never masquerade as the whole set) plus prev/next paging. Hidden entirely
 * when everything fits on one page and there's nothing to page through.
 */
export function Pagination({
  rangeStart,
  rangeEnd,
  total,
  page,
  totalPages,
  canPrev,
  canNext,
  onPrev,
  onNext,
  itemLabel = 'results',
  isFetching = false,
}: PaginationProps) {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-1 pt-1 text-sm text-(--text-tertiary)">
      <span aria-live="polite">
        Showing <span className="font-medium text-(--text-secondary)">{rangeStart}–{rangeEnd}</span> of{' '}
        <span className="font-medium text-(--text-secondary)">{total}</span> {itemLabel}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button variant="secondary" size="sm" onClick={onPrev} disabled={!canPrev || isFetching} aria-label="Previous page">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="secondary" size="sm" onClick={onNext} disabled={!canNext || isFetching} aria-label="Next page">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
