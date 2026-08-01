import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-md border border-(--border-subtle) bg-(--surface-inset) px-3 text-sm',
        'text-(--text-primary) placeholder:text-(--text-tertiary)',
        'shadow-[inset_0_1px_1px_rgb(0_0_0/0.03)] transition-colors duration-200 hover:border-accent-500/30',
        'focus-visible:border-accent-500 focus-visible:bg-(--surface-0) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/35',
        'aria-invalid:border-danger-500 aria-invalid:focus-visible:ring-danger-500/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
