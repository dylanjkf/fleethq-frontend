import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CountWidgetProps {
  title: string;
  icon: LucideIcon;
  value?: number;
  isLoading: boolean;
  isError: boolean;
}

/**
 * The shape every "how many X do we have" dashboard card shares — new widgets
 * of this kind are a config object, not a new component. Presented as an
 * instrument-panel KPI tile: uppercase machine-label, a tinted icon plate, and
 * a large tabular readout.
 */
export function CountWidget({ title, icon: Icon, value, isLoading, isError }: CountWidgetProps) {
  return (
    <Card className="group p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow">{title}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-accent-500/20 bg-accent-500/10 text-accent-500 transition-colors group-hover:bg-accent-500/15">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4">
        {isLoading ? (
          <Skeleton className="h-9 w-20" />
        ) : isError ? (
          <p className="text-sm text-danger-500">Unavailable</p>
        ) : (
          <p className="stat-value text-3xl text-(--text-primary)">{value?.toLocaleString() ?? '—'}</p>
        )}
      </div>
    </Card>
  );
}
