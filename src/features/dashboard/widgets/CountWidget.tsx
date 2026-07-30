import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CountWidgetProps {
  title: string;
  icon: LucideIcon;
  value?: number;
  isLoading: boolean;
  isError: boolean;
}

/**
 * The shape every "how many X do we have" dashboard card shares — new
 * widgets of this kind (e.g. AttachedUnits once it has an API) are a config
 * object, not a new component.
 */
export function CountWidget({ title, icon: Icon, value, isLoading, isError }: CountWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Icon className="h-4 w-4 text-(--text-tertiary)" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : isError ? (
          <p className="text-sm text-danger-500">Unavailable</p>
        ) : (
          <p className="text-2xl font-semibold text-(--text-primary)">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
