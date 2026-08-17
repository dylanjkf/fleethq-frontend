import { useQuery } from '@tanstack/react-query';
import { getOrganisationCockpit } from '@/api/organisations';
import type { OrgCockpit, SubscriptionStatus } from '@/api/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';

/** Tabs a cockpit quick-action can hand off to (a subset of the org-detail tabs). */
export type CockpitNavTab = 'overview' | 'billing' | 'feature-flags';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const SUBSCRIPTION_TONE: Record<SubscriptionStatus, BadgeTone> = {
  NONE: 'neutral',
  TRIALING: 'accent',
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  CANCELED: 'danger',
};

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : '—';
}
function fmtDateTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

/**
 * Customer 360 (B2) + quick actions (B3). One read that assembles everything a
 * FleetHQ support operator needs to work a conversation about this company —
 * billing/grace state, usage signals, currently-open flags, and the recent
 * admin-activity feed — plus permission-gated shortcuts into the EXISTING
 * guarded controls (impersonate, billing, feature flags). Read-only itself; the
 * write actions stay on their own endpoints, each behind its own permission.
 */
export function CockpitTab({ companyId, onNavigateTab }: { companyId: string; onNavigateTab: (tab: CockpitNavTab) => void }) {
  const { hasPermission } = useAuth();
  const query = useQuery({ queryKey: ['organisation-cockpit', companyId], queryFn: () => getOrganisationCockpit(companyId) });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error instanceof ApiClientError ? query.error.message : 'Could not load the cockpit.'} />;
  }
  const c: OrgCockpit = query.data;

  const canImpersonate = hasPermission('organisations:impersonate');
  const canBilling = hasPermission('billing:manage');
  const canFlags = hasPermission('feature_flags:view');
  const anyQuickAction = canImpersonate || canBilling || canFlags;

  return (
    <div className="space-y-4">
      {/* Open flags — the at-a-glance "is anything wrong" strip. */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Status</h2>
        </CardHeader>
        <CardBody className="flex flex-wrap items-center gap-2">
          <Badge tone={SUBSCRIPTION_TONE[c.billing.subscriptionStatus]}>{c.billing.subscriptionStatus}</Badge>
          {c.suspendedAt && <Badge tone="danger">Suspended</Badge>}
          {c.archivedAt && <Badge tone="neutral">Archived</Badge>}
          {c.flags.pastDue && <Badge tone="warning">Past due</Badge>}
          {c.flags.inGrace && <Badge tone="warning">In grace period</Badge>}
          {c.flags.graceElapsed && <Badge tone="danger">Grace elapsed</Badge>}
          {c.flags.trialExpiringSoon && <Badge tone="warning">Trial expiring soon</Badge>}
          {c.billing.trialActive && !c.flags.trialExpiringSoon && <Badge tone="accent">Trialing</Badge>}
          {!c.suspendedAt &&
            !c.archivedAt &&
            !c.flags.pastDue &&
            !c.flags.graceElapsed &&
            !c.flags.trialExpiringSoon && <Badge tone="success">No open flags</Badge>}
        </CardBody>
      </Card>

      {/* Quick actions (B3): shortcuts into the existing guarded controls, each
          gated by the same permission that control requires. No new endpoint. */}
      {anyQuickAction && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Quick actions</h2>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            {canImpersonate && (
              <Button variant="secondary" size="sm" onClick={() => onNavigateTab('overview')}>
                Impersonate a user
              </Button>
            )}
            {hasPermission('customer_users:view') && (
              <Button variant="secondary" size="sm" onClick={() => onNavigateTab('overview')}>
                Reset a user's password
              </Button>
            )}
            {canBilling && (
              <Button variant="secondary" size="sm" onClick={() => onNavigateTab('billing')}>
                Billing — refund / credit / plan
              </Button>
            )}
            {canFlags && (
              <Button variant="secondary" size="sm" onClick={() => onNavigateTab('feature-flags')}>
                Feature flags
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Billing + grace. */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Billing &amp; grace</h2>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <Field label="Subscription">{c.billing.subscriptionStatus}</Field>
            <Field label="Plan price ID">{c.billing.planPriceId ?? '—'}</Field>
            <Field label="Asset quantity">{c.billing.assetQuantity ?? '—'}</Field>
            <Field label="Payment failures">{c.billing.paymentFailureCount}</Field>
            <Field label="Trial ends">{fmtDate(c.billing.trialEndsAt)}</Field>
            <Field label="Grace ends">{fmtDate(c.billing.gracePeriodEndsAt)}</Field>
            <Field label="Next payment attempt">{fmtDate(c.billing.nextPaymentAttemptAt)}</Field>
            <Field label="Contract ends">{fmtDate(c.billing.contractEndsAt)}</Field>
          </CardBody>
        </Card>

        {/* Usage signals. */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">Usage</h2>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-4">
            <Field label="Assets">{c.usage.assets}</Field>
            <Field label="Operators">{c.usage.operators}</Field>
            <Field label="Users">{c.usage.users}</Field>
            <Field label="Jobs (30d)">{c.usage.recentJobs30d}</Field>
            <Field label="Last active">{fmtDateTime(c.usage.lastActiveAt)}</Field>
          </CardBody>
        </Card>
      </div>

      {/* Feature-flag overrides for this company. */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Feature-flag overrides</h2>
        </CardHeader>
        <CardBody>
          {c.flags.featureFlagOverrides.length === 0 ? (
            <p className="text-sm text-(--text-tertiary)">No company-specific overrides.</p>
          ) : (
            <ul className="space-y-2">
              {c.flags.featureFlagOverrides.map((f) => (
                <li key={f.key} className="flex items-center justify-between text-sm">
                  <span>
                    {f.name}
                    <span className="text-(--text-tertiary)"> · {f.key}</span>
                  </span>
                  <Badge tone={f.enabled ? 'success' : 'neutral'}>{f.enabled ? 'On' : 'Off'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Recent admin activity scoped to this org (the same rows as the Audit Log). */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Recent admin activity</h2>
        </CardHeader>
        <CardBody>
          {c.recentActivity.length === 0 ? (
            <p className="text-sm text-(--text-tertiary)">No recent admin activity for this organisation.</p>
          ) : (
            <ul className="space-y-2">
              {c.recentActivity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">{a.action}</span>
                    {a.reason && <span className="text-(--text-tertiary)"> · {a.reason}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-(--text-tertiary)">{fmtDateTime(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-(--text-tertiary)">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  );
}
