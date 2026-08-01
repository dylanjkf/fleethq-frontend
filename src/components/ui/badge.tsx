import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-(--surface-2) text-(--text-secondary)',
        accent: 'bg-accent-100 text-accent-700',
        // Solid fills with a contrasting foreground so compliance/maintenance
        // status badges meet WCAG AA (>=4.5:1) in light mode — the low-opacity
        // tint variants measured 1.95-3.78:1. The colour tokens are fixed (not
        // theme-scaled), so black/white text stays correct in both themes.
        // Measured: success/black 6.17:1, warning/black 9.62:1, danger/white 4.79:1.
        success: 'bg-success-500 text-black',
        warning: 'bg-warning-500 text-black',
        danger: 'bg-danger-500 text-white',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
