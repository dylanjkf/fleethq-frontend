import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/**
 * Status chip. Squared (not pill) for an industrial, instrument-label read.
 * The operational-status variants keep the WCAG-AA solid fills (tint variants
 * measured 1.95-3.78:1 in light mode; these solids measure >=4.5:1). Pass `dot`
 * to prepend a status dot — it uses `currentColor`, so it inherits the AA-safe
 * foreground of whichever variant it's on.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium leading-5',
  {
    variants: {
      variant: {
        neutral: 'border-(--border-subtle) bg-(--surface-2) text-(--text-secondary)',
        accent: 'border-accent-500/25 bg-accent-500/12 text-accent-700 dark:text-accent-200',
        // Solid fills with a contrasting foreground so compliance/maintenance
        // status badges meet WCAG AA (>=4.5:1) in light mode. The colour tokens
        // are fixed (not theme-scaled), so black/white text stays correct in
        // both themes. Measured: success/black 6.17:1, warning/black 9.62:1,
        // danger/white 4.79:1.
        success: 'border-transparent bg-success-500 text-black',
        warning: 'border-transparent bg-warning-500 text-black',
        danger: 'border-transparent bg-danger-500 text-white',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Prepend a small status dot (default operational-status treatment). */
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />}
      {children}
    </span>
  );
}
