import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getGraphSummary } from '@/api/graph';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

/** OPERATED / HITCHED_TO → "Operated" / "Hitched to". */
function prettyType(t: string): string {
  return t
    .toLowerCase()
    .split('_')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Fleet Graph dashboard widget — a company-wide roll-up of the relationship
 * graph (GET /v1/graph/summary): how many connections are currently live, how
 * many assets and operators are wired together, and the most-connected assets.
 */
export function FleetGraphWidget() {
  const { can } = usePermissions();
  const allowed = can(PERMISSIONS.FLEET_GRAPH_VIEW);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['graph', 'summary', 'dashboard'],
    queryFn: getGraphSummary,
    enabled: allowed,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Graph</CardTitle>
        <Share2 className="h-4 w-4 text-(--text-tertiary)" />
      </CardHeader>
      <CardContent className="space-y-3">
        {!allowed ? (
          <p className="text-xs text-(--text-tertiary)">You don't have access to the fleet graph.</p>
        ) : isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : isError ? (
          <p className="text-sm text-danger-500">Unavailable</p>
        ) : !data || data.currentCount === 0 ? (
          <p className="text-xs text-(--text-tertiary)">
            No live connections yet. Relationships form as you assign operators to assets and hitch attached units.
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums text-(--text-primary)">{data.currentCount}</span>
              <span className="text-xs text-(--text-tertiary)">
                live link{data.currentCount === 1 ? '' : 's'} · {data.linkedAssets} asset{data.linkedAssets === 1 ? '' : 's'}, {data.linkedOperators} operator{data.linkedOperators === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.byType.map((t) => (
                <span key={t.relationshipType} className="rounded-full border border-(--border-subtle) bg-(--surface-1) px-2 py-0.5 text-xs text-(--text-secondary)">
                  {prettyType(t.relationshipType)} · {t.current}
                </span>
              ))}
            </div>
            {data.topAssets.length > 0 && (
              <ul className="space-y-1 border-t border-(--border-subtle) pt-2">
                {data.topAssets.map((a) => (
                  <li key={a.assetId} className="flex items-center justify-between gap-2 text-xs">
                    <Link to={`/fleet/${a.assetId}`} className="min-w-0 truncate font-medium text-(--text-primary) hover:underline">
                      {a.assetName}
                    </Link>
                    <span className="shrink-0 tabular-nums text-(--text-tertiary)">{a.connections} link{a.connections === 1 ? '' : 's'}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
