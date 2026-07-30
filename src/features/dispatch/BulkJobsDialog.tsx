import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bulkCreateJobs, type BulkJobRow, type CreateJobInput } from '@/api/dispatch';
import { listDepots } from '@/api/depots';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { describeApiError } from '@/lib/errors';

const NO_DEPOT_VALUE = '__no_depot__';

interface BulkJobsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Create a whole batch of runs at once — one run per line. Deliberately the
 * simplest thing that works: a dispatcher planning a day types (or pastes) the
 * run titles, one per line, optionally picks a shared date and pickup depot that
 * apply to all of them, and hits create. No spreadsheet, no column mapping.
 *
 * Each line becomes an ordinary job, created through the same validated path a
 * single job uses, and per-line failures are reported rather than failing the
 * whole batch — the same contract as every other bulk action in the product.
 */
export function BulkJobsDialog({ open, onOpenChange }: BulkJobsDialogProps) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [pickupDepotId, setPickupDepotId] = useState(NO_DEPOT_VALUE);
  const [rows, setRows] = useState<BulkJobRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const depotsQuery = useQuery({
    queryKey: ['depots', 'list', 'for-bulk-jobs'],
    queryFn: () => listDepots({ pageSize: 200 }),
    enabled: open,
  });
  const depots = (depotsQuery.data?.items ?? []).filter((d) => !d.archivedAt);

  const titles = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  function reset() {
    setText('');
    setScheduledAt('');
    setPickupDepotId(NO_DEPOT_VALUE);
    setRows(null);
    setError(null);
  }

  const create = useMutation({
    mutationFn: () => {
      const iso = scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
      const jobs: CreateJobInput[] = titles.map((title) => ({
        title,
        scheduledAt: iso,
        pickupDepotId: pickupDepotId === NO_DEPOT_VALUE ? undefined : pickupDepotId,
      }));
      return bulkCreateJobs(jobs);
    },
    onSuccess: (result) => {
      setRows(result.rows);
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err) => setError(describeApiError(err)),
  });

  const createdCount = rows?.filter((r) => r.created).length ?? 0;
  const failed = rows?.filter((r) => !r.created) ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add multiple runs</DialogTitle>
        </DialogHeader>

        {rows ? (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">{createdCount}</span> of {rows.length} run{rows.length === 1 ? '' : 's'}{' '}
              created.
            </p>
            {failed.length > 0 && (
              <div className="space-y-1.5 rounded-md border border-(--border-subtle) p-3">
                <p className="text-sm font-medium text-danger-500">{failed.length} could not be created:</p>
                <ul className="space-y-1 text-sm text-(--text-secondary)">
                  {failed.map((row) => (
                    <li key={row.index}>
                      <span className="font-medium">{titles[row.index] ?? `Line ${row.index + 1}`}</span> —{' '}
                      {row.errors.join(' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (titles.length > 0) create.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="bulk-jobs-text">Run titles — one per line</Label>
              <Textarea
                id="bulk-jobs-text"
                rows={8}
                placeholder={'Monday city run — north\nMonday city run — south\nAirport freight pickup'}
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-(--text-tertiary)">
                {titles.length} run{titles.length === 1 ? '' : 's'}. You&apos;ll add each one&apos;s stops afterwards.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-jobs-date">Scheduled for — applies to all (optional)</Label>
              <Input
                id="bulk-jobs-date"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Pickup depot — applies to all (optional)</Label>
              <Select value={pickupDepotId} onValueChange={setPickupDepotId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEPOT_VALUE}>— No pickup depot —</SelectItem>
                  {depots.map((depot) => (
                    <SelectItem key={depot.id} value={depot.id}>
                      {depot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-danger-500">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={titles.length === 0 || create.isPending}>
                {create.isPending ? 'Creating…' : `Create ${titles.length || ''} run${titles.length === 1 ? '' : 's'}`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
