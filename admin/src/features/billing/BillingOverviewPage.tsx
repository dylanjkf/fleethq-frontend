import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { getOverview, getTrialsExpiring } from '@/api/analytics';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState, EmptyState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-(--text-tertiary)">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-(--text-tertiary)">{sub}</p>}
      </CardBody>
    </Card>
  );
}

/** Platform-wide billing overview — MRR/ARR/by-tier/churn from live Stripe prices + subscription counts. */
export function BillingOverviewPage() {
  const overviewQuery = useQuery({ queryKey: ['analytics', 'overview'], queryFn: getOverview });
  const trialsQuery = useQuery({ queryKey: ['analytics', 'trials-expiring', 30], queryFn: () => getTrialsExpiring(30) });

  if (overviewQuery.isLoading) return <PageSpinner />;
  if (overviewQuery.isError) {
    return <ErrorState message={overviewQuery.error instanceof ApiClientError ? overviewQuery.error.message : 'Could not load billing.'} />;
  }
  const { revenue, subscriptions, churn } = overviewQuery.data!;
  const cur = revenue.currency?.toUpperCase() ?? '';
  const money = (n: number | null) => (n == null ? '—' : `${cur} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Billing</h1>

      {!revenue.billingConfigured && (
        <Card>
          <CardBody>
            <p className="text-sm text-(--text-tertiary)">Billing is not configured on this deployment — revenue figures are unavailable.</p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="MRR" value={money(revenue.mrr)} />
        <StatCard label="ARR" value={money(revenue.arr)} />
        <StatCard label="Churn (30d)" value={String(churn.canceledLast30Days)} sub="cancellations" />
        <StatCard label="Cancelled" value={String(subscriptions.CANCELED ?? 0)} sub="total" />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Revenue by plan</h2>
        </CardHeader>
        {revenue.byTier.length === 0 ? (
          <EmptyState title="No plan data" description="No paid tiers are configured." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Monthly price</th>
                <th className="px-5 py-3 font-medium">Subscribers</th>
                <th className="px-5 py-3 font-medium">MRR contribution</th>
              </tr>
            </thead>
            <tbody>
              {revenue.byTier.map((t) => {
                const monthly = t.monthlyUnitAmountCents == null ? null : t.monthlyUnitAmountCents / 100;
                const contribution = monthly == null ? null : monthly * t.subscriberCount;
                return (
                  <tr key={t.priceId} className="border-b border-(--border-subtle) last:border-0">
                    <td className="px-5 py-3 font-medium">{t.name}</td>
                    <td className="px-5 py-3 text-(--text-secondary)">{money(monthly)}</td>
                    <td className="px-5 py-3 text-(--text-secondary)">{t.subscriberCount}</td>
                    <td className="px-5 py-3 text-(--text-secondary)">{money(contribution)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Subscription status</h2>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          {Object.entries(subscriptions).map(([status, count]) => (
            <Badge key={status} tone="neutral">
              {status}: {count}
            </Badge>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Trials ending within 30 days</h2>
        </CardHeader>
        <CardBody className="!px-0 !py-0">
          {trialsQuery.isError ? (
            <div className="px-5 py-4">
              <ErrorState message="Could not load expiring trials." />
            </div>
          ) : trialsQuery.data?.length ? (
            <ul className="divide-y divide-(--border-subtle)">
              {trialsQuery.data.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <Link to={`/organisations/${t.id}`} className="font-medium hover:text-accent-400">
                    {t.name}
                  </Link>
                  <span className="text-(--text-tertiary)">{new Date(t.trialEndsAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-(--text-tertiary)">No trials ending soon.</p>
          )}
        </CardBody>
      </Card>

      <p className="text-xs text-(--text-tertiary)">
        Per-company invoices, refunds, coupons and payment history are on each organisation's Billing tab. Platform-wide invoice/payment lists
        (Stripe pagination) are a planned follow-up.
      </p>
    </div>
  );
}
