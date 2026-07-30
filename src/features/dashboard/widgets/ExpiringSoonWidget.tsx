import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { listComplianceDocuments } from '@/api/compliance';
import type { ComplianceDocument, ComplianceDocumentType } from '@/api/types';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

const TYPE_LABEL: Record<ComplianceDocumentType, string> = {
  REGISTRATION: 'Registration',
  INSURANCE: 'Insurance',
  ROADWORTHY: 'Roadworthy',
  LICENCE: 'Licence',
  MEDICAL_CERTIFICATE: 'Medical certificate',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(expiresAt: string): number {
  return Math.floor((new Date(expiresAt).getTime() - Date.now()) / DAY_MS);
}

/** "12 days" / "today" / "5 days ago" — the human clock for an expiry. */
function whenLabel(days: number): { text: string; expired: boolean } {
  if (days < 0) return { text: `${Math.abs(days)}d ago`, expired: true };
  if (days === 0) return { text: 'today', expired: true };
  return { text: `${days}d`, expired: false };
}

function subjectName(doc: ComplianceDocument): string {
  return doc.asset?.name ?? doc.operator?.fullName ?? 'Unknown';
}

/**
 * Expiring soon — the next compliance documents to lapse. Real data from
 * GET /compliance-documents (already returned soonest-expiry first, each with a
 * derived expiryStatus); we keep only those expired or inside the 30-day
 * window and show the nearest few. Days-remaining is derived from the document's
 * own expiresAt. Needs compliance:view.
 */
export function ExpiringSoonWidget() {
  const { can } = usePermissions();
  const allowed = can(PERMISSIONS.COMPLIANCE_VIEW);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['compliance', 'expiring-soon'],
    queryFn: () => listComplianceDocuments({ pageSize: 25 }),
    enabled: allowed,
  });

  // The list is expiry-ascending, so the soonest-to-lapse are first; keep the
  // ones that actually need attention (expired or expiring within the window).
  const items = (data?.items ?? []).filter((d) => d.expiryStatus !== 'valid').slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expiring soon</CardTitle>
        {allowed ? (
          <Link to="/compliance" className="text-xs font-medium text-accent-600 hover:underline">
            View all
          </Link>
        ) : (
          <CalendarClock className="h-4 w-4 text-(--text-tertiary)" />
        )}
      </CardHeader>
      <CardContent>
        {!allowed ? (
          <p className="text-xs text-(--text-tertiary)">You don't have access to compliance.</p>
        ) : isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-sm text-danger-500">Couldn't load expiries.</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-(--text-tertiary)">Nothing expiring in the next 30 days — you're on top of renewals.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((doc) => {
              const when = whenLabel(daysUntil(doc.expiresAt));
              return (
                <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-(--text-primary)">{subjectName(doc)}</span>
                    <span className="text-(--text-tertiary)"> · {TYPE_LABEL[doc.documentType]}</span>
                  </span>
                  <span className={`shrink-0 tabular-nums text-xs ${when.expired ? 'text-danger-500' : 'text-warning-500'}`}>
                    {when.text}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
