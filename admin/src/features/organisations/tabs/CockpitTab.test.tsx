import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as orgApi from '@/api/organisations';
import type { OrgCockpit } from '@/api/types';
import { AuthWrapper, makeAuth, makeAdmin } from '@/test/auth';
import { CockpitTab } from './CockpitTab';

/**
 * Cockpit customer 360 (B2) + quick actions (B3). These prove the tab surfaces
 * the real assembled data and that each quick action (a) only appears when the
 * operator holds the permission the target control requires, and (b) hands off
 * to the existing guarded tab rather than doing anything itself.
 */
vi.mock('@/api/organisations');

const COCKPIT: OrgCockpit = {
  id: 'co-1',
  name: 'Zephyr Freight',
  jurisdiction: 'GB',
  createdAt: new Date('2025-01-01').toISOString(),
  suspendedAt: null,
  suspensionReason: null,
  archivedAt: null,
  billing: {
    subscriptionStatus: 'PAST_DUE',
    planPriceId: 'price_123',
    trialEndsAt: null,
    trialActive: false,
    assetQuantity: 7,
    paymentFailureCount: 2,
    gracePeriodEndsAt: new Date('2030-01-01').toISOString(),
    nextPaymentAttemptAt: null,
    contractEndsAt: null,
  },
  usage: { assets: 7, operators: 3, users: 4, recentJobs30d: 12, lastActiveAt: new Date('2026-08-01').toISOString() },
  flags: {
    pastDue: true,
    inGrace: true,
    graceElapsed: false,
    trialExpiringSoon: false,
    featureFlagOverrides: [{ key: 'beta_x', name: 'Beta X', enabled: true }],
  },
  recentActivity: [
    { id: 'a1', action: 'organisations.suspended', entityType: 'organisation', adminUserId: 'admin-9', reason: 'non-payment', createdAt: new Date('2026-08-10').toISOString() },
  ],
};

function renderTab(permissions: string[], onNavigateTab = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const auth = makeAuth({ admin: makeAdmin({ permissions }) });
  render(
    <QueryClientProvider client={qc}>
      <AuthWrapper value={auth}>
        <CockpitTab companyId="co-1" onNavigateTab={onNavigateTab} />
      </AuthWrapper>
    </QueryClientProvider>,
  );
  return { onNavigateTab };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(orgApi.getOrganisationCockpit).mockResolvedValue(COCKPIT);
});

describe('CockpitTab — customer 360', () => {
  it('renders billing/grace, usage, flags and recent activity from the assembled data', async () => {
    renderTab(['organisations:view']);

    // Billing + open-flag signals.
    expect(await screen.findByText('Past due')).toBeInTheDocument();
    expect(screen.getByText('In grace period')).toBeInTheDocument();
    // Usage numbers.
    expect(screen.getByText('Jobs (30d)')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    // Feature-flag override.
    expect(screen.getByText('Beta X')).toBeInTheDocument();
    // Recent admin activity.
    expect(screen.getByText('organisations.suspended')).toBeInTheDocument();
  });

  it('hides all quick actions from an operator with only organisations:view', async () => {
    renderTab(['organisations:view']);
    await screen.findByText('Past due'); // wait for load
    expect(screen.queryByRole('button', { name: /Impersonate a user/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Feature flags/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Billing/ })).not.toBeInTheDocument();
  });

  it('shows a quick action only for its permission and hands off to the existing tab', async () => {
    const user = userEvent.setup();
    const { onNavigateTab } = renderTab(['organisations:view', 'billing:manage']);

    // Only the billing quick action is visible for a billing-only operator.
    const billingBtn = await screen.findByRole('button', { name: /Billing — refund/ });
    expect(screen.queryByRole('button', { name: /Impersonate a user/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Feature flags/ })).not.toBeInTheDocument();

    await user.click(billingBtn);
    expect(onNavigateTab).toHaveBeenCalledWith('billing');
  });

  it('routes the impersonate + feature-flag shortcuts to their tabs when permitted', async () => {
    const user = userEvent.setup();
    const { onNavigateTab } = renderTab(['organisations:view', 'organisations:impersonate', 'feature_flags:view']);

    await user.click(await screen.findByRole('button', { name: /Impersonate a user/ }));
    expect(onNavigateTab).toHaveBeenCalledWith('overview');

    await user.click(screen.getByRole('button', { name: /Feature flags/ }));
    expect(onNavigateTab).toHaveBeenCalledWith('feature-flags');
  });
});
