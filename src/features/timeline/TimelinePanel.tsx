import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { listTimeline, type TimelineEntityType } from '@/api/timeline';
import { ApiClientError } from '@/api/client';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

interface TimelinePanelProps {
  entityType: TimelineEntityType;
  entityId?: string;
  title: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * The Entity Timeline viewer: every mutation across the platform already
 * writes a TimelineEvent (00-Company/Core_Principles.md's audit discipline)
 * — this is the first UI surface reading that history back, as a per-entity
 * drawer opened from wherever that entity is listed.
 */
export function TimelinePanel({ entityType, entityId, title, onOpenChange }: TimelinePanelProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['timeline', entityType, entityId],
    queryFn: () => listTimeline(entityType, entityId!),
    enabled: !!entityId,
  });

  return (
    <Drawer open={!!entityId} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>History — {title}</DrawerTitle>
        </DrawerHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message={error instanceof ApiClientError ? error.message : 'Could not load the timeline.'} onRetry={() => refetch()} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={History} title="No history yet" description="Events will appear here as this record changes." />
        ) : (
          <div className="flex-1 space-y-3 overflow-y-auto">
            {data.items.map((event) => (
              <div key={event.id} className="border-l-2 border-(--border-subtle) pl-3">
                <p className="text-sm">{event.summary}</p>
                <p className="text-xs text-(--text-tertiary)">
                  {new Date(event.occurredAt).toLocaleString()}
                  {event.actorUser ? ` · ${event.actorUser.fullName}` : event.actorType === 'SYSTEM' ? ' · System' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
