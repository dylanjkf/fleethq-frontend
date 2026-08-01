import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
    'transition-all duration-200 [transition-timing-function:var(--ease-out-soft)] ' +
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-1) ' +
    '[&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-accent-600 text-white shadow-sm hover:bg-accent-500 hover:shadow-[var(--glow-accent)]',
        secondary:
          'bg-(--surface-2) text-(--text-primary) border border-(--border-subtle) hover:border-accent-500/40 hover:bg-(--surface-1)',
        outline:
          'border border-(--border-strong) text-(--text-primary) hover:border-accent-500/50 hover:bg-accent-500/[0.06]',
        ghost: 'text-(--text-primary) hover:bg-(--surface-2)',
        destructive: 'bg-danger-500 text-white shadow-sm hover:bg-danger-600',
        link: 'text-accent-600 underline-offset-4 hover:underline dark:text-accent-300',
      },
      size: {
        xs: 'h-7 gap-1.5 px-2.5 text-xs [&_svg]:size-3.5',
        sm: 'h-8 px-3 text-xs [&_svg]:size-4',
        md: 'h-9 px-4 [&_svg]:size-4',
        lg: 'h-10 px-6 [&_svg]:size-[1.125rem]',
        icon: 'h-9 w-9 [&_svg]:size-4',
        'icon-sm': 'h-8 w-8 [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { buttonVariants };
