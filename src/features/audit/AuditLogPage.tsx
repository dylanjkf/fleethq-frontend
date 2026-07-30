import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { listAuditLogs } from '@/api/audit';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Panel, PanelDescription, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditOutcomeBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { describeApiError } from '@/lib/errors';

const PAGE_SIZE = 25;

/** `type="date"` gives a yyyy-mm-dd string; widen it to an inclusive local-day ISO window for the API. */
function startOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}
function endOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

/**
 * The company's security audit trail (14-Security/Audit_Logging.md) — the
 * append-only access/security record an auditor reads: authentications,
 * privilege changes, data exports/erasures, admin actions. Newest first,
 * server-paginated and RLS-scoped, with filters for narrowing to an incident
 * window (action, outcome, actor, date range). Separate from the per-entity
 * business Timeline. Gated end-to-end by `audit:view`.
 */
export function AuditLogPage() {
  const { can } = usePermissions();
  const allowed = can(PERMISSIONS.AUDIT_VIEW);

  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState<'' | 'success' | 'failure'>('');
  const [actorUserId, setActorUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Any filter change snaps back to page 1 — staying on page 5 of the old
  // result set would show nothing.
  function withPageReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  const hasFilters = !!(action || outcome || actorUserId || from || to);

  function clearFilters() {
    setAction('');
    setOutcome('');
    setActorUserId('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  const query = useQuery({
    queryKey: ['audit-logs', 'list', { page, action, outcome, actorUserId, from, to }],
    queryFn: () =>
      listAuditLogs({
        page,
        pageSize: PAGE_SIZE,
        action: action.trim() || undefined,
        outcome: outcome || undefined,
        actorUserId: actorUserId.trim() || undefined,
        from: from ? startOfDayIso(from) : undefined,
        to: to ? endOfDayIso(to) : undefined,
      }),
    enabled: allowed,
    placeholderData: keepPreviousData,
  });

  if (!allowed) {
    return (
      <Panel>
        <PanelHeader>
          <div>
            <PanelTitle>Audit Log</PanelTitle>
            <PanelDescription>The company's security audit trail.</PanelDescription>
          </div>
        </PanelHeader>
        <EmptyState
          icon={ScrollText}
          title="No access"
          description="You need the audit:view permission to see the security audit log."
        />
      </Panel>
    );
  }

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, total);

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>Audit Log</PanelTitle>
          <PanelDescription>
            Every security-relevant event — sign-ins, permission and role changes, data exports and erasures —
            newest first. Narrow to an incident window with the filters below.
          </PanelDescription>
        </div>
      </PanelHeader>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-(--text-tertiary)">
          Action
          <Input
            placeholder="e.g. auth.login_failed"
            value={action}
            onChange={(e) => withPageReset(setAction)(e.target.value)}
            className="mt-1 w-52"
          />
        </label>
        <label className="text-xs text-(--text-tertiary)">
          Outcome
          <Select
            value={outcome || 'all'}
            onValueChange={(value) => withPageReset(setOutcome)(value === 'all' ? '' : (value as 'success' | 'failure'))}
          >
            <SelectTrigger className="mt-1 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="text-xs text-(--text-tertiary)">
          Actor user ID
          <Input
            placeholder="UUID"
            value={actorUserId}
            onChange={(e) => withPageReset(setActorUserId)(e.target.value)}
            className="mt-1 w-64"
          />
        </label>
        <label className="text-xs text-(--text-tertiary)">
          From
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => withPageReset(setFrom)(e.target.value)}
            className="mt-1 block rounded-md border border-(--border-subtle) bg-(--surface-1) px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs text-(--text-tertiary)">
          To
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => withPageReset(setTo)(e.target.value)}
            className="mt-1 block rounded-md border border-(--border-subtle) bg-(--surface-1) px-2 py-1 text-sm"
          />
        </label>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={describeApiError(query.error)} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={hasFilters ? 'No events match your filters' : 'No audit events yet'}
          description={
            hasFilters
              ? 'Try widening the date range or clearing a filter.'
              : 'Security-relevant events will appear here as they happen — sign-ins, permission changes, data exports and erasures.'
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-(--text-tertiary)" data-tabular>
                  {new Date(entry.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="font-medium">{entry.action}</TableCell>
                <TableCell>
                  <AuditOutcomeBadge outcome={entry.outcome} />
                </TableCell>
                <TableCell>{entry.actorLabel ?? entry.actorUserId ?? '—'}</TableCell>
                <TableCell className="text-(--text-tertiary)">
                  {entry.targetType || entry.targetId ? (
                    <span>
                      {entry.targetType ?? '—'}
                      {entry.targetId && (
                        <span className="block text-xs text-(--text-tertiary)">{entry.targetId}</span>
                      )}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-(--text-tertiary)" data-tabular>
                  {entry.ip ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        total={total}
        page={safePage}
        totalPages={totalPages}
        canPrev={safePage > 1}
        canNext={safePage < totalPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => p + 1)}
        itemLabel="events"
        isFetching={query.isFetching}
      />
    </Panel>
  );
}
