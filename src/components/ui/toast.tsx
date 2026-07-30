import { X } from 'lucide-react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

export const ToastProvider = ToastPrimitive.Provider;

export function ToastViewport({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        'fixed bottom-0 right-0 z-100 flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm',
        className,
      )}
      {...props}
    />
  );
}

const toastVariants = cva(
  'pointer-events-auto relative flex w-full items-start gap-3 rounded-md border p-4 shadow-lg ' +
    'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out',
  {
    variants: {
      variant: {
        default: 'border-(--border-subtle) bg-(--surface-0)',
        success: 'border-success-500/30 bg-(--surface-0)',
        destructive: 'border-danger-500/30 bg-(--surface-0)',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Toast({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Root> & VariantProps<typeof toastVariants>) {
  return <ToastPrimitive.Root className={cn(toastVariants({ variant }), className)} {...props} />;
}

export function ToastTitle({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title className={cn('text-sm font-medium text-(--text-primary)', className)} {...props} />;
}

export function ToastDescription({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description className={cn('text-sm text-(--text-secondary)', className)} {...props} />
  );
}

export function ToastClose({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      className={cn('absolute right-2 top-2 text-(--text-tertiary) hover:text-(--text-primary)', className)}
      {...props}
    >
      <X className="h-4 w-4" />
    </ToastPrimitive.Close>
  );
}
