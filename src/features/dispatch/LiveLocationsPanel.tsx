import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { getFleetLocations } from '@/api/locations';
import type { Job } from '@/api/types';

// Positions older than this read as "possibly stale" — the driver's tablet may
// have lost signal or been put away — so we flag them rather than implying the
// dot is live-accurate.
const STALE_MS = 5 * 60 * 1000;

function timeAgo(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} h ago`;
}

function mapPointUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * "Where is my driver right now" (05-Dispatch/Dispatch_Overview.md's top
 * unbuilt item): the last-known live positions reported by on-shift DriverOS
 * devices, auto-refreshed. Each row correlates to the operator's current job/
 * asset (from the jobs already on screen) and links out to a map — deliberately
 * a hand-off, not an embedded tile map, so it needs no external map provider or
 * key and works the moment the office has internet.
 */
export function LiveLocationsPanel({ jobs }: { jobs: Job[] }) {
  const { data, isError } = useQuery({
    queryKey: ['locations', 'fleet'],
    queryFn: getFleetLocations,
    // Live board: poll while the office watches it.
    refetchInterval: 30_000,
  });

  // Don't render the section at all until we know there's something to show —
  // an empty box on every dispatch board would just be noise.
  const items = data?.items ?? [];
  if (isError || items.length === 0) return null;

  const jobByOperator = new Map<string, Job>();
  for (const job of jobs) {
    if (job.operatorId && !jobByOperator.has(job.operatorId)) jobByOperator.set(job.operatorId, job);
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Live driver locations</h3>
        <span className="text-xs text-muted-foreground">({items.length} on the road)</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((loc) => {
          const stale = Date.now() - new Date(loc.lastLocationAt).getTime() > STALE_MS;
          const job = jobByOperator.get(loc.operatorId);
          return (
            <a
              key={loc.operatorId}
              href={mapPointUrl(loc.lat, loc.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-0.5 rounded-md border border-border bg-background p-3 transition-colors hover:border-primary/50"
            >
              <span className="text-sm font-medium">{loc.fullName}</span>
              {job && (
                <span className="truncate text-xs text-muted-foreground">
                  {job.title}
                  {job.asset ? ` · ${job.asset.name}` : ''}
                </span>
              )}
              <span className={`text-xs ${stale ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}`}>
                Last seen {timeAgo(loc.lastLocationAt)}
                {stale ? ' · may be stale' : ''}
              </span>
              <span className="mt-1 text-xs font-medium text-primary">Open in maps ↗</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
