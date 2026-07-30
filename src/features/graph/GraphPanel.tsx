import { useQuery } from '@tanstack/react-query';
import { Waypoints } from 'lucide-react';
import { listRelationships } from '@/api/graph';
import type { TimelineEntityType } from '@/api/timeline';
import { ApiClientError } from '@/api/client';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

interface GraphPanelProps {
  entityType: TimelineEntityType;
  entityId?: string;
  title: string;
  onOpenChange: (open: boolean) => void;
}

const RELATIONSHIP_VERB: Record<string, string> = {
  OPERATED: 'Operated',
  PAIRED_WITH: 'Paired with',
};

function formatRange(validFrom: string, validTo: string | null): string {
  const from = new Date(validFrom).toLocaleDateString();
  if (!validTo) return `Since ${from}`;
  return `${from} – ${new Date(validTo).toLocaleDateString()}`;
}

/**
 * 01-Product/Fleet_Graph.md's read side: the first UI surfacing
 * `graph_relationships` back, mirroring the Entity Timeline drawer's shape
 * (same Drawer component, same per-entity "open from wherever it's listed"
 * pattern) since both are "read an append-only history for this record."
 */
export function GraphPanel({ entityType, entityId, title, onOpenChange }: GraphPanelProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['graph', 'relationships', entityType, entityId],
    queryFn: () => listRelationships(entityType, entityId!),
    enabled: !!entityId,
  });

  const current = data?.items.filter((i) => i.isCurrent) ?? [];
  const past = data?.items.filter((i) => !i.isCurrent) ?? [];

  return (
    <Drawer open={!!entityId} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Relationships — {title}</DrawerTitle>
        </DrawerHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message={error instanceof ApiClientError ? error.message : 'Could not load relationships.'} onRetry={() => refetch()} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={Waypoints} title="No relationships yet" description="Assignments and pairings involving this record will appear here." />
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto">
            {current.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-tertiary)">Current</p>
                <div className="space-y-2">
                  {current.map((r) => (
                    <div key={r.id} className="rounded-lg border border-(--border-subtle) bg-(--surface-1) p-3">
                      <p className="text-sm font-medium">
                        {RELATIONSHIP_VERB[r.relationshipType] ?? r.relationshipType} {r.otherName}
                      </p>
                      <p className="text-xs text-(--text-tertiary)">{formatRange(r.validFrom, r.validTo)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-tertiary)">Past</p>
                <div className="space-y-2">
                  {past.map((r) => (
                    <div key={r.id} className="border-l-2 border-(--border-subtle) pl-3">
                      <p className="text-sm text-(--text-secondary)">
                        {RELATIONSHIP_VERB[r.relationshipType] ?? r.relationshipType} {r.otherName}
                      </p>
                      <p className="text-xs text-(--text-tertiary)">{formatRange(r.validFrom, r.validTo)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
