import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * First-class error state, driven from ApiClientError.message (see
 * src/api/client.ts) — every data-fetching feature should render this rather
 * than an unhandled crash or a silent blank screen.
 */
export function ErrorState({ title = 'Something went wrong', message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-500/15">
        <AlertTriangle className="h-5 w-5 text-danger-500" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-(--text-primary)">{title}</p>
        <p className="text-sm text-(--text-tertiary)">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
