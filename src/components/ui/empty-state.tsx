import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** First-class empty state — used any time a list/query legitimately has zero results. */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--surface-2)">
        <Icon className="h-5 w-5 text-(--text-tertiary)" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-(--text-primary)">{title}</p>
        {description && <p className="text-sm text-(--text-tertiary)">{description}</p>}
      </div>
      {action}
    </div>
  );
}
