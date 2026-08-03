import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { getOverview } from '@/api/analytics';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorState, EmptyState } from '@/components/ui/EmptyState';
import { ApiClientError } from '@/api/client';

/**
 * Platform configuration reference. Plans & pricing are read from live Stripe
 * data; the rest of the spec's settings (email templates, maintenance mode,
 * branding, API keys) have no data source in this deployment yet and are listed
 * honestly as not-yet-instrumented rather than shown as fake toggles.
 */
export function PlatformSettingsPage() {
  const overviewQuery = useQuery({ queryKey: ['analytics', 'overview'], queryFn: getOverview });

  if (overviewQuery.isLoading) return <PageSpinner />;
  if (overviewQuery.isError) {
    return <ErrorState message={overviewQuery.error instanceof ApiClientError ? overviewQuery.error.message : 'Could not load settings.'} />;
  }
  const { revenue } = overviewQuery.data!;
  const cur = revenue.currency?.toUpperCase() ?? '';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Platform settings</h1>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Plans &amp; pricing</h2>
        </CardHeader>
        {revenue.byTier.length === 0 ? (
          <EmptyState title="No plans configured" description="No paid Stripe tiers are configured on this deployment." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border-subtle) text-left text-xs uppercase tracking-wide text-(--text-tertiary)">
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Tier key</th>
                <th className="px-5 py-3 font-medium">Monthly price</th>
                <th className="px-5 py-3 font-medium">Stripe price id</th>
              </tr>
            </thead>
            <tbody>
              {revenue.byTier.map((t) => (
                <tr key={t.priceId} className="border-b border-(--border-subtle) last:border-0">
                  <td className="px-5 py-3 font-medium">{t.name}</td>
                  <td className="px-5 py-3 text-(--text-secondary)">{t.tier}</td>
                  <td className="px-5 py-3 text-(--text-secondary)">
                    {t.monthlyUnitAmountCents == null ? '—' : `${cur} ${(t.monthlyUnitAmountCents / 100).toFixed(2)}`}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-(--text-tertiary)">{t.priceId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Operational tools</h2>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <Link to="/feature-flags" className="block hover:text-accent-400">
            Feature flags →
          </Link>
          <Link to="/system" className="block hover:text-accent-400">
            System health &amp; deployment info →
          </Link>
          <Link to="/audit-log" className="block hover:text-accent-400">
            Audit log →
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Not yet instrumented</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-(--text-tertiary)">
            Email-template editing, maintenance mode, branding and API-key management have no data source in this deployment yet, so they are
            not shown here rather than presented as non-functional controls. API request-rate, background-job and storage dashboards likewise
            require instrumentation that this platform doesn't currently emit.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
