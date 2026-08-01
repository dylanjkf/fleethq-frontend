import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Enterprise data table. Operators live in these, so the defaults optimise for
 * scannability: a hairline-framed surface, sticky machine-label headers, dense
 * rows with a quiet zebra + accent hover, and tabular figures (inherited from
 * the global `table` rule) so numeric columns align.
 */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto rounded-(--radius-panel) border border-(--border-subtle) bg-(--surface-0)/85 backdrop-blur-sm elevation-1">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  // Sticky so column headers stay visible while the table body scrolls inside
  // its own overflow container. Opaque surface + backdrop-blur + a defining
  // bottom border keep rows from bleeding through as they pass underneath.
  return (
    <thead
      className={cn(
        'sticky top-0 z-10 bg-(--surface-1) backdrop-blur-sm [&_tr]:border-b [&_tr]:border-(--border-strong)',
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        'divide-y divide-(--border-subtle) [&_tr:nth-child(even)]:bg-(--surface-1)/40',
        className,
      )}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'transition-colors duration-150 hover:bg-accent-500/[0.06]',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-9 px-4 text-left align-middle text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-(--text-tertiary)',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-4 py-2.5 align-middle text-(--text-primary)', className)}
      {...props}
    />
  );
}
